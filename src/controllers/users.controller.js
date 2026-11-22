import { col } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseProfileInput } from "../utils/parseProfileInput.js";

const PROFILE_FIELDS = { name: 1, email: 1, image: 1, role: 1, phone: 1, area: 1, bio: 1 };

const publicProfile = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  image: user.image ?? null,
  role: user.role || "customer",
  phone: user.phone || "",
  area: user.area || "",
  bio: user.bio || "",
});

// GET /api/users/me   (verifyToken)
export const getMe = asyncHandler(async (req, res) => {
  const user = await col.users.findOne({ _id: req.user._id }, { projection: PROFILE_FIELDS });
  if (!user) throw new ApiError(404, "User not found");
  res.json(publicProfile(user));
});

// PATCH /api/users/profile   (verifyToken)
// The target user is ALWAYS the one in the verified token. No id or email is read from the request.
export const updateProfile = asyncHandler(async (req, res) => {
  const update = parseProfileInput(req.body);
  update.updatedAt = new Date();

  const updated = await col.users.findOneAndUpdate(
    { _id: req.user._id },
    { $set: update },
    { returnDocument: "after", projection: PROFILE_FIELDS }
  );
  if (!updated) throw new ApiError(404, "User not found");

  // Service cards show the technician's name, so keep their listings in step with the new name
  if (update.name && updated.role === "technician") {
    await col.services.updateMany({ technicianEmail: updated.email }, { $set: { technicianName: update.name } });
  }

  res.json({ user: publicProfile(updated) });
});
