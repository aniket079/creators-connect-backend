import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

const uploadAvatar = async (file, userId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: `creatorconnect/avatars/${userId}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });
};

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  token: user.tokens
});

const findAddress = (user, addressId) => {
  const address = user.addresses.id(addressId);

  if (!address) {
    throw new Error("Address not found");
  }

  return address;
};

const applyDefaultAddress = (user, selectedAddressId) => {
  user.addresses.forEach((address) => {
    address.isDefault = address._id.toString() === selectedAddressId.toString();
  });
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;

    if (req.file) {
      const uploadedAvatar = await uploadAvatar(req.file, user._id);
      user.avatarUrl = uploadedAvatar.secure_url;
    }

    await user.save();

    res.json({
      user: formatUser(user)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    res.json({ addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addMyAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.create(req.body);

    if (address.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((item) => {
        item.isDefault = false;
      });
      address.isDefault = true;
    }

    user.addresses.push(address);
    await user.save();

    res.status(201).json({ address });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMyAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = findAddress(user, req.params.addressId);

    Object.assign(address, req.body);

    if (address.isDefault) {
      applyDefaultAddress(user, address._id);
    }

    await user.save();

    res.json({ address });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMyAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = findAddress(user, req.params.addressId);

    address.deleteOne();
    await user.save();

    res.json({ message: "Address deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = findAddress(user, req.params.addressId);

    applyDefaultAddress(user, address._id);
    await user.save();

    res.json({ address });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
