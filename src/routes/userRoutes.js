import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  addMyAddress,
  deleteMyAddress,
  getMyAddresses,
  setDefaultAddress,
  updateMyAddress,
  updateMyProfile
} from "../contollers/userController.js";

const router = express.Router();

router.patch("/me", protect, upload.single("avatar"), updateMyProfile);
router.get("/me/addresses", protect, getMyAddresses);
router.post("/me/addresses", protect, addMyAddress);
router.patch("/me/addresses/:addressId", protect, updateMyAddress);
router.delete("/me/addresses/:addressId", protect, deleteMyAddress);
router.patch("/me/addresses/:addressId/default", protect, setDefaultAddress);

export default router;
