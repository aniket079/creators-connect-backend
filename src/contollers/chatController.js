import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  getOrCreateConversation,
  getUnreadCountsForUser,
  markConversationMessagesRead
} from "../services/chatService.js";
import { uploadChatMediaService } from "../services/chatMediaService.js";


export const getConversations = async (req, res) => {
  try {

    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "name")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const unreadCounts = await getUnreadCountsForUser(
      req.user._id,
      conversations.map((conversation) => conversation._id)
    );

    const conversationsWithUnreadCounts = conversations.map((conversation) => ({
      ...conversation.toObject(),
      unreadCount: unreadCounts[conversation._id.toString()] || 0
    }));

    res.json(conversationsWithUnreadCounts);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const getMessages = async (req, res) => {
  try {
    // console.log("req.params.conversationId",req.params.conversationId)
    const messages = await Message.find({
      conversation: req.params.conversationId
    }).sort({ createdAt: 1 });

    // console.log("messages",messages)

    res.json(messages);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    // console.log("request recieved",receiverId)
    const conversation = await getOrCreateConversation(
      req.user._id,
      receiverId
    );

    res.status(200).json(conversation);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markMessagesRead = async (req, res) => {
  try {
    const { modifiedCount } = await markConversationMessagesRead(
      req.params.conversationId,
      req.user._id
    );

    res.json({
      conversationId: req.params.conversationId,
      modifiedCount
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const uploadChatMedia = async (req, res) => {
  try {
    const attachment = await uploadChatMediaService(req.file, req.user._id);

    res.status(201).json({
      attachment
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
