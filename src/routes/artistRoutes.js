import express from "express";
import {
  getArtistAssets,
  getArtistProfile
} from "../contollers/artistController.js";

const router = express.Router();

router.get("/:artistId/assets", getArtistAssets);
router.get("/:artistId", getArtistProfile);

export default router;
