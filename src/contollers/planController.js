import Plan from "../models/Plan.js";

export const getPlans = async (req, res) => {
  const plans = await Plan.find({ isActive: true });
  res.json(plans);
};