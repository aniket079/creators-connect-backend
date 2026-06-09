import Plan from "../models/Plan.js";
import Order from "../models/Order.js";
import Asset from "../models/Asset.js";
import User from "../models/User.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";

const verifyRazorpaySignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
}) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};

export const createOrder = async (req, res) => {
  const { planId } = req.body;

  const plan = await Plan.findById(planId);
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: plan.price * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  });

  const order = await Order.create({
    type: "tokens",
    user: req.user._id,
    plan: plan._id,
    amount: plan.price,
    tokens: plan.tokens + plan.bonusTokens,
    razorpay_order_id: razorpayOrder.id
  });

  res.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID
  });
};

export const createAssetPurchaseOrder = async (req, res) => {
  const { assetId, pricingOptionId, addressId } = req.body;

  const asset = await Asset.findOne({
    _id: assetId,
    visibility: "public"
  });

  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  if (asset.owner.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot purchase your own asset" });
  }

  const pricingOption = asset.pricingOptions.id(pricingOptionId);

  if (!pricingOption || !pricingOption.isActive) {
    return res.status(404).json({ message: "Pricing option not found" });
  }

  if (asset.isPhysical && !asset.shippingAvailable) {
    return res.status(400).json({ message: "Shipping is not available for this asset" });
  }

  let shippingAddress;

  if (asset.isPhysical) {
    if (!addressId) {
      return res.status(400).json({ message: "Delivery address is required for physical assets" });
    }

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Delivery address not found" });
    }

    shippingAddress = {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country
    };
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: pricingOption.price * 100,
    currency: "INR",
    receipt: `asset_${Date.now()}`
  });

  const purchase = await Order.create({
    type: "asset",
    user: req.user._id,
    buyer: req.user._id,
    asset: asset._id,
    assetOwner: asset.owner,
    seller: asset.owner,
    pricingOptionId: pricingOption._id.toString(),
    pricingOption: {
      title: pricingOption.title,
      description: pricingOption.description,
      price: pricingOption.price,
      licenseType: pricingOption.licenseType
    },
    licenseType: pricingOption.licenseType,
    amount: pricingOption.price,
    currency: "INR",
    deliveryType: asset.isPhysical ? "physical" : "digital",
    canDownload: false,
    shippingAddress,
    razorpay_order_id: razorpayOrder.id
  });

  res.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    purchaseId: purchase._id,
    deliveryType: purchase.deliveryType
  });
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      orderId
    } = req.body;

    const razorpayOrderId = razorpay_order_id || orderId;

    if (!razorpayOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification details" });
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValidSignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const orderFilter = {
      user: req.user._id,
      type: "tokens",
      razorpay_order_id: razorpayOrderId
    };

    if (planId) {
      orderFilter.plan = planId;
    }

    const order = await Order.findOne(orderFilter);

    if (!order) {
      return res.status(404).json({ message: "Payment order not found" });
    }

    if (order.status === "paid") {
      const user = await User.findById(req.user._id).select("tokens");

      return res.json({
        success: true,
        message: "Payment already verified",
        tokensAdded: 0,
        currentTokens: user.tokens
      });
    }

    const result = await Order.updateOne(
      {
        _id: order._id,
        status: { $ne: "paid" }
      },
      {
        $set: {
          razorpay_payment_id,
          razorpay_signature,
          paymentStatus: "paid",
          status: "paid"
        }
      }
    );

    const tokensAdded = result.modifiedCount > 0 ? order.tokens : 0;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { tokens: tokensAdded } },
      { new: true }
    ).select("tokens");

    res.json({
      success: true,
      message: "Payment verified successfully",
      tokensAdded,
      currentTokens: user.tokens
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyAssetPurchasePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      purchaseId
    } = req.body;

    const isValidSignature = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValidSignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const order = await Order.findOne({
      _id: purchaseId,
      user: req.user._id,
      type: "asset",
      razorpay_order_id
    });

    if (!order) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    if (order.status !== "paid") {
      order.razorpay_payment_id = razorpay_payment_id;
      order.razorpay_signature = razorpay_signature;
      order.paymentStatus = "paid";
      order.status = "paid";
      order.orderStatus = order.deliveryType === "digital" ? "completed" : "placed";
      order.canDownload = order.deliveryType === "digital";
    }
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("asset", "title description url previewUrl type thumbnailUrl format duration fileSize gallery isPhysical")
      .populate("seller", "name")
      .populate("buyer", "name email");

    res.json({
      success: true,
      order: {
        _id: populatedOrder._id,
        buyer: populatedOrder.buyer,
        seller: populatedOrder.seller,
        asset: populatedOrder.asset,
        pricingOption: populatedOrder.pricingOption,
        amount: populatedOrder.amount,
        currency: populatedOrder.currency,
        paymentStatus: populatedOrder.paymentStatus,
        orderStatus: populatedOrder.orderStatus,
        deliveryType: populatedOrder.deliveryType,
        canDownload: populatedOrder.canDownload,
        shippingAddress: populatedOrder.deliveryType === "physical" ? populatedOrder.shippingAddress : undefined,
        createdAt: populatedOrder.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
