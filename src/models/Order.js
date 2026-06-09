import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["tokens", "asset"],
    default: "tokens"
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan"
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset"
  },
  assetOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  pricingOptionId: String,
  pricingOption: {
    title: String,
    description: String,
    price: Number,
    licenseType: String
  },
  licenseType: String,
  amount: Number,
  currency: {
    type: String,
    default: "INR"
  },
  tokens: {
    type: Number,
    default: 0
  },
  shippingAddress: {
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  paymentStatus: {
    type: String,
    enum: ["created", "paid", "completed", "failed"],
    default: "created"
  },
  deliveryType: {
    type: String,
    enum: ["digital", "physical"],
    default: "digital"
  },
  canDownload: {
    type: Boolean,
    default: false
  },
  orderStatus: {
    type: String,
    enum: ["pending_payment", "completed", "placed", "packed", "shipped", "delivered", "cancelled"],
    default: "pending_payment"
  },
  trackingNumber: String,
  trackingUrl: String,
  status: {
    type: String,
    enum: ["created", "paid", "completed", "failed"],
    default: "created"
  }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
