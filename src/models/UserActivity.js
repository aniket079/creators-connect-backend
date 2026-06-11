import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["view", "like", "save", "purchase", "message"],
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ["asset", "creator"],
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    category: {
      type: String,
      index: true
    },
    profession: {
      type: String,
      index: true
    },
    location: {
      type: String,
      index: true
    }
  },
  { timestamps: true }
);

userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export default mongoose.model("UserActivity", userActivitySchema);
