import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Asset from "./models/Asset.js";
import Order from "./models/Order.js";
import Plan from "./models/Plan.js";
import User from "./models/User.js";
import UserActivity from "./models/UserActivity.js";

const testPassword = process.env.SEED_USER_PASSWORD || "Test@12345";

const plans = [
  { name: "Starter", price: 99, tokens: 100, bonusTokens: 0, isActive: true },
  { name: "Pro", price: 299, tokens: 300, bonusTokens: 20, isActive: true },
  { name: "Ultimate", price: 599, tokens: 700, bonusTokens: 99, isActive: true }
];

const users = [
  {
    name: "Aarav Creator",
    username: "aaravcreator",
    email: "aarav.creator@test.com",
    role: "user",
    tokens: 125,
    bio: "Mixed media artist building vivid editorial stories for brands and collectors.",
    avatarUrl: "https://i.pravatar.cc/300?img=12",
    profileImage: "https://i.pravatar.cc/300?img=12",
    coverImage: "https://picsum.photos/seed/aarav-cover/1600/600",
    location: "Mumbai, India",
    profession: "Digital Artist",
    category: "digital",
    title: "Visual Storyteller",
    socialLinks: {
      instagram: "https://instagram.com/aaravcreator",
      website: "https://aaravcreator.example.com"
    },
    addresses: [
      {
        fullName: "Aarav Creator",
        phone: "9000000001",
        addressLine1: "12 Art Lane",
        addressLine2: "Bandra West",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400050",
        country: "India",
        isDefault: true
      }
    ]
  },
  {
    name: "Maya Designer",
    username: "mayadesigns",
    email: "maya.designer@test.com",
    role: "user",
    tokens: 80,
    bio: "Designer and illustrator creating calm, premium visual systems for modern products.",
    avatarUrl: "https://i.pravatar.cc/300?img=47",
    profileImage: "https://i.pravatar.cc/300?img=47",
    coverImage: "https://picsum.photos/seed/maya-cover/1600/600",
    location: "Bengaluru, India",
    profession: "Illustrator",
    category: "painting",
    title: "Brand Designer",
    socialLinks: {
      instagram: "https://instagram.com/mayadesigns",
      website: "https://mayadesigns.example.com"
    },
    addresses: [
      {
        fullName: "Maya Designer",
        phone: "9000000002",
        addressLine1: "44 Studio Road",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
        isDefault: true
      }
    ]
  },
  {
    name: "Rohan Studio",
    username: "rohanstudio",
    email: "rohan.studio@test.com",
    role: "user",
    tokens: 60,
    bio: "Small studio focused on product renders, social campaigns, and tactile art objects.",
    avatarUrl: "https://i.pravatar.cc/300?img=68",
    profileImage: "https://i.pravatar.cc/300?img=68",
    coverImage: "https://picsum.photos/seed/rohan-cover/1600/600",
    location: "Delhi, India",
    profession: "Product Artist",
    category: "sculpture",
    title: "Studio Founder",
    socialLinks: {
      instagram: "https://instagram.com/rohanstudio",
      website: "https://rohanstudio.example.com"
    },
    addresses: [
      {
        fullName: "Rohan Studio",
        phone: "9000000003",
        addressLine1: "7 Maker Street",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
        isDefault: true
      }
    ]
  },
  {
    name: "Isha Photographer",
    username: "ishashoots",
    email: "isha.photographer@test.com",
    role: "user",
    tokens: 95,
    bio: "Photographer creating warm editorial frames for lifestyle, food, and travel brands.",
    avatarUrl: "https://i.pravatar.cc/300?img=32",
    profileImage: "https://i.pravatar.cc/300?img=32",
    coverImage: "https://picsum.photos/seed/isha-cover/1600/600",
    location: "Pune, India",
    profession: "Photographer",
    category: "digital",
    title: "Editorial Photographer",
    socialLinks: {
      instagram: "https://instagram.com/ishashoots",
      website: "https://ishashoots.example.com"
    },
    addresses: [
      {
        fullName: "Isha Photographer",
        phone: "9000000004",
        addressLine1: "21 Frame House",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "India",
        isDefault: true
      }
    ]
  }
];

const pricingOptions = [
  {
    title: "Personal License",
    description: "For personal projects and non-commercial use.",
    price: 499,
    licenseType: "personal",
    isActive: true
  },
  {
    title: "Commercial License",
    description: "For campaigns, brand pages, and paid client work.",
    price: 1999,
    licenseType: "commercial",
    isActive: true
  },
  {
    title: "Exclusive Buyout",
    description: "One-time exclusive ownership transfer.",
    price: 9999,
    licenseType: "exclusive",
    isActive: true
  }
];

