import express from "express";
import { handleWebhook } from "../contollers/webhookController.js";

const router = express.Router();

// IMPORTANT: raw body needed
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  handleWebhook
);

export default router;