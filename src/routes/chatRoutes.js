import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getConversations,
  getMessages,
  createConversation,
  markMessagesRead,
  uploadChatMedia
} from "../contollers/chatController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, getConversations);
router.post("/media", protect, upload.single("file"), uploadChatMedia);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId/read", protect, markMessagesRead);
router.post("/conversation", protect, createConversation);

export default router;
