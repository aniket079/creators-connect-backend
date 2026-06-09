import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      trim: true,
      default: ""
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "audio"],
          required: true
        },
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        },
        format: String,
        bytes: Number,
        duration: Number,
        originalName: String
      }
    ],
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    }
  },
  { timestamps: true }
);

messageSchema.pre("validate", function () {
  if (!this.text && (!this.attachments || this.attachments.length === 0)) {
    throw new Error("Message must include text or an attachment");
  }
});

export default mongoose.model("Message", messageSchema);
