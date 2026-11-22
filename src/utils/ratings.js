import { col } from "../config/db.js";

const round1 = (n) => Math.round(n * 10) / 10;

/** "Sarah Khan" -> "Sarah K." so a public review never shows a customer's full name. */
export function shortName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Map of serviceId -> { ratingAverage, ratingCount } for many services in ONE query. */
export async function ratingsForServices(serviceIds) {
  const map = new Map();
  if (serviceIds.length === 0) return map;

  const rows = await col.bookings
    .aggregate([
      { $match: { serviceId: { $in: serviceIds }, "review.rating": { $exists: true } } },
      { $group: { _id: "$serviceId", total: { $sum: "$review.rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  for (const r of rows) map.set(r._id, { ratingAverage: round1(r.total / r.count), ratingCount: r.count });
  return map;
}

/** Adds ratingAverage and ratingCount (0 / 0 when nobody has reviewed yet). */
export const withRating = (service, map) => ({
  ...service,
  ratingAverage: map.get(String(service._id))?.ratingAverage ?? 0,
  ratingCount: map.get(String(service._id))?.ratingCount ?? 0,
});

/** The latest public reviews of one service. */
export async function latestReviews(serviceId, limit = 6) {
  const rows = await col.bookings
    .find({ serviceId, "review.rating": { $exists: true } }, { projection: { customerName: 1, review: 1 } })
    .sort({ "review.createdAt": -1, _id: -1 })
    .limit(limit)
    .toArray();

  return rows.map((b) => ({
    _id: String(b._id),
    customerName: shortName(b.customerName),
    rating: b.review.rating,
    comment: b.review.comment || "",
    createdAt: b.review.createdAt,
  }));
}
