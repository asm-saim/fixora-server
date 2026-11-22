import { col } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { customerScope, technicianScope } from "../utils/ownership.js";
import {
  bookingStatusPipeline, centsToDollars, fillMonths, lastMonths, monthStart, monthlyRevenuePipeline,
  revenueTotalPipeline, statusCounts, usersByRolePipeline,
} from "../utils/statsPipelines.js";

const MONTHS = 6;
const sum = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);
const active = (c) => c.requested + c.accepted + c["in-progress"];

// GET /api/stats/customer   (verifyToken, verifyCustomer)
export const customerStats = asyncHandler(async (req, res) => {
  const mine = customerScope(req); // built from the verified token, so only this customer's data is counted
  const months = lastMonths(MONTHS);

  const [statusRows, monthlyRows, totalRows, awaitingPayment] = await Promise.all([
    col.bookings.aggregate(bookingStatusPipeline(mine)).toArray(),
    col.payments.aggregate(monthlyRevenuePipeline(mine, monthStart(months))).toArray(),
    col.payments.aggregate(revenueTotalPipeline(mine)).toArray(),
    col.bookings.countDocuments({ ...mine, status: "completed", paymentStatus: "unpaid" }),
  ]);

  const byStatus = statusCounts(statusRows);
  res.json({
    stats: {
      totalRequests: sum(byStatus),
      activeJobs: active(byStatus),
      completedJobs: byStatus.completed,
      awaitingPayment,
      totalPaid: centsToDollars(totalRows[0]?.cents ?? 0),
    },
    byStatus,
    monthly: fillMonths(months, monthlyRows),
  });
});

// GET /api/stats/technician   (verifyToken, verifyTechnician)
export const technicianStats = asyncHandler(async (req, res) => {
  const mine = technicianScope(req);
  const months = lastMonths(MONTHS);

  const [statusRows, monthlyRows, totalRows, totalServices, approvedServices] = await Promise.all([
    col.bookings.aggregate(bookingStatusPipeline(mine)).toArray(),
    col.payments.aggregate(monthlyRevenuePipeline(mine, monthStart(months))).toArray(),
    col.payments.aggregate(revenueTotalPipeline(mine)).toArray(),
    col.services.countDocuments(mine),
    col.services.countDocuments({ ...mine, approvalStatus: "approved" }),
  ]);

  const byStatus = statusCounts(statusRows);
  res.json({
    stats: {
      totalServices,
      approvedServices,
      pendingRequests: byStatus.requested,
      activeJobs: byStatus.accepted + byStatus["in-progress"],
      completedJobs: byStatus.completed,
      earnings: centsToDollars(totalRows[0]?.cents ?? 0),
    },
    byStatus,
    monthly: fillMonths(months, monthlyRows),
  });
});

// GET /api/stats/admin   (verifyToken, verifyAdmin)
export const adminStats = asyncHandler(async (req, res) => {
  const months = lastMonths(MONTHS);

  const [roleRows, statusRows, monthlyRows, totalRows, pendingServices] = await Promise.all([
    col.users.aggregate(usersByRolePipeline()).toArray(),
    col.bookings.aggregate(bookingStatusPipeline({})).toArray(),
    col.payments.aggregate(monthlyRevenuePipeline({}, monthStart(months))).toArray(),
    col.payments.aggregate(revenueTotalPipeline({})).toArray(),
    col.services.countDocuments({ approvalStatus: "pending" }),
  ]);

  const usersByRole = { customer: 0, technician: 0, admin: 0 };
  for (const r of roleRows) if (r._id in usersByRole) usersByRole[r._id] = r.count;

  const byStatus = statusCounts(statusRows);
  res.json({
    stats: {
      totalUsers: sum(usersByRole),
      totalTechnicians: usersByRole.technician,
      pendingServices,
      totalBookings: sum(byStatus),
      totalRevenue: centsToDollars(totalRows[0]?.cents ?? 0),
    },
    usersByRole,
    byStatus,
    monthly: fillMonths(months, monthlyRows),
  });
});
