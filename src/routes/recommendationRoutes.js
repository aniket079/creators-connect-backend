import express from "express";
import {
  getRecommendedAssets,
  getRecommendedCreators,
  trackUserActivity
} from "../contollers/recommendationController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/activity", protect, trackUserActivity);
router.get("/assets", protect, getRecommendedAssets);
router.get("/creators", protect, getRecommendedCreators);

export default router;
