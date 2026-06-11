import mongoose from "mongoose";
import Asset from "../models/Asset.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import UserActivity from "../models/UserActivity.js";
import { enrichRecommendationsWithGrok } from "./grokService.js";

const privateAssetFields =
  "-downloadUrl -originalFileUrl -originalFileKey -downloadPublicId -originalFilePublicId";

const publicUserFields =
  "_id name username avatarUrl profileImage bio location profession category title coverImage socialLinks createdAt";

const activityWeights = {
  view: 1,
  message: 3,
  like: 4,
  save: 5,
  purchase: 8
};

const activityTypes = Object.keys(activityWeights);
const targetTypes = ["asset", "creator"];

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const shouldUseAi = (value) => value === true || value === "true" || value === "1";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toCaseInsensitiveMatches = (values) =>
  values.map((value) => new RegExp(`^${escapeRegex(value)}$`, "i"));

const toPreviewUrl = (asset) => asset?.previewUrl || asset?.thumbnailUrl || asset?.url;

const toPublicAsset = (asset) => {
  const data = typeof asset.toObject === "function" ? asset.toObject() : asset;
  const previewUrl = toPreviewUrl(data);

  delete data.downloadUrl;
  delete data.originalFileUrl;
  delete data.originalFileKey;
  delete data.downloadPublicId;
  delete data.originalFilePublicId;

  return {
    ...data,
    previewUrl,
    url: previewUrl
  };
};

const incrementPreference = (map, value, weight) => {
  const key = normalizeText(value);
  if (!key) return;
  map.set(key, (map.get(key) || 0) + weight);
};

const getTopKeys = (map, limit = 6) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);

const buildPreferences = (activities) => {
  const categories = new Map();
  const professions = new Map();
  const locations = new Map();

  activities.forEach((activity) => {
    const weight = activityWeights[activity.type] || 1;
    incrementPreference(categories, activity.category, weight);
    incrementPreference(professions, activity.profession, weight);
    incrementPreference(locations, activity.location, weight);
  });

  return {
    categoryScores: categories,
    professionScores: professions,
    locationScores: locations,
    categories: getTopKeys(categories),
    professions: getTopKeys(professions),
    locations: getTopKeys(locations)
  };
};

const getRecentActivities = (userId) =>
  UserActivity.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

const getPurchasedAssetIds = async (userId) => {
  const orders = await Order.find({
    user: userId,
    type: "asset",
    paymentStatus: { $in: ["paid", "completed"] },
    asset: { $exists: true, $ne: null }
  }).select("asset");

  return orders.map((order) => order.asset);
};

const getPopularityCounts = async (targetType, targetIds) => {
  if (!targetIds.length) return {};

  const counts = await UserActivity.aggregate([
    {
      $match: {
        targetType,
        targetId: { $in: targetIds }
      }
    },
    {
      $group: {
        _id: "$targetId",
        count: { $sum: 1 }
      }
    }
  ]);

  return counts.reduce((items, item) => {
    items[item._id.toString()] = item.count;
    return items;
  }, {});
};

const getAssetScore = (asset, preferences, popularity) => {
  const category = normalizeText(asset.category);
  const owner = asset.owner || {};
  const profession = normalizeText(owner.profession || owner.category || owner.title);
  const location = normalizeText(owner.location);

  return (
    (preferences.categoryScores.get(category) || 0) * 10 +
    (preferences.professionScores.get(profession) || 0) * 6 +
    (preferences.locationScores.get(location) || 0) * 3 +
    Math.min(popularity, 20) * 2
  );
};

const getCreatorScore = (creator, preferences, popularity) => {
  const category = normalizeText(creator.category);
  const profession = normalizeText(creator.profession || creator.category || creator.title);
  const location = normalizeText(creator.location);

  return (
    (preferences.categoryScores.get(category) || 0) * 8 +
    (preferences.professionScores.get(profession) || 0) * 10 +
    (preferences.locationScores.get(location) || 0) * 4 +
    Math.min(popularity, 20) * 2
  );
};

export const trackUserActivityService = async (userId, body) => {
  const { type, targetType, targetId } = body;

  if (!activityTypes.includes(type)) {
    throw new Error("Invalid activity type");
  }

  if (!targetTypes.includes(targetType)) {
    throw new Error("Invalid target type");
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new Error("Invalid target id");
  }

  const activity = {
    user: userId,
    type,
    targetType,
    targetId
  };

  if (targetType === "asset") {
    const asset = await Asset.findById(targetId)
      .select("category owner")
      .populate("owner", "profession category title location");

    if (!asset) {
      throw new Error("Asset not found");
    }

    activity.category = asset.category;
    activity.profession =
      asset.owner?.profession || asset.owner?.category || asset.owner?.title;
    activity.location = asset.owner?.location;
  }

  if (targetType === "creator") {
    const creator = await User.findById(targetId).select(
      "category profession title location"
    );

    if (!creator) {
      throw new Error("Creator not found");
    }

    activity.category = creator.category;
    activity.profession = creator.profession || creator.category || creator.title;
    activity.location = creator.location;
  }

  const savedActivity = await UserActivity.create(activity);

  return {
    activity: savedActivity
  };
};

