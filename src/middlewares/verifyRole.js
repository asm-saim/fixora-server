import ApiError from "../utils/ApiError.js";

/** Always used AFTER verifyToken. */
export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (!allowed.includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden: you do not have permission to do this"));
  }
  next();
};

export const verifyCustomer = requireRole("customer");
export const verifyTechnician = requireRole("technician");
export const verifyAdmin = requireRole("admin");