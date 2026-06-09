import upload from "../middleware/uploadMiddleware.js";
import protect from "../middleware/authMiddleware.js";
import express from "express";
import {
  createAsset,
  getAssetById,
  getMyAssets,
  getMyPurchasedAssets,
  getSellerOrders,
  getPublicAssets,
  updateSellerOrderStatus,
  updateAsset
} from "../contollers/assetController.js";
const router = express.Router();

const assetUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "cover", maxCount: 1 },
  { name: "preview", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 4 }
]);

router.post("/", protect, assetUpload, createAsset);
router.get("/", getPublicAssets);        // Public
router.get("/my", protect, getMyAssets); 
router.get("/purchases/my", protect, getMyPurchasedAssets);
router.get("/orders/seller", protect, getSellerOrders);
router.patch("/orders/:orderId/status", protect, updateSellerOrderStatus);
router.get("/:assetId", getAssetById);
router.patch("/:assetId", protect, assetUpload, updateAsset);
export default router;



