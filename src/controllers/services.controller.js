import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { CATEGORIES, SERVICE_MODES } from "../config/constants.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertOwner } from "../utils/ownership.js";
import { parseServiceInput } from "../utils/parseServiceInput.js";
import { toObjectId } from "../utils/objectId.js";

// Tie-breakers (_id) keep pagination stable when prices or dates are equal
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { basePrice: 1, _id: 1 },
  "price-desc": { basePrice: -1, _id: 1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------- PUBLIC ---------- */

// GET /api/services?search=&category=&serviceMode=&sort=&page=&limit=
export const listServices = asyncHandler(async (req, res) => {
  const { search, category, serviceMode, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const filter = { approvalStatus: "approved", isAvailable: true };

  // typeof checks stop query-injection such as ?search[$ne]=x
  if (typeof category === "string" && CATEGORIES.includes(category)) filter.category = category;
  if (typeof serviceMode === "string" && SERVICE_MODES.includes(serviceMode)) filter.serviceMode = serviceMode;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim().slice(0, 60)), "i");
    filter.$or = [{ title: rx }, { category: rx }];
  }

  const sortBy = typeof sort === "string" && Object.hasOwn(SORTS, sort) ? SORTS[sort] : SORTS.newest;

  const [services, total] = await Promise.all([
    col.services
      .find(filter, { projection: { technicianEmail: 0 } })
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col.services.countDocuments(filter),
  ]);

  res.json({ services, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// GET /api/services/:id  (404 unless approved AND available)
export const getService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) throw new ApiError(404, "Service not found");

  const service = await col.services.findOne({
    _id: new ObjectId(id),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new ApiError(404, "Service not found");

  const tech = await col.users.findOne(
    { email: service.technicianEmail },
    { projection: { name: 1, image: 1, area: 1, bio: 1 } }
  );

  const { technicianEmail, ...publicService } = service;
  res.json({
    ...publicService,
    technician: {
      name: tech?.name || service.technicianName,
      image: tech?.image ?? null,
      area: tech?.area || "",
      bio: tech?.bio || "",
    },
  });
});

/* ---------- TECHNICIAN ---------- */

// GET /api/services/mine
export const myServices = asyncHandler(async (req, res) => {
  const services = await col.services
    .find({ technicianEmail: req.user.email })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  res.json({ services });
});

// POST /api/services
export const createService = asyncHandler(async (req, res) => {
  const data = parseServiceInput(req.body);

  const doc = {
    ...data,
    technicianName: req.user.name,      // from the verified user, never from the body
    technicianEmail: req.user.email,
    approvalStatus: "pending",
    isAvailable: true,
    createdAt: new Date(),
  };
  const result = await col.services.insertOne(doc);
  res.status(201).json({ ...doc, _id: result.insertedId });
});

// PATCH /api/services/:id  (edit => back to pending)
export const updateService = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const existing = await col.services.findOne({ _id });
  if (!existing) throw new ApiError(404, "Service not found");
  assertOwner(existing.technicianEmail, req);

  const data = parseServiceInput(req.body);
  const update = { ...data, technicianName: req.user.name, approvalStatus: "pending", updatedAt: new Date() };

  await col.services.updateOne({ _id }, { $set: update });
  res.json({ ...existing, ...update });
});

// PATCH /api/services/:id/availability  (does NOT touch approvalStatus)
export const setAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body ?? {};
  if (typeof isAvailable !== "boolean") throw new ApiError(400, "isAvailable must be true or false");

  const _id = toObjectId(req.params.id);
  const existing = await col.services.findOne({ _id });
  if (!existing) throw new ApiError(404, "Service not found");
  assertOwner(existing.technicianEmail, req);

  await col.services.updateOne({ _id }, { $set: { isAvailable } });
  res.json({ _id, isAvailable });
});

// DELETE /api/services/:id
export const deleteService = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const existing = await col.services.findOne({ _id });
  if (!existing) throw new ApiError(404, "Service not found");
  assertOwner(existing.technicianEmail, req);

  await col.services.deleteOne({ _id });
  res.json({ deleted: true });
});