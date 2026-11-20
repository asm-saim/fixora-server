/**
 * The job status pipeline, enforced on the server.
 *
 *   requested -> accepted | rejected   (technician)
 *   requested -> cancelled             (customer)
 *   accepted -> in-progress            (technician)
 *   in-progress -> completed           (technician, needs finalAmount)
 *
 * Anything that is not listed here is rejected.
 */
export const TRANSITIONS = {
  requested: { accepted: "technician", rejected: "technician", cancelled: "customer" },
  accepted: { "in-progress": "technician" },
  "in-progress": { completed: "technician" },
};

/** A customer may have only one booking in these states per service. */
export const ACTIVE_STATUSES = ["requested", "accepted", "in-progress"];

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
];

export const MAX_FINAL_AMOUNT = 100000;
