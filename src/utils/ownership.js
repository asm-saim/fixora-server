import ApiError from "./ApiError.js";

/** MongoDB filters built ONLY from the verified token, never from req.params, req.query or req.body */
export const customerScope = (req) => ({ customerEmail: req.user.email });
export const technicianScope = (req) => ({ technicianEmail: req.user.email });

/** Use after loading a document by id: 403 if it belongs to someone else */
export function assertOwner(ownerEmail, req) {
  if (!ownerEmail || ownerEmail !== req.user.email) {
    throw new ApiError(403, "Forbidden: this resource belongs to another user");
  }
}