const assets = [
  {
    ownerEmail: "aarav.creator@test.com",
    title: "Editorial Portrait Pack",
    description: "A polished portrait set for profile pages, campaign decks, and editorial mockups.",
    url: "https://picsum.photos/seed/editorial-portrait/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "aarav.creator@test.com",
    title: "Creator Bio Header",
    description: "Wide visual for artist profile headers, portfolios, and launch pages.",
    url: "https://picsum.photos/seed/creator-bio-header/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "aarav.creator@test.com",
    title: "Private Client Draft",
    description: "Private work-in-progress asset used to verify visibility filtering.",
    url: "https://picsum.photos/seed/private-client-draft/1200/800",
    category: "digital",
    visibility: "private"
  },
  {
    ownerEmail: "maya.designer@test.com",
    title: "Brand Moodboard",
    description: "A refined moodboard asset for brand direction and product launches.",
    url: "https://picsum.photos/seed/brand-moodboard/1200/800",
    category: "painting",
    visibility: "public"
  },
  {
    ownerEmail: "maya.designer@test.com",
    title: "Minimal Product Banner",
    description: "A clean banner concept for product-led landing pages and announcements.",
    url: "https://picsum.photos/seed/minimal-product-banner/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "maya.designer@test.com",
    title: "Hand Painted Wall Panel",
    description: "Physical painted panel available with shipping.",
    url: "https://picsum.photos/seed/painted-wall-panel/1200/800",
    category: "painting",
    visibility: "public",
    isPhysical: true,
    shippingAvailable: true,
    dimensions: { width: 60, height: 90, depth: 4, unit: "cm" },
    weight: { value: 4.5, unit: "kg" }
  },
  {
    ownerEmail: "rohan.studio@test.com",
    title: "Product Flatlay Concept",
    description: "A sharp product styling visual for marketplace cards and campaign pages.",
    url: "https://picsum.photos/seed/product-flatlay/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "rohan.studio@test.com",
    title: "Ambient Launch Beat",
    description: "A polished audio loop for product reveal videos and creator intros.",
    type: "audio",
    url: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    previewUrl: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    originalFileKey: "seed-originals/ambient-launch-beat",
    thumbnailUrl: "https://picsum.photos/seed/ambient-launch-beat/1200/800",
    format: "mp3",
    duration: 120,
    fileSize: 10485760,
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "rohan.studio@test.com",
    title: "Studio Motion Loop",
    description: "A short video loop for hero sections, social ads, and brand reels.",
    type: "video",
    url: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    previewUrl: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    originalFileKey: "seed-originals/studio-motion-loop",
    thumbnailUrl: "https://picsum.photos/seed/studio-motion-loop/1200/800",
    format: "mp4",
    duration: 8,
    fileSize: 7340032,
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "rohan.studio@test.com",
    title: "Wooden Desk Sculpture",
    description: "A compact physical sculpture for interiors and styling shoots.",
    url: "https://picsum.photos/seed/wooden-desk-sculpture/1200/800",
    category: "sculpture",
    visibility: "public",
    isPhysical: true,
    shippingAvailable: true,
    dimensions: { width: 24, height: 32, depth: 18, unit: "cm" },
    weight: { value: 2.2, unit: "kg" }
  },
  {
    ownerEmail: "rohan.studio@test.com",
    title: "Private Studio Notes Visual",
    description: "Private studio reference asset.",
    url: "https://picsum.photos/seed/studio-notes-visual/1200/800",
    category: "other",
    visibility: "private"
  },
  {
    ownerEmail: "isha.photographer@test.com",
    title: "Food Campaign Shot",
    description: "A warm food campaign image for menus, launch pages, and social ads.",
    url: "https://picsum.photos/seed/food-campaign/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "isha.photographer@test.com",
    title: "Travel Story Cover",
    description: "A cinematic cover frame for travel stories and editorial reels.",
    url: "https://picsum.photos/seed/travel-story-cover/1200/800",
    category: "digital",
    visibility: "public"
  },
  {
    ownerEmail: "isha.photographer@test.com",
    title: "Lifestyle Campaign Tile",
    description: "A ready-to-use lifestyle tile for public asset grids.",
    url: "https://picsum.photos/seed/lifestyle-campaign-tile/1200/800",
    category: "digital",
    visibility: "public"
  }
];