export const getRecommendedAssetsService = async (userId, query = {}) => {
  const limit = Math.min(toNumber(query.limit, 10), 30);
  console.log("query.ai",query.ai);
  const useAi = shouldUseAi(query.ai);
  const activities = await getRecentActivities(userId);
  const preferences = buildPreferences(activities);
  const purchasedAssetIds = await getPurchasedAssetIds(userId);

  const filter = {
    visibility: "public",
    owner: { $ne: userId },
    _id: { $nin: purchasedAssetIds }
  };

  if (preferences.categories.length > 0) {
    filter.category = { $in: preferences.categories };
  }

  let assets = await Asset.find(filter)
    .select(privateAssetFields)
    .populate("owner", publicUserFields)
    .sort({ createdAt: -1 })
    .limit(100);

  if (assets.length < limit && preferences.categories.length > 0) {
    assets = await Asset.find({
      visibility: "public",
      owner: { $ne: userId },
      _id: { $nin: purchasedAssetIds }
    })
      .select(privateAssetFields)
      .populate("owner", publicUserFields)
      .sort({ createdAt: -1 })
      .limit(100);
  }

  const popularityCounts = await getPopularityCounts(
    "asset",
    assets.map((asset) => asset._id)
  );

  const recommendations = assets
    .map((asset) => {
      const popularity = popularityCounts[asset._id.toString()] || 0;
      return {
        ...toPublicAsset(asset),
        recommendationScore: getAssetScore(asset, preferences, popularity),
        popularity
      };
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, limit);

  const basedOn = {
    categories: preferences.categories,
    professions: preferences.professions,
    locations: preferences.locations
  };

  if (!useAi) {
    return {
      assets: recommendations,
      basedOn,
      aiEnabled: false
    };
  }

  try {
    const aiResult = await enrichRecommendationsWithGrok({
      type: "asset",
      items: recommendations,
      basedOn
    });

    return {
      assets: aiResult.items,
      basedOn,
      aiEnabled: aiResult.aiEnabled,
      aiModel: aiResult.aiModel
    };
  } catch (error) {
    console.error("Grok asset recommendation enrichment failed:", error.message);

    return {
      assets: recommendations,
      basedOn,
      aiEnabled: false,
      aiError: "AI enrichment unavailable"
    };
  };
};

export const getRecommendedCreatorsService = async (userId, query = {}) => {
  const limit = Math.min(toNumber(query.limit, 10), 30);
  const useAi = shouldUseAi(query.ai);
  const activities = await getRecentActivities(userId);
  const preferences = buildPreferences(activities);

  const filter = {
    _id: { $ne: userId }
  };

  if (preferences.categories.length > 0 || preferences.professions.length > 0) {
    filter.$or = [
      { category: { $in: toCaseInsensitiveMatches(preferences.categories) } },
      { profession: { $in: toCaseInsensitiveMatches(preferences.professions) } },
      { title: { $in: toCaseInsensitiveMatches(preferences.professions) } }
    ];
  }

  let creators = await User.find(filter)
    .select(publicUserFields)
    .sort({ createdAt: -1 })
    .limit(100);

  if (creators.length < limit && filter.$or) {
    creators = await User.find({ _id: { $ne: userId } })
      .select(publicUserFields)
      .sort({ createdAt: -1 })
      .limit(100);
  }

  const popularityCounts = await getPopularityCounts(
    "creator",
    creators.map((creator) => creator._id)
  );

  const assetCounts = await Asset.aggregate([
    {
      $match: {
        owner: { $in: creators.map((creator) => creator._id) },
        visibility: "public"
      }
    },
    {
      $group: {
        _id: "$owner",
        count: { $sum: 1 }
      }
    }
  ]);

  const assetCountMap = assetCounts.reduce((items, item) => {
    items[item._id.toString()] = item.count;
    return items;
  }, {});

  const recommendations = creators
    .map((creator) => {
      const data = creator.toObject();
      const popularity = popularityCounts[creator._id.toString()] || 0;
      return {
        ...data,
        avatar: data.avatarUrl || data.profileImage,
        assetCount: assetCountMap[creator._id.toString()] || 0,
        recommendationScore: getCreatorScore(creator, preferences, popularity),
        popularity
      };
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return b.assetCount - a.assetCount;
    })
    .slice(0, limit);

  const basedOn = {
    categories: preferences.categories,
    professions: preferences.professions,
    locations: preferences.locations
  };

  if (!useAi) {
    return {
      creators: recommendations,
      basedOn,
      aiEnabled: false
    };
  }

  try {
    const aiResult = await enrichRecommendationsWithGrok({
      type: "creator",
      items: recommendations,
      basedOn
    });

    return {
      creators: aiResult.items,
      basedOn,
      aiEnabled: aiResult.aiEnabled,
      aiModel: aiResult.aiModel
    };
  } catch (error) {
    console.error("Grok creator recommendation enrichment failed:", error.message);

    return {
      creators: recommendations,
      basedOn,
      aiEnabled: false,
      aiError: "AI enrichment unavailable"
    };
  };
};
