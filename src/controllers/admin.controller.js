import { col } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  ROLES, buildBookingFilter, buildServiceFilter, buildUserFilter, pageMeta, parsePaging,
} from "../utils/adminQueries.js";
import { toObjectId } from "../utils/objectId.js";
import { centsToDollars, revenueTotalPipeline } from "../utils/statsPipelines.js";

const USER_FIELDS = { name: 1, email: 1, image: 1, role: 1, createdAt: 1, area: 1 };
const withRole = (user) => ({ ...user, role: user.role || "customer" });

/* ---------- USERS ---------- */

// GET /api/admin/users?search=&role=&page=&limit=
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = buildUserFilter(req.query);

  const [users, total] = await Promise.all([
    col.users.find(filter, { projection: USER_FIELDS }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    col.users.countDocuments(filter),
  ]);

  res.json({ users: users.map(withRole), ...pageMeta(total, page, limit) });
});

// PATCH /api/admin/users/:id/role   { role }
export const setUserRole = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const role = req.body?.role;
  if (typeof role !== "string" || !ROLES.includes(role)) throw new ApiError(400, "Role must be customer, technician or admin");

  // An admin cannot change their own role, so the platform can never be left without an admin
  if (String(_id) === req.user.id) throw new ApiError(403, "You cannot change your own role");

  const target = await col.users.findOne({ _id }, { projection: { role: 1, email: 1 } });
  if (!target) throw new ApiError(404, "User not found");

  const previousRole = target.role || "customer";
  if (previousRole === role) throw new ApiError(400, `This user is already a ${role}`);

  const updated = await col.users.findOneAndUpdate(
    { _id },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: "after", projection: USER_FIELDS }
  );
  if (!updated) throw new ApiError(404, "User not found");

  // A former technician can no longer manage requests, so their services stop appearing to customers
  let servicesHidden = 0;
  if (previousRole === "technician" && role !== "technician") {
    const result = await col.services.updateMany(
      { technicianEmail: target.email, isAvailable: true },
      { $set: { isAvailable: false } }
    );
    servicesHidden = result.modifiedCount;
  }

  res.json({ user: withRole(updated), servicesHidden });
});

/* ---------- SERVICES ---------- */

// GET /api/admin/services?status=&search=&page=&limit=
export const listAdminServices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = buildServiceFilter(req.query);

  const [services, total, groups] = await Promise.all([
    col.services.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    col.services.countDocuments(filter),
    col.services.aggregate([{ $group: { _id: "$approvalStatus", count: { $sum: 1 } } }]).toArray(),
  ]);

  // counts for the filter tabs (all services, not just the current filter)
  const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
  for (const g of groups) {
    if (g._id in counts) counts[g._id] = g.count;
    counts.all += g.count;
  }

  res.json({ services, counts, ...pageMeta(total, page, limit) });
});

// PATCH /api/admin/services/:id/approval   { approvalStatus: "approved" | "rejected" }
export const setApproval = asyncHandler(async (req, res) => {
  const status = req.body?.approvalStatus;
  if (status !== "approved" && status !== "rejected") {
    throw new ApiError(400, "approvalStatus must be approved or rejected");
  }

  const updated = await col.services.findOneAndUpdate(
    { _id: toObjectId(req.params.id) },
    { $set: { approvalStatus: status, reviewedAt: new Date(), reviewedBy: req.user.email } },
    { returnDocument: "after" }
  );
  if (!updated) throw new ApiError(404, "Service not found");

  res.json(updated);
});

/* ---------- BOOKINGS (read-only) ---------- */

// GET /api/admin/bookings?status=&page=&limit=
export const listAdminBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 15 });
  const filter = buildBookingFilter(req.query);

  const [bookings, total] = await Promise.all([
    col.bookings.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    col.bookings.countDocuments(filter),
  ]);

  res.json({ bookings, ...pageMeta(total, page, limit) });
});

/* ---------- PAYMENTS (read-only) ---------- */

// GET /api/admin/payments?page=&limit=   (totalRevenue covers ALL payments, not just this page)
export const listAdminPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 15 });

  const [payments, total, revenue] = await Promise.all([
    col.payments.find({}).sort({ paidAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    col.payments.countDocuments({}),
    col.payments.aggregate(revenueTotalPipeline({})).toArray(),
  ]);

  res.json({ payments, totalRevenue: centsToDollars(revenue[0]?.cents ?? 0), ...pageMeta(total, page, limit) });
});
