import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    type: {
      type: String,
      enum: ["image", "video", "audio"],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    previewUrl: {
      type: String
    },
    downloadUrl: {
      type: String
    },
    originalFileUrl: {
      type: String
    },
    originalFileKey: {
      type: String
    },
    downloadPublicId: {
      type: String
    },
    originalFilePublicId: {
      type: String
    },
    thumbnailUrl: {
      type: String
    },
    duration: {
      type: Number
    },
    fileSize: {
      type: Number
    },
    format: {
      type: String
    },
    gallery: [
      {
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        },
        type: {
          type: String,
          enum: ["image", "video", "audio"],
          default: "image"
        }
      }
    ],
    pricingOptions: [
      {
        title: {
          type: String,
          required: true
        },
        description: String,
        price: {
          type: Number,
          required: true,
          min: 1
        },
        licenseType: {
          type: String,
          enum: ["personal", "commercial", "exclusive"],
          default: "personal"
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    isPhysical: {
      type: Boolean,
      default: false
    },
    category: {
      type: String,
      enum: ["painting", "furniture", "sculpture", "digital", "other"],
      default: "digital"
    },
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
      unit: {
        type: String,
        default: "cm"
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        default: "kg"
      }
    },
    shippingAvailable: {
      type: Boolean,
      default: false
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public"
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Asset", assetSchema);
