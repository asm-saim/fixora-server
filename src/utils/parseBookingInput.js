import ApiError from "./ApiError.js";
import { MAX_FINAL_AMOUNT } from "./bookingRules.js";

const ID_RE = /^[a-f0-9]{24}$/i;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

/** Stripe cannot charge a card less than $0.50, so a completed job must be at least that. */
export const MIN_FINAL_AMOUNT = 0.5;

const text = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * "YYYY-MM-DD" -> Date at 00:00 UTC. Must be today or later.
 * One day of grace is allowed because the customer's "today" can be a day behind UTC.
 */
export function parsePreferredDate(value, now = new Date()) {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new ApiError(400, "Choose a preferred date");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, "The preferred date is not a real date");
  }
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() < todayUtc - DAY) throw new ApiError(400, "The preferred date cannot be in the past");
  if (date.getTime() > todayUtc + 366 * DAY) throw new ApiError(400, "The preferred date is too far ahead");
  return date;
}

/** Returns only the fields the customer is allowed to send. Everything else is ignored. */
export function parseBookingInput(body = {}, now = new Date()) {
  const serviceId = text(body.serviceId);
  const customerPhone = text(body.customerPhone);
  const address = text(body.address);
  const problemDescription = text(body.problemDescription);

  if (!ID_RE.test(serviceId)) throw new ApiError(400, "Invalid service");
  if (!PHONE_RE.test(customerPhone)) throw new ApiError(400, "Enter a valid phone number");
  if (address.length < 5 || address.length > 200) throw new ApiError(400, "Enter the full service address");
  const preferredDate = parsePreferredDate(body.preferredDate, now);
  if (problemDescription.length < 20 || problemDescription.length > 1000) {
    throw new ApiError(400, "Describe the problem in 20 to 1000 characters");
  }

  return { serviceId, customerPhone, address, preferredDate, problemDescription };
}

/** finalAmount must be a number from $0.50 up (strings like "45.50" are accepted). */
export function parseFinalAmount(value) {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount > MAX_FINAL_AMOUNT) {
    throw new ApiError(400, "Final amount must be a number greater than 0");
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) throw new ApiError(400, "Final amount must be a number greater than 0");
  if (rounded < MIN_FINAL_AMOUNT) {
    throw new ApiError(400, "Final amount must be at least $0.50, the minimum for a card payment");
  }
  return rounded;
}
