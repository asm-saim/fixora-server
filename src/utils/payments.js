import { ObjectId } from "mongodb";
import { col } from "../config/db.js";

const ID_RE = /^[a-f0-9]{24}$/i;
const cents = (amount) => Math.round(amount * 100);

const paymentIntentId = (session) =>
  typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

/**
 * Saves a paid Stripe Checkout Session and marks its booking as paid.
 *
 * It is safe to call any number of times for the same session (success page, webhook, Stripe retries):
 *  - the payment is written with an upsert keyed on stripeSessionId,
 *  - unique indexes on stripeSessionId AND bookingId make a second copy impossible,
 *  - the booking update only matches while paymentStatus is still "unpaid", so it happens once,
 *  - if a crash left a saved payment with an unpaid booking, the next call repairs it.
 *
 * Returns { ok: true, payment, created } or { ok: false, reason } for sessions that must be ignored.
 * Real database errors are thrown, so a webhook can answer 500 and let Stripe retry.
 */
export async function recordPayment(session) {
  const reject = (reason) => {
    console.warn(`[payments] ignored session ${session?.id}: ${reason}`);
    return { ok: false, reason };
  };

  if (session?.mode !== "payment" || session.payment_status !== "paid") return reject("not a completed payment");

  const bookingId = session.metadata?.bookingId;
  if (!bookingId || !ID_RE.test(bookingId)) return reject("no valid bookingId in metadata");

  const transactionId = paymentIntentId(session);
  if (!transactionId) return reject("no payment intent on the session");

  const booking = await col.bookings.findOne({ _id: new ObjectId(bookingId) });
  if (!booking) return reject("booking not found");
  if (booking.customerEmail !== session.metadata.customerEmail) return reject("customer does not match the booking");
  if (booking.status !== "completed") return reject("booking is not completed");
  // Never trust the amount blindly: it must equal what the technician set as the final amount
  if (session.currency !== "usd" || session.amount_total !== cents(booking.finalAmount)) {
    return reject("amount does not match the booking");
  }

  const doc = {
    bookingId: String(booking._id),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: session.amount_total / 100,
    currency: "usd",
    transactionId,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  let created = false;
  try {
    const result = await col.payments.updateOne({ stripeSessionId: session.id }, { $setOnInsert: doc }, { upsert: true });
    created = result.upsertedCount > 0;
  } catch (err) {
    // 11000 = duplicate key. Either a parallel request saved the same session first (fine),
    // or a different session already paid this booking (handled below).
    if (err?.code !== 11000) throw err;
  }

  let payment = await col.payments.findOne({ stripeSessionId: session.id });
  let duplicatePayment = false;

  if (!payment) {
    // The bookingId index rejected us: this booking was already paid by ANOTHER checkout session
    payment = await col.payments.findOne({ bookingId: doc.bookingId });
    duplicatePayment = true;
    console.error(
      `[payments] DOUBLE PAYMENT for booking ${doc.bookingId}: session ${session.id} (payment ${transactionId}) ` +
        `was charged but the booking was already paid by session ${payment?.stripeSessionId}. Refund ${transactionId} in the Stripe Dashboard.`
    );
    if (!payment) return reject("could not save the payment");
  }

  // Runs on every call. It only matches while the booking is still unpaid, so it applies once,
  // and it repairs a booking that a crash left unpaid after its payment was saved.
  const now = new Date();
  await col.bookings.updateOne(
    { _id: booking._id, paymentStatus: "unpaid" },
    {
      $set: { paymentStatus: "paid", paidAt: payment.paidAt, updatedAt: now },
      $push: { statusHistory: { status: "paid", changedAt: now } },
    }
  );

  return { ok: true, payment, created, duplicatePayment };
}
