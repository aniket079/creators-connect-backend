import {
  getArtistAssetsService,
  getArtistProfileService
} from "../services/artistService.js";

export const getArtistProfile = async (req, res) => {
  try {
    const data = await getArtistProfileService(req.params.artistId);
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getArtistAssets = async (req, res) => {
  try {
    const data = await getArtistAssetsService(req.params.artistId, req.query);
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
