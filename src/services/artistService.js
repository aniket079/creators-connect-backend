import mongoose from "mongoose";
import Asset from "../models/Asset.js";
import User from "../models/User.js";

const publicUserFields =
  "_id name username avatarUrl profileImage coverImage bio location profession category title socialLinks createdAt";

const getAvatar = (artist) => artist.avatarUrl || artist.profileImage;

const toPublicArtist = (artist, assetCount) => ({
  _id: artist._id,
  name: artist.name,
  username: artist.username,
  avatar: getAvatar(artist),
  profileImage: getAvatar(artist),
  coverImage: artist.coverImage,
  bio: artist.bio,
  location: artist.location,
  profession: artist.profession || artist.category || artist.title,
  category: artist.category,
  title: artist.title,
  socialLinks: artist.socialLinks,
  assetCount,
  joinedAt: artist.createdAt
});

const assertValidArtistId = (artistId) => {
  if (!mongoose.Types.ObjectId.isValid(artistId)) {
    throw new Error("Artist not found");
  }
};

const toPublicAsset = (asset) => {
  const data = asset.toObject();
  const previewUrl = data.previewUrl || data.thumbnailUrl || data.url;

  return {
    ...data,
    previewUrl,
    url: previewUrl
  };
};

export const getArtistProfileService = async (artistId) => {
  assertValidArtistId(artistId);

  const artist = await User.findById(artistId).select(publicUserFields);

  if (!artist) {
    throw new Error("Artist not found");
  }

  const assetCount = await Asset.countDocuments({
    owner: artist._id,
    visibility: "public"
  });

  return {
    artist: toPublicArtist(artist, assetCount)
  };
};

export const getArtistAssetsService = async (artistId, query) => {
  assertValidArtistId(artistId);

  const artistExists = await User.exists({ _id: artistId });

  if (!artistExists) {
    throw new Error("Artist not found");
  }

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 12, 1);
  const skip = (page - 1) * limit;
  const filter = {
    owner: artistId,
    visibility: "public"
  };

  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .select("title description previewUrl url thumbnailUrl type category pricingOptions gallery createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Asset.countDocuments(filter)
  ]);

  return {
    assets: assets.map(toPublicAsset),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};
