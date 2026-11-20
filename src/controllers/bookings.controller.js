import { col } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ACTIVE_STATUSES, BOOKING_STATUSES, TRANSITIONS } from "../utils/bookingRules.js";
import { toObjectId } from "../utils/objectId.js";
import { assertOwner, customerScope, technicianScope } from "../utils/ownership.js";
import { parseBookingInput, parseFinalAmount } from "../utils/parseBookingInput.js";

const DUPLICATE_MESSAGE = "You already have an active request for this service";

// Customers never need the technician's email address
const customerView = ({ technicianEmail, ...booking }) => booking;

/* ---------- CUSTOMER ---------- */

// POST /api/bookings   (verifyToken, verifyCustomer)
export const createBooking = asyncHandler(async (req, res) => {
  const input = parseBookingInput(req.body);

  // Only approved + available services can be booked
  const service = await col.services.findOne({
    _id: toObjectId(input.serviceId),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new ApiError(404, "This service is not available");

  if (service.technicianEmail === req.user.email) {
    throw new ApiError(403, "You cannot request your own service");
  }

  // One active request per customer per service
  const duplicate = await col.bookings.findOne(
    { ...customerScope(req), serviceId: String(service._id), status: { $in: ACTIVE_STATUSES } },
    { projection: { _id: 1 } }
  );
  if (duplicate) throw new ApiError(409, DUPLICATE_MESSAGE);

  const now = new Date();
  const doc = {
    // copied from the service, so the booking still reads correctly if the service changes later
    serviceId: String(service._id),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    // from the verified token, never from the request body
    customerName: req.user.name,
    customerEmail: req.user.email,
    // from the form
    customerPhone: input.customerPhone,
    address: input.address,
    preferredDate: input.preferredDate,
    problemDescription: input.problemDescription,
    // defaults
    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    statusHistory: [{ status: "requested", changedAt: now }],
    createdAt: now,
  };

  try {
    const result = await col.bookings.insertOne(doc);
    res.status(201).json(customerView({ ...doc, _id: result.insertedId }));
  } catch (err) {
    // The unique "one active booking per service" index caught a double-submit race
    if (err?.code === 11000) throw new ApiError(409, DUPLICATE_MESSAGE);
    throw err;
  }
});

// GET /api/bookings/my   (verifyToken, verifyCustomer)
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await col.bookings
    .find(customerScope(req), { projection: { technicianEmail: 0 } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .toArray();
  res.json({ bookings });
});

// PATCH /api/bookings/:id/cancel   (verifyToken, verifyCustomer)
export const cancelBooking = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);

  const booking = await col.bookings.findOne({ _id });
  if (!booking) throw new ApiError(404, "Booking not found");
  assertOwner(booking.customerEmail, req);

  if (booking.status !== "requested") {
    throw new ApiError(400, "Only requests that are still pending can be cancelled");
  }

  const now = new Date();
  // The filter repeats status: "requested", so a technician accepting at the same moment wins safely
  const updated = await col.bookings.findOneAndUpdate(
    { _id, customerEmail: req.user.email, status: "requested" },
    { $set: { status: "cancelled", updatedAt: now }, $push: { statusHistory: { status: "cancelled", changedAt: now } } },
    { returnDocument: "after", projection: { technicianEmail: 0 } }
  );
  if (!updated) throw new ApiError(409, "The technician just updated this request. Refresh to see its new status.");

  res.json(updated);
});

/* ---------- TECHNICIAN ---------- */

// GET /api/bookings/technician?status=   (verifyToken, verifyTechnician)
export const technicianBookings = asyncHandler(async (req, res) => {
  const filter = { ...technicianScope(req) };
  const { status } = req.query;
  if (typeof status === "string" && BOOKING_STATUSES.includes(status)) filter.status = status;

  const bookings = await col.bookings
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .toArray();
  res.json({ bookings });
});

// PATCH /api/bookings/:id/status   (verifyToken, verifyTechnician)
export const updateStatus = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const next = req.body?.status;
  if (typeof next !== "string" || !BOOKING_STATUSES.includes(next)) {
    throw new ApiError(400, "A valid status is required");
  }

  const booking = await col.bookings.findOne({ _id });
  if (!booking) throw new ApiError(404, "Booking not found");
  assertOwner(booking.technicianEmail, req); // 403 unless this is the technician's own job

  // Is this step in the pipeline, and is the technician the one allowed to take it?
  const actor = TRANSITIONS[booking.status]?.[next];
  if (!actor) throw new ApiError(400, `A ${booking.status} job cannot be changed to ${next}`);
  if (actor !== "technician") throw new ApiError(403, "Only the customer can cancel a request");

  const now = new Date();
  const set = { status: next, updatedAt: now };
  if (next === "completed") set.finalAmount = parseFinalAmount(req.body?.finalAmount);

  // The filter repeats the current status, so two quick clicks can never apply the same step twice.
  // paymentStatus is NOT touched here. Only a verified Stripe payment may change it (Step 9).
  const updated = await col.bookings.findOneAndUpdate(
    { _id, technicianEmail: req.user.email, status: booking.status },
    { $set: set, $push: { statusHistory: { status: next, changedAt: now } } },
    { returnDocument: "after" }
  );
  if (!updated) throw new ApiError(409, "This job was just updated. Refresh and try again.");

  res.json(updated);
});
