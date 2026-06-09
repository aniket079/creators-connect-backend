import User from "../models/User.js";

export const deductToken = async (userId, amount = 1) => {

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.tokens < amount) {
    const error = new Error("No tokens left. Please recharge your tokens to continue chatting.");
    error.code = "NO_TOKENS";
    error.statusCode = 402;
    throw error;
  }

  user.tokens -= amount;
  await user.save();

  return user.tokens;
};
