import { BOOKING_STATUSES } from "./bookingRules.js";

/** ["2026-06", ..., "2026-11"]: the last n calendar months in UTC, oldest first. */
export function lastMonths(n = 6, now = new Date()) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return months;
}

/** First instant of the oldest month in the list. */
export const monthStart = (months) => new Date(`${months[0]}-01T00:00:00.000Z`);

export const centsToDollars = (cents) => Math.round(cents) / 100;

/** { requested: 0, accepted: 0, ... } with the counts from a $group result filled in. */
export function statusCounts(rows) {
  const counts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  for (const row of rows) if (row._id in counts) counts[row._id] = row.count;
  return counts;
}

/** Every month in the list, with 0 where nothing was paid. */
export function fillMonths(months, rows) {
  const byMonth = new Map(rows.map((r) => [r._id, r.cents]));
  return months.map((month) => ({ month, amount: centsToDollars(byMonth.get(month) ?? 0) }));
}

/* ---- aggregation pipelines. $dateToString uses UTC when no timezone is given. ---- */

export const bookingStatusPipeline = (match = {}) => [
  { $match: match },
  { $group: { _id: "$status", count: { $sum: 1 } } },
];

export const usersByRolePipeline = () => [
  { $group: { _id: { $ifNull: ["$role", "customer"] }, count: { $sum: 1 } } },
];

// Money is summed as whole cents, so floating point errors (0.1 + 0.2) can never appear in totals
const CENTS = { $sum: { $round: [{ $multiply: ["$amount", 100] }, 0] } };

export const revenueTotalPipeline = (match = {}) => [
  { $match: match },
  { $group: { _id: null, cents: CENTS, count: { $sum: 1 } } },
];

export const monthlyRevenuePipeline = (match, since) => [
  { $match: { ...match, paidAt: { $gte: since } } },
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, cents: CENTS } },
];
