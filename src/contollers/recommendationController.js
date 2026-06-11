import {
  getRecommendedAssetsService,
  getRecommendedCreatorsService,
  trackUserActivityService
} from "../services/recommendationService.js";

export const trackUserActivity = async (req, res) => {
  try {
    const data = await trackUserActivityService(req.user._id, req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRecommendedAssets = async (req, res) => {
  try {
    const data = await getRecommendedAssetsService(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRecommendedCreators = async (req, res) => {
  try {
    const data = await getRecommendedCreatorsService(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
