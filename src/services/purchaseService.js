import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Order from "../models/Order.js";

const paidStatuses = ["paid", "completed"];

const getDownloadSource = (asset) => ({
  publicId: asset.originalFileKey || asset.originalFilePublicId || asset.downloadPublicId,
  format: asset.format,
  resourceType: asset.type === "image" ? "image" : "video"
});

const buildSignedCloudinaryUrl = (asset) => {
  const { publicId, format, resourceType } = getDownloadSource(asset);

  if (!publicId) return null;

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    flags: "attachment",
    format
  });
};

export const getPurchaseDownloadService = async (purchaseId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    const error = new Error("Purchase not found");
    error.statusCode = 404;
    throw error;
  }

  const purchase = await Order.findOne({
    _id: purchaseId,
    type: "asset"
  }).populate(
    "asset",
    "title type originalFileKey downloadPublicId originalFilePublicId format isPhysical"
  );

  if (!purchase) {
    const error = new Error("Purchase not found");
    error.statusCode = 404;
    throw error;
  }

  if (purchase.user.toString() !== userId.toString()) {
    const error = new Error("You do not have access to this purchase");
    error.statusCode = 403;
    throw error;
  }

  if (!paidStatuses.includes(purchase.paymentStatus)) {
    const error = new Error("Payment is not completed");
    error.statusCode = 402;
    throw error;
  }

  if (!purchase.asset || purchase.asset.isPhysical || purchase.deliveryType !== "digital") {
    const error = new Error("Purchase is not downloadable");
    error.statusCode = 400;
    throw error;
  }

  const signedUrl = buildSignedCloudinaryUrl(purchase.asset);

  if (!signedUrl) {
    const error = new Error("Download file is not available");
    error.statusCode = 400;
    throw error;
  }

  return {
    downloadUrl: signedUrl
  };
};
