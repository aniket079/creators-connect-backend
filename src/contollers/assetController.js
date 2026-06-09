import {
  createAssetService,
  getAssetByIdService,
  getMyPurchasedAssetsService,
  getMyAssetsService,
  getSellerOrdersService,
  updateSellerOrderStatusService,
  getPublicAssetsService,
  updateAssetService
} from "../services/assetService.js";

export const createAsset = async (req, res) => {
  try {
    const asset = await createAssetService(
      req.files || req.file,
      req.body,
      req.user._id
    );

    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const asset = await getAssetByIdService(req.params.assetId);
    res.json(asset);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getPublicAssets = async (req, res) => {
  try {
    console.log("getting request for public asset",req.query);
    const data = await getPublicAssetsService(req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* =========================
   GET MY ASSETS
========================= */

export const getMyAssets = async (req, res) => {
  try {
    const data = await getMyAssetsService(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const asset = await updateAssetService(
      req.params.assetId,
      req.files || req.file,
      req.body,
      req.user._id
    );

    res.json(asset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyPurchasedAssets = async (req, res) => {
  try {
    const data = await getMyPurchasedAssetsService(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getSellerOrders = async (req, res) => {
  try {
    const data = await getSellerOrdersService(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSellerOrderStatus = async (req, res) => {
  try {
    const order = await updateSellerOrderStatusService(
      req.params.orderId,
      req.user,
      req.body
    );

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