const activities = [
  {
    userEmail: "aarav.creator@test.com",
    type: "view",
    targetType: "asset",
    targetTitle: "Food Campaign Shot"
  },
  {
    userEmail: "aarav.creator@test.com",
    type: "save",
    targetType: "asset",
    targetTitle: "Travel Story Cover"
  },
  {
    userEmail: "aarav.creator@test.com",
    type: "like",
    targetType: "asset",
    targetTitle: "Lifestyle Campaign Tile"
  },
  {
    userEmail: "aarav.creator@test.com",
    type: "purchase",
    targetType: "asset",
    targetTitle: "Ambient Launch Beat"
  },
  {
    userEmail: "aarav.creator@test.com",
    type: "message",
    targetType: "creator",
    targetEmail: "isha.photographer@test.com"
  },
  {
    userEmail: "maya.designer@test.com",
    type: "view",
    targetType: "asset",
    targetTitle: "Editorial Portrait Pack"
  },
  {
    userEmail: "maya.designer@test.com",
    type: "like",
    targetType: "asset",
    targetTitle: "Creator Bio Header"
  },
  {
    userEmail: "maya.designer@test.com",
    type: "save",
    targetType: "asset",
    targetTitle: "Food Campaign Shot"
  },
  {
    userEmail: "maya.designer@test.com",
    type: "message",
    targetType: "creator",
    targetEmail: "aarav.creator@test.com"
  },
  {
    userEmail: "rohan.studio@test.com",
    type: "view",
    targetType: "asset",
    targetTitle: "Brand Moodboard"
  },
  {
    userEmail: "rohan.studio@test.com",
    type: "like",
    targetType: "asset",
    targetTitle: "Hand Painted Wall Panel"
  },
  {
    userEmail: "rohan.studio@test.com",
    type: "message",
    targetType: "creator",
    targetEmail: "maya.designer@test.com"
  },
  {
    userEmail: "isha.photographer@test.com",
    type: "view",
    targetType: "asset",
    targetTitle: "Product Flatlay Concept"
  },
  {
    userEmail: "isha.photographer@test.com",
    type: "save",
    targetType: "asset",
    targetTitle: "Studio Motion Loop"
  },
  {
    userEmail: "isha.photographer@test.com",
    type: "message",
    targetType: "creator",
    targetEmail: "rohan.studio@test.com"
  }
];

const getGallery = (title) => [
  {
    url: `https://picsum.photos/seed/${encodeURIComponent(`${title}-gallery-1`)}/1200/800`,
    publicId: `seed/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-gallery-1`,
    type: "image"
  },
  {
    url: `https://picsum.photos/seed/${encodeURIComponent(`${title}-gallery-2`)}/1200/800`,
    publicId: `seed/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-gallery-2`,
    type: "image"
  }
];

const seedPlans = async () => {
  await Plan.deleteMany({ name: { $in: plans.map((plan) => plan.name) } });
  return Plan.insertMany(plans);
};

