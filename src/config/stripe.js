import Stripe from "stripe";
import ApiError from "../utils/ApiError.js";

let client;

/** One shared Stripe client. Test mode only: live keys are refused unless you explicitly allow them. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(500, "Payments are not configured on the server");

  if (key.startsWith("sk_live_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
    throw new ApiError(500, "Live Stripe keys are disabled. Use your test-mode secret key (sk_test_...).");
  }

  client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}
