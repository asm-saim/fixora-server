import { connectDB } from "../config/db.js";
import { getStripe } from "../config/stripe.js";
import { recordPayment } from "../utils/payments.js";

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * POST /api/payments/webhook
 * Signed by Stripe, so it has no JWT. It must be mounted BEFORE express.json() with express.raw(),
 * because the signature is checked against the exact bytes Stripe sent.
 */
export async function stripeWebhook(req, res) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
      return res.status(500).json({ message: "Webhook is not configured" });
    }

    if (!Buffer.isBuffer(req.body)) {
      console.error("[webhook] The body is not a raw Buffer. express.raw() must run before express.json() on this route.");
      return res.status(400).json({ message: "Expected a raw application/json body" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ message: "Missing Stripe signature" });

    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
      console.error("[webhook] Signature check failed:", err.message);
      return res.status(400).json({ message: "Invalid signature" });
    }

    if (PAID_EVENTS.has(event.type)) {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        await connectDB(); // this route is mounted before the ensureDb middleware
        await recordPayment(session);
      }
    }

    // Every other event is acknowledged and ignored
    res.json({ received: true });
  } catch (err) {
    // A real failure (for example the database): 500 makes Stripe retry later, and recordPayment is safe to repeat
    console.error("[webhook] Handler failed:", err);
    res.status(500).json({ message: "Webhook handler failed" });
  }
}
