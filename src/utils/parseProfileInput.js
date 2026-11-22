import ApiError from "./ApiError.js";
import { ALLOWED_IMAGE_HOSTS } from "../config/constants.js";

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const text = (v) => (typeof v === "string" ? v.trim() : null);

function isAllowedImage(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(u.hostname) && url.length <= 500;
  } catch {
    return false;
  }
}

/**
 * Returns ONLY the profile fields a user may change: name, phone, area, bio, image.
 * email and role are never read from the body, so they cannot be changed from here.
 * A field that is not in the body is left unchanged. image: null (or "") removes the photo.
 */
export function parseProfileInput(body = {}) {
  const update = {};

  if (body.name !== undefined) {
    const name = text(body.name);
    if (name === null || name.length < 2 || name.length > 60) throw new ApiError(400, "Name must be 2 to 60 characters");
    update.name = name;
  }

  if (body.phone !== undefined) {
    const phone = text(body.phone);
    if (phone === null || (phone !== "" && !PHONE_RE.test(phone))) throw new ApiError(400, "Enter a valid phone number");
    update.phone = phone;
  }

  if (body.area !== undefined) {
    const area = text(body.area);
    if (area === null || area.length > 100) throw new ApiError(400, "Area must be 100 characters or fewer");
    update.area = area;
  }

  if (body.bio !== undefined) {
    const bio = text(body.bio);
    if (bio === null || bio.length > 300) throw new ApiError(400, "Bio must be 300 characters or fewer");
    update.bio = bio;
  }

  if (body.image !== undefined) {
    if (body.image === null || body.image === "") {
      update.image = null;
    } else if (typeof body.image === "string" && isAllowedImage(body.image.trim())) {
      update.image = body.image.trim();
    } else {
      throw new ApiError(400, "The profile photo must be an uploaded image");
    }
  }

  if (Object.keys(update).length === 0) throw new ApiError(400, "Nothing to update");
  return update;
}
