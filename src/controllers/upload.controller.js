import multer from "multer";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 }, // the client shrinks images well below this
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new ApiError(400, "Only image files are allowed")),
});

export const uploadMiddleware = upload.single("image");

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No image provided");
  if (!process.env.IMGBB_API_KEY) throw new ApiError(500, "Image upload is not configured");

  const form = new FormData();
  form.append("image", req.file.buffer.toString("base64"));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
    method: "POST",
    body: form,
  });
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) throw new ApiError(502, "Image upload failed. Please try again.");
  res.status(201).json({ url: json.data.display_url });
});