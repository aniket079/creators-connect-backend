import { getPurchaseDownloadService } from "../services/purchaseService.js";

export const getPurchaseDownload = async (req, res) => {
  try {
    const data = await getPurchaseDownloadService(
      req.params.purchaseId,
      req.user._id
    );

    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};
