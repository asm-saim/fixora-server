import { col } from "../config/db.js";
import { getStripe } from "../config/stripe.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toObjectId } from "../utils/objectId.js";
import { assertOwner, customerScope } from "../utils/ownership.js";
import { recordPayment } from "../utils/payments.js";

const MIN_CENTS = 50; // Stripe's minimum card charge in USD
const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,}$/;

const clientUrl = () =>
  (process.env.CLIENT_URL || (process.env.CLIENT_URLS || "").split(",")[0] || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");

// Customers do not need the technician's email
const publicPayment = ({ technicianEmail, ...payment }) => payment;

/**
 * Looks at the checkout session we created earlier for this booking.
 *  - already paid: save it now (the webhook may be late) and refuse to start a second payment
 *  - still open and valid: reuse it, so two sessions for one booking are never paid
 */
async function previousSession(stripe, booking, unitAmount) {
  if (!booking.checkoutSessionId) return null;

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(booking.checkoutSessionId);
  } catch {
    return null; // not found or temporarily unavailable: just create a fresh one
  }

  if (session.status === "complete" && session.payment_status === "paid") {
    await recordPayment(session);
    throw new ApiError(409, "This booking is already paid");
  }

  const reusable =
    session.status === "open" &&
    session.url &&
    session.expires_at * 1000 > Date.now() + 5 * 60_000 &&
    session.amount_total === unitAmount &&
    session.metadata?.bookingId === String(booking._id);

  return reusable ? session : null;
}

// POST /api/payments/create-checkout-session   (verifyToken, verifyCustomer)
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const bookingId = req.body?.bookingId;
  if (typeof bookingId !== "string") throw new ApiError(400, "bookingId is required");

  const booking = await col.bookings.findOne({ _id: toObjectId(bookingId) });
  if (!booking) throw new ApiError(404, "Booking not found");
  assertOwner(booking.customerEmail, req); // 403 for someone else's booking

  if (booking.paymentStatus === "paid") throw new ApiError(409, "This booking is already paid");
  if (booking.status !== "completed") {
    throw new ApiError(400, "You can pay only after the technician marks the job as completed");
  }

  // The amount ALWAYS comes from the database. Anything the browser sends is ignored.
  const unitAmount = Math.round(booking.finalAmount * 100);
  if (!Number.isInteger(unitAmount) || unitAmount < MIN_CENTS) {
    throw new ApiError(400, "The final amount is below the $0.50 minimum for card payments. Please contact the technician.");
  }

  const stripe = getStripe();

  const existing = await previousSession(stripe, booking, unitAmount);
  if (existing) return res.json({ url: existing.url });

  const metadata = { bookingId: String(booking._id), customerEmail: booking.customerEmail };
  const base = clientUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: booking.serviceTitle,
            description: `Repair by ${booking.technicianName}`,
            ...(booking.serviceImage?.startsWith("https://") ? { images: [booking.serviceImage] } : {}),
          },
        },
      },
    ],
    customer_email: booking.customerEmail,
    client_reference_id: String(booking._id),
    metadata,
    payment_intent_data: { metadata },
    success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/payment/cancel`,
  });

  await col.bookings.updateOne(
    { _id: booking._id, paymentStatus: "unpaid" },
    { $set: { checkoutSessionId: session.id } }
  );

  res.json({ url: session.url });
});

// GET /api/payments/verify?session_id=...   (verifyToken, verifyCustomer)
export const verifyPayment = asyncHandler(async (req, res) => {
  const sessionId = req.query.session_id;
  if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
    throw new ApiError(400, "A valid session_id is required");
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    if (err?.code === "resource_missing" || err?.statusCode === 404) throw new ApiError(404, "Payment session not found");
    throw err;
  }

  // A customer can only verify their own payment
  if (session.metadata?.customerEmail !== req.user.email) {
    throw new ApiError(403, "This payment belongs to another account");
  }

  if (session.payment_status !== "paid") throw new ApiError(402, "The payment has not been completed");

  const result = await recordPayment(session);
  if (!result.ok) throw new ApiError(409, "We could not match this payment to your booking. Please contact support.");

  res.json({ payment: publicPayment(result.payment), alreadyRecorded: !result.created });
});

// GET /api/payments/my   (verifyToken, verifyCustomer)
export const myPayments = asyncHandler(async (req, res) => {
  const payments = await col.payments
    .find(customerScope(req), { projection: { technicianEmail: 0 } })
    .sort({ paidAt: -1, _id: -1 })
    .limit(500)
    .toArray();
  res.json({ payments });
});
