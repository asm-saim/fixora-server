import { Router } from "express";
import { col } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

// Later steps:
// router.use("/services", servicesRoutes);
// router.use("/bookings", bookingsRoutes);
// router.use("/payments", paymentsRoutes);
// router.use("/admin", adminRoutes);
// router.use("/users", usersRoutes);

export default router;