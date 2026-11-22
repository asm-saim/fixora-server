import { BOOKING_STATUSES } from "./bookingRules.js";

export const ROLES = ["customer", "technician", "admin"];
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = (v) => (typeof v === "string" ? v.trim().slice(0, 60) : "");
const contains = (value) => ({ $regex: escapeRegex(value), $options: "i" });

/** ?page=&limit= -> safe numbers. Anything odd falls back to the defaults. */
export function parsePaging(query = {}, { defaultLimit = 15, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pageMeta = (total, page, limit) => ({ total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });

/** Only plain strings are used, so a request like ?search[$ne]=x can never inject an operator. */
export function buildUserFilter(query = {}) {
  const filter = {};
  if (typeof query.role === "string" && ROLES.includes(query.role)) {
    // accounts created before roles existed have no role field and count as customers
    filter.role = query.role === "customer" ? { $in: ["customer", null] } : query.role;
  }
  const search = text(query.search);
  if (search) filter.$or = [{ name: contains(search) }, { email: contains(search) }];
  return filter;
}

export function buildServiceFilter(query = {}) {
  const filter = {};
  if (typeof query.status === "string" && APPROVAL_STATUSES.includes(query.status)) filter.approvalStatus = query.status;
  const search = text(query.search);
  if (search) {
    filter.$or = [
      { title: contains(search) },
      { category: contains(search) },
      { technicianName: contains(search) },
      { technicianEmail: contains(search) },
    ];
  }
  return filter;
}

export function buildBookingFilter(query = {}) {
  const filter = {};
  if (typeof query.status === "string" && BOOKING_STATUSES.includes(query.status)) filter.status = query.status;
  return filter;
}
