import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createOrder,
  createAssetPurchaseOrder,
  verifyPayment,
  verifyAssetPurchasePayment,
} from "../contollers/paymentController.js";

const router = express.Router();

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/asset/create-order", protect, createAssetPurchaseOrder);
router.post("/asset/verify", protect, verifyAssetPurchasePayment);

export default router;
