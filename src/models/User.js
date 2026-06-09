import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: "user"
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    phone: {
      type: String
    },
    bio: {
      type: String
    },
    avatarUrl: {
      type: String
    },
    profileImage: {
      type: String
    },
    coverImage: {
      type: String
    },
    location: {
      type: String
    },
    profession: {
      type: String
    },
    category: {
      type: String
    },
    title: {
      type: String
    },
    socialLinks: {
      instagram: String,
      website: String
    },
    addresses: [
      {
        fullName: {
          type: String,
          required: true
        },
        phone: {
          type: String,
          required: true
        },
        addressLine1: {
          type: String,
          required: true
        },
        addressLine2: String,
        city: {
          type: String,
          required: true
        },
        state: {
          type: String,
          required: true
        },
        postalCode: {
          type: String,
          required: true
        },
        country: {
          type: String,
          default: "India"
        },
        isDefault: {
          type: Boolean,
          default: false
        }
      }
    ],
    tokens: {
      type: Number,
      default: 5
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
