import User from "../models/User.js";

export const deductToken = async (userId, amount = 1) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid token amount");
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      tokens: { $gte: amount }
    },
    {
      $inc: { tokens: -amount }
    },
    {
      new: true,
      runValidators: true
    }
  ).select("tokens");

  if (user) {
    return user.tokens;
  }

  const existingUser = await User.findById(userId).select("tokens");

  if (!existingUser) {
    throw new Error("User not found");
  }

  const error = new Error("No tokens left. Please recharge your tokens to continue chatting.");
  error.code = "NO_TOKENS";
  error.statusCode = 402;
  throw error;
};
