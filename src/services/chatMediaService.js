import cloudinary from "../config/cloudinary.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/ogg"
]);

const getAttachmentType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
};

export const uploadChatMediaService = async (file, userId) => {
  if (!file) {
    throw new Error("File is required");
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error("Only image, video, and audio files are allowed");
  }

  const attachmentType = getAttachmentType(file.mimetype);

  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: `creatorconnect/chat/${userId}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  return {
    type: attachmentType,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    format: uploadResult.format,
    bytes: uploadResult.bytes,
    duration: uploadResult.duration,
    originalName: file.originalname
  };
};
