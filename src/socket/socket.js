import { Server } from "socket.io";
import Message from "../models/Message.js";
import { deductToken } from "../services/tokenService.js";
import {
  getOrCreateConversation,
  markConversationMessagesRead
} from "../services/chatService.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { isRedisConnected, pubClient, subClient } from "../config/redis.js";

const isValidId = (value) => value !== undefined && value !== null && value !== "";
const toRoomId = (value) => value.toString();
const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizePayload = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const initializeSocket = (server) => {

  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        ...allowedOrigins
      ],
      credentials: true
    }
  });

  if (isRedisConnected()) {
    io.adapter(createAdapter(pubClient, subClient));
  } else {
    console.warn("Socket.IO Redis adapter disabled");
  }

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /* =========================
       REGISTER USER (JOIN ROOM)
    ========================= */

    socket.on("register", (userId) => {
      if (!isValidId(userId)) return;
      socket.join(toRoomId(userId));
      console.log("User joined room:", userId);
    });

    /* =========================
       TYPING EVENT
    ========================= */

    socket.on("typing", (data) => {
      const { senderId, receiverId } = normalizePayload(data);

      if (!isValidId(receiverId)) return;

      console.log("Typing invoked for:", receiverId);

      // Emit to receiver's room
      socket.to(toRoomId(receiverId)).emit("typing", senderId);
    });

    /* =========================
       SEND MESSAGE
    ========================= */

    socket.on("send_message", async (data) => {
      try {
        const payload = normalizePayload(data);

        console.log("send message socket invoke", payload);

        const { senderId, receiverId, text = "", attachments = [] } = payload;

        if (!isValidId(senderId) || !isValidId(receiverId)) return;

        const cleanText = normalizeText(text);
        const cleanAttachments = Array.isArray(attachments) ? attachments : [];

        if (!cleanText && cleanAttachments.length === 0) return;

        // 1️⃣ Deduct token
        await deductToken(senderId, 1);

        // 2️⃣ Get or create conversation
        const conversation =
          await getOrCreateConversation(senderId, receiverId);

        // 3️⃣ Save message
        const message = await Message.create({
          conversation: conversation._id,
          sender: senderId,
          receiver: receiverId,
          text: cleanText,
          attachments: cleanAttachments,
          status: "sent"
        });

        // 4️⃣ Update conversation lastMessage
        conversation.lastMessage = message._id;
        await conversation.save();

        // 5️⃣ Emit to receiver room
        io.to(toRoomId(receiverId)).emit("receive_message", message);
        // socket.to(toRoomId(receiverId)).emit("receive_message", message);

        // 6️⃣ Emit confirmation back to sender
        socket.emit("message_sent", message);

      } catch (error) {
        console.error("Socket error:", error);
        socket.emit("error_message", {
          message: error.message,
          code: error.code || "MESSAGE_SEND_FAILED",
          statusCode: error.statusCode || 400
        });
      }
    });

    /* =========================
       MARK MESSAGES READ
    ========================= */

    socket.on("mark_read", async (data) => {
      try {
        const { conversationId, userId } = normalizePayload(data);

        if (!isValidId(conversationId) || !isValidId(userId)) return;

        const { conversation, modifiedCount } =
          await markConversationMessagesRead(conversationId, userId);

        const payload = {
          conversationId,
          readBy: userId,
          modifiedCount
        };

        conversation.participants.forEach((participantId) => {
          if (!isValidId(participantId)) return;

          const participant = toRoomId(participantId);
          if (participant !== toRoomId(userId)) {
            io.to(participant).emit("messages_read", payload);
          }
        });

        socket.emit("messages_read_confirmed", payload);

      } catch (error) {
        console.error("Mark read socket error:", error);
        socket.emit("error_message", {
          message: error.message
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });
};

export default initializeSocket;
