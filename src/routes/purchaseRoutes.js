import express from "express";
import { getPurchaseDownload } from "../contollers/purchaseController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:purchaseId/download", protect, getPurchaseDownload);

export default router;