const seedUsers = async (passwordHash) => {
  const seededUsers = [];

  for (const user of users) {
    const seededUser = await User.findOneAndUpdate(
      { email: user.email },
      { ...user, password: passwordHash },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    seededUsers.push(seededUser);
  }

  return seededUsers;
};

const seedAssets = async (seededUsers) => {
  const userByEmail = seededUsers.reduce((map, user) => {
    map[user.email] = user;
    return map;
  }, {});

  await Asset.deleteMany({
    title: { $in: assets.map((asset) => asset.title) }
  });

  const docs = assets.map((asset) => {
    const owner = userByEmail[asset.ownerEmail];

    return {
      title: asset.title,
      description: asset.description,
      type: asset.type || "image",
      url: asset.previewUrl || asset.url,
      previewUrl: asset.previewUrl || asset.url,
      originalFileKey:
        asset.originalFileKey ||
        `seed-originals/${asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      downloadPublicId:
        asset.originalFileKey ||
        `seed-originals/${asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      originalFilePublicId:
        asset.originalFileKey ||
        `seed-originals/${asset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      thumbnailUrl: asset.thumbnailUrl,
      duration: asset.duration,
      fileSize: asset.fileSize,
      format: asset.format || "jpg",
      gallery: getGallery(asset.title),
      pricingOptions,
      isPhysical: asset.isPhysical || false,
      category: asset.category,
      dimensions: asset.dimensions,
      weight: asset.weight,
      shippingAvailable: asset.shippingAvailable || false,
      visibility: asset.visibility,
      owner: owner._id
    };
  });

  return Asset.insertMany(docs);
};

const seedOrders = async (seededUsers, seededAssets) => {
  const buyer = seededUsers.find((user) => user.email === "aarav.creator@test.com");
  const purchasedAsset = seededAssets.find((asset) => asset.title === "Ambient Launch Beat");
  const pricingOption = purchasedAsset.pricingOptions[1] || purchasedAsset.pricingOptions[0];
  const isPhysicalPurchase = purchasedAsset.isPhysical;

  await Order.deleteMany({
    razorpay_order_id: { $in: ["seed_asset_order_001", "seed_token_order_001"] }
  });

  await Order.create({
    type: "asset",
    user: buyer._id,
    buyer: buyer._id,
    asset: purchasedAsset._id,
    assetOwner: purchasedAsset.owner,
    seller: purchasedAsset.owner,
    pricingOptionId: pricingOption._id.toString(),
    pricingOption: {
      title: pricingOption.title,
      description: pricingOption.description,
      price: pricingOption.price,
      licenseType: pricingOption.licenseType
    },
    licenseType: pricingOption.licenseType,
    amount: pricingOption.price,
    currency: "INR",
    shippingAddress: isPhysicalPurchase ? buyer.addresses[0] : undefined,
    deliveryType: isPhysicalPurchase ? "physical" : "digital",
    canDownload: !isPhysicalPurchase,
    razorpay_order_id: "seed_asset_order_001",
    razorpay_payment_id: "seed_asset_payment_001",
    razorpay_signature: "seed_signature",
    paymentStatus: "paid",
    status: "paid",
    orderStatus: isPhysicalPurchase ? "placed" : "completed"
  });

  const starterPlan = await Plan.findOne({ name: "Starter" });

  await Order.create({
    type: "tokens",
    user: buyer._id,
    plan: starterPlan._id,
    amount: starterPlan.price,
    tokens: starterPlan.tokens + starterPlan.bonusTokens,
    currency: "INR",
    razorpay_order_id: "seed_token_order_001",
    razorpay_payment_id: "seed_token_payment_001",
    razorpay_signature: "seed_signature",
    paymentStatus: "paid",
    status: "paid"
  });
};

const seedActivities = async (seededUsers, seededAssets) => {
  const userByEmail = seededUsers.reduce((map, user) => {
    map[user.email] = user;
    return map;
  }, {});
  const assetByTitle = seededAssets.reduce((map, asset) => {
    map[asset.title] = asset;
    return map;
  }, {});
  const userById = seededUsers.reduce((map, user) => {
    map[user._id.toString()] = user;
    return map;
  }, {});

  await UserActivity.deleteMany({
    user: { $in: seededUsers.map((user) => user._id) }
  });

  const docs = activities.map((activity) => {
    const user = userByEmail[activity.userEmail];

    if (!user) {
      throw new Error(`Seed activity user not found: ${activity.userEmail}`);
    }

    if (activity.targetType === "asset") {
      const asset = assetByTitle[activity.targetTitle];

      if (!asset) {
        throw new Error(`Seed activity asset not found: ${activity.targetTitle}`);
      }

      const owner = userById[asset.owner.toString()];

      return {
        user: user._id,
        type: activity.type,
        targetType: activity.targetType,
        targetId: asset._id,
        category: asset.category,
        profession: owner?.profession || owner?.category || owner?.title,
        location: owner?.location
      };
    }

    const creator = userByEmail[activity.targetEmail];

    if (!creator) {
      throw new Error(`Seed activity creator not found: ${activity.targetEmail}`);
    }

    return {
      user: user._id,
      type: activity.type,
      targetType: activity.targetType,
      targetId: creator._id,
      category: creator.category,
      profession: creator.profession || creator.category || creator.title,
      location: creator.location
    };
  });

  return UserActivity.insertMany(docs);
};

const seed = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(testPassword, 10);
  const seededPlans = await seedPlans();
  const seededUsers = await seedUsers(passwordHash);
  const seededAssets = await seedAssets(seededUsers);
  await seedOrders(seededUsers, seededAssets);
  const seededActivities = await seedActivities(seededUsers, seededAssets);

  console.log("Database seeded successfully.");
  console.log(`Plans: ${seededPlans.length}`);
  console.log(`Users: ${seededUsers.length}`);
  console.log(`Assets: ${seededAssets.length}`);
  console.log(`Activities: ${seededActivities.length}`);
  console.table(
    seededUsers.map((user) => ({
      email: user.email,
      username: user.username,
      password: testPassword
    }))
  );

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
