import Asset from "../models/Asset.js";
import Order from "../models/Order.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

const publicUserFields =
  "_id name username avatarUrl profileImage bio location profession category title coverImage socialLinks createdAt";

const getPublicArtistProfile = (user, assetCount) => {
  if (!user) return null;

  const avatar = user.avatarUrl || user.profileImage;

  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatar,
    profileImage: avatar,
    bio: user.bio,
    location: user.location,
    profession: user.profession || user.category || user.title,
    category: user.category,
    title: user.title,
    assetCount
  };
};

const privateAssetFields =
  "-downloadUrl -originalFileUrl -originalFileKey -downloadPublicId -originalFilePublicId";

const uploadToCloudinary = async (file, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });
};

const parsePricingOptions = (pricingOptions) => {
  if (!pricingOptions) return [];

  if (Array.isArray(pricingOptions)) return pricingOptions;

  try {
    return JSON.parse(pricingOptions);
  } catch (error) {
    throw new Error("Invalid pricing options format");
  }
};

const parseJsonField = (value, fieldName) => {
  if (!value) return undefined;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const getCoverFile = (files) => {
  if (files?.file?.[0]) return files.file[0];
  if (files?.cover?.[0]) return files.cover[0];
  if (files?.buffer) return files;
  return null;
};

const getPreviewFile = (files) => {
  if (files?.preview?.[0]) return files.preview[0];
  if (files?.cover?.[0]) return files.cover[0];
  if (files?.file?.[0]) return files.file[0];
  if (files?.buffer) return files;
  return null;
};

const getThumbnailFile = (files) => {
  if (files?.thumbnail?.[0]) return files.thumbnail[0];
  if (files?.cover?.[0]) return files.cover[0];
  if (files?.file?.[0]) return files.file[0];
  if (files?.buffer) return files;
  return null;
};

const getGalleryFiles = (files) => {
  if (!files?.gallery) return [];
  return files.gallery.slice(0, 4);
};

const normalizeAssetType = (type) => (["image", "video", "audio"].includes(type) ? type : "image");
const toPreviewUrl = (asset) => asset?.previewUrl || asset?.thumbnailUrl || asset?.url;
const getDeliveryType = (asset) => (asset?.isPhysical ? "physical" : "digital");
const isDownloadableOrder = (order) =>
  ["paid", "completed"].includes(order.paymentStatus) &&
  order.deliveryType === "digital" &&
  Boolean(order.canDownload);

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

const toPurchaseResponse = (order) => {
  const deliveryType = order.deliveryType || getDeliveryType(order.asset);
  const isDigital = deliveryType === "digital";

  return {
    _id: order._id,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    deliveryType,
    canDownload: isDigital && isDownloadableOrder(order),
    asset: order.asset
      ? {
          _id: order.asset._id,
          title: order.asset.title,
          description: order.asset.description,
          type: order.asset.type,
          previewUrl: toPreviewUrl(order.asset),
          url: toPreviewUrl(order.asset),
          thumbnailUrl: order.asset.thumbnailUrl,
          format: order.asset.format,
          duration: order.asset.duration,
          fileSize: order.asset.fileSize,
          category: order.asset.category,
          gallery: order.asset.gallery
        }
      : null,
    seller: order.seller,
    pricingOption: {
      _id: order.pricingOptionId,
      title: order.pricingOption?.title,
      description: order.pricingOption?.description,
      price: order.pricingOption?.price,
      licenseType: order.pricingOption?.licenseType
    },
    shippingAddress: isDigital ? undefined : order.shippingAddress,
    trackingNumber: isDigital ? undefined : order.trackingNumber,
    trackingUrl: isDigital ? undefined : order.trackingUrl,
    createdAt: order.createdAt
  };
};

export const createAssetService = async (files, body, userId) => {

  const originalFile = getCoverFile(files);
  const previewFile = getPreviewFile(files);
  const thumbnailFile = getThumbnailFile(files);

  if (!originalFile) {
    throw new Error("File is required");
  }

  const pricingOptions = parsePricingOptions(body.pricingOptions);
  const originalUpload = await uploadToCloudinary(originalFile, {
    type: "authenticated"
  });
  const previewUpload = await uploadToCloudinary(previewFile || originalFile);
  const thumbnailUpload = thumbnailFile
    ? await uploadToCloudinary(thumbnailFile)
    : previewUpload;
  const galleryUploads = await Promise.all(
    getGalleryFiles(files).map(uploadToCloudinary)
  );
  const assetType = normalizeAssetType(body.type || originalUpload.resource_type);
  const previewUrl = body.previewUrl || previewUpload.secure_url;
  const thumbnailUrl = body.thumbnailUrl || thumbnailUpload.secure_url;

  const asset = await Asset.create({
    title: body.title,
    description: body.description,
    type: assetType,
    url: previewUrl,
    previewUrl,
    downloadUrl: undefined,
    originalFileUrl: originalUpload.secure_url,
    originalFileKey: body.originalFileKey || originalUpload.public_id,
    downloadPublicId: body.downloadPublicId || body.originalFilePublicId || originalUpload.public_id,
    originalFilePublicId: body.originalFilePublicId || body.downloadPublicId || originalUpload.public_id,
    thumbnailUrl,
    duration: body.duration ? Number(body.duration) : originalUpload.duration,
    fileSize: body.fileSize ? Number(body.fileSize) : originalUpload.bytes,
    format: body.format || originalUpload.format,
    gallery: galleryUploads.map((item) => ({
      url: item.secure_url,
      publicId: item.public_id,
      type: item.resource_type
    })),
    pricingOptions,
    isPhysical: parseBoolean(body.isPhysical) || false,
    category: body.category || "digital",
    dimensions: parseJsonField(body.dimensions, "dimensions"),
    weight: parseJsonField(body.weight, "weight"),
    shippingAvailable: parseBoolean(body.shippingAvailable) || false,
    visibility: body.visibility || "public",
    owner: userId
  });

  return asset;
};



/* =========================
   GET PUBLIC ASSETS
========================= */

export const getPublicAssetsService = async (query) => {
   
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 6;
  const skip = (page - 1) * limit;
  console.log("page limit skip",page,limit,skip)
  const search = query.search || "";
  
  const filter = {
    visibility: "public",
    title: { $regex: search, $options: "i" }
  };
  console.log("filter working");
  const assets = await Asset.find(filter)
    .select(privateAssetFields)
    .populate("owner", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
    // console.log("console.log assest",assets);
  const total = await Asset.countDocuments(filter);

  return {
    assets: assets.map(toPublicAsset),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

export const getAssetByIdService = async (assetId) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw new Error("Asset not found");
  }

  const asset = await Asset.findOne({
    _id: assetId,
    visibility: "public"
  })
    .select(privateAssetFields)
    .populate("owner", publicUserFields);

  if (!asset) {
    throw new Error("Asset not found");
  }

  const assetCount = await Asset.countDocuments({
    owner: asset.owner?._id,
    visibility: "public"
  });

  return {
    asset: {
      ...toPublicAsset(asset),
      owner: getPublicArtistProfile(asset.owner, assetCount)
    }
  };
};


/* =========================
   GET USER ASSETS
========================= */

export const getMyAssetsService = async (userId, query) => {

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 6;
  const skip = (page - 1) * limit;

  const assets = await Asset.find({ owner: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Asset.countDocuments({ owner: userId });

  return {
    assets,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

export const updateAssetService = async (assetId, files, body, userId) => {
  const asset = await Asset.findOne({
    _id: assetId,
    owner: userId
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  if (body.title !== undefined) asset.title = body.title;
  if (body.description !== undefined) asset.description = body.description;
  if (body.type !== undefined) asset.type = normalizeAssetType(body.type);
  if (body.downloadUrl !== undefined) asset.downloadUrl = body.downloadUrl;
  if (body.originalFileUrl !== undefined) asset.originalFileUrl = body.originalFileUrl;
  if (body.downloadPublicId !== undefined) asset.downloadPublicId = body.downloadPublicId;
  if (body.originalFilePublicId !== undefined) asset.originalFilePublicId = body.originalFilePublicId;
  if (body.thumbnailUrl !== undefined) asset.thumbnailUrl = body.thumbnailUrl;
  if (body.duration !== undefined) asset.duration = Number(body.duration);
  if (body.fileSize !== undefined) asset.fileSize = Number(body.fileSize);
  if (body.format !== undefined) asset.format = body.format;
  if (body.visibility !== undefined) asset.visibility = body.visibility;
  if (body.isPhysical !== undefined) asset.isPhysical = parseBoolean(body.isPhysical);
  if (body.category !== undefined) asset.category = body.category;
  if (body.dimensions !== undefined) {
    asset.dimensions = parseJsonField(body.dimensions, "dimensions");
  }
  if (body.weight !== undefined) {
    asset.weight = parseJsonField(body.weight, "weight");
  }
  if (body.shippingAvailable !== undefined) {
    asset.shippingAvailable = parseBoolean(body.shippingAvailable);
  }
  if (body.pricingOptions !== undefined) {
    asset.pricingOptions = parsePricingOptions(body.pricingOptions);
  }

  const coverFile = getCoverFile(files);
  if (coverFile) {
    const uploadResult = await uploadToCloudinary(coverFile, {
      type: "authenticated"
    });
    asset.type = normalizeAssetType(body.type || uploadResult.resource_type);
    asset.originalFileUrl = uploadResult.secure_url;
    asset.originalFileKey = body.originalFileKey || uploadResult.public_id;
    asset.downloadPublicId = body.downloadPublicId || uploadResult.public_id;
    asset.originalFilePublicId = body.originalFilePublicId || uploadResult.public_id;
    asset.duration = body.duration ? Number(body.duration) : uploadResult.duration;
    asset.fileSize = body.fileSize ? Number(body.fileSize) : uploadResult.bytes;
    asset.format = body.format || uploadResult.format;
  }

  const previewFile = getPreviewFile(files);
  if (previewFile) {
    const previewUpload = await uploadToCloudinary(previewFile);
    asset.previewUrl = body.previewUrl || previewUpload.secure_url;
    asset.url = asset.previewUrl;
  } else if (body.previewUrl !== undefined) {
    asset.previewUrl = body.previewUrl;
    asset.url = body.previewUrl;
  }

  const thumbnailFile = getThumbnailFile(files);
  if (thumbnailFile) {
    const thumbnailUpload = await uploadToCloudinary(thumbnailFile);
    asset.thumbnailUrl = body.thumbnailUrl || thumbnailUpload.secure_url;
  } else if (body.thumbnailUrl !== undefined) {
    asset.thumbnailUrl = body.thumbnailUrl;
  }

  const galleryFiles = getGalleryFiles(files);
  if (galleryFiles.length > 0) {
    const galleryUploads = await Promise.all(galleryFiles.map(uploadToCloudinary));
    asset.gallery = galleryUploads.map((item) => ({
      url: item.secure_url,
      publicId: item.public_id,
      type: item.resource_type
    }));
  }

  await asset.save();

  return asset;
};

export const getMyPurchasedAssetsService = async (userId) => {
  const orders = await Order.find({
    user: userId,
    type: "asset",
    paymentStatus: { $in: ["paid", "completed"] }
  })
    .populate("asset", "title description url previewUrl type thumbnailUrl format duration fileSize category gallery isPhysical")
    .populate("seller", "name")
    .sort({ createdAt: -1 });

  return {
    orders: orders.map(toPurchaseResponse)
  };
};

export const getSellerOrdersService = async (sellerId) => {
  const orders = await Order.find({
    seller: sellerId,
    type: "asset",
    paymentStatus: { $in: ["paid", "completed"] },
    deliveryType: "physical"
  })
    .populate("asset", "title url previewUrl type gallery")
    .populate("buyer", "name email phone")
    .sort({ createdAt: -1 });

  const digitalOrders = await Order.find({
    seller: sellerId,
    type: "asset",
    paymentStatus: { $in: ["paid", "completed"] },
    deliveryType: "digital"
  })
    .populate("asset", "title url previewUrl type thumbnailUrl format duration fileSize")
    .populate("buyer", "name email")
    .sort({ createdAt: -1 });

  return {
    orders,
    digitalOrders: digitalOrders.map(toPurchaseResponse)
  };
};

export const updateSellerOrderStatusService = async (orderId, seller, body) => {
  const allowedStatuses = ["placed", "packed", "shipped", "delivered", "cancelled"];

  if (!allowedStatuses.includes(body.orderStatus)) {
    throw new Error("Invalid order status");
  }

  const filter = {
    _id: orderId,
    type: "asset"
  };

  if (seller.role !== "admin") {
    filter.seller = seller._id;
  }

  const order = await Order.findOne(filter);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.deliveryType === "digital") {
    throw new Error("Digital purchases do not require delivery updates");
  }

  order.orderStatus = body.orderStatus;
  if (body.trackingNumber !== undefined) order.trackingNumber = body.trackingNumber;
  if (body.trackingUrl !== undefined) order.trackingUrl = body.trackingUrl;

  await order.save();

  return order;
};
