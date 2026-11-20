import ApiError from "./ApiError.js";
import { ALLOWED_IMAGE_HOSTS, CATEGORIES, SERVICE_MODES } from "../config/constants.js";

const text = (v) => (typeof v === "string" ? v.trim() : "");

function isAllowedImage(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(u.hostname) && url.length <= 500;
  } catch {
    return false;
  }
}

export function parseServiceInput(body = {}) {
  const title = text(body.title);
  const description = text(body.description);
  const image = text(body.image);
  const estimatedDuration = text(body.estimatedDuration);
  const serviceArea = text(body.serviceArea);
  const basePrice = Number(body.basePrice);

  if (title.length < 3 || title.length > 100) throw new ApiError(400, "Title must be 3 to 100 characters");
  if (!CATEGORIES.includes(body.category)) throw new ApiError(400, "Invalid category");
  if (description.length < 20 || description.length > 2000) throw new ApiError(400, "Description must be 20 to 2000 characters");
  if (!isAllowedImage(image)) throw new ApiError(400, "A valid uploaded image is required");
  if (!Number.isFinite(basePrice) || basePrice <= 0 || basePrice > 100000) throw new ApiError(400, "Base price must be a positive number");
  if (estimatedDuration.length < 2 || estimatedDuration.length > 50) throw new ApiError(400, "Estimated duration is required");
  if (!SERVICE_MODES.includes(body.serviceMode)) throw new ApiError(400, "Invalid service mode");
  if (serviceArea.length < 2 || serviceArea.length > 100) throw new ApiError(400, "Service area is required");

  return {
    title,
    category: body.category,
    description,
    image,
    basePrice: Math.round(basePrice * 100) / 100,
    estimatedDuration,
    serviceMode: body.serviceMode,
    serviceArea,
  };
}