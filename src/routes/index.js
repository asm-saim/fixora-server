import { Router } from "express";
import { col } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAuthToken } from "../utils/verifyAuthToken.js";
import ApiError from "../utils/ApiError.js";

const router = Router();

router.get("/health", asyncHandler(async (req, res) => {
  const [users, services, bookings, payments] = await Promise.all([
    col.users.estimatedDocumentCount(),
    col.services.estimatedDocumentCount(),
    col.bookings.estimatedDocumentCount(),
    col.payments.estimatedDocumentCount(),
  ]);
  res.json({ ok: true, db: "connected", counts: { users, services, bookings, payments } });
}));



// TEMP (replaced by verifyToken in Step 5)
router.get("/me", asyncHandler(async (req, res) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new ApiError(401, "Unauthorized");
  try {
    const payload = await verifyAuthToken(header.slice(7));
    res.json({ email: payload.email, name: payload.name, id: payload.sub });
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}));

// Later steps:
// router.use("/services", servicesRoutes);
// router.use("/bookings", bookingsRoutes);
// router.use("/payments", paymentsRoutes);
// router.use("/admin", adminRoutes);
// router.use("/users", usersRoutes);

export default router;