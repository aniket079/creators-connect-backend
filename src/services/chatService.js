import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

/* =========================
   CREATE OR GET CONVERSATION
========================= */

export const getOrCreateConversation = async (user1, user2) => {

  let conversation = await Conversation.findOne({
    participants: { $all: [user1, user2] }
  });


  if (!conversation) {
    conversation = await Conversation.create({
      participants: [user1, user2]
    });
  }

  console.log("conversation",conversation)

  return conversation;
};

export const getUnreadCountsForUser = async (userId, conversationIds) => {
  if (!conversationIds.length) return {};

  const unreadCounts = await Message.aggregate([
    {
      $match: {
        conversation: { $in: conversationIds },
        receiver: userId,
        status: { $ne: "read" }
      }
    },
    {
      $group: {
        _id: "$conversation",
        count: { $sum: 1 }
      }
    }
  ]);

  return unreadCounts.reduce((counts, item) => {
    counts[item._id.toString()] = item.count;
    return counts;
  }, {});
};

export const markConversationMessagesRead = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const result = await Message.updateMany(
    {
      conversation: conversationId,
      receiver: userId,
      status: { $ne: "read" }
    },
    {
      $set: { status: "read" }
    }
  );

  return {
    conversation,
    modifiedCount: result.modifiedCount
  };
};
