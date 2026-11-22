import { Router } from "express";
import { col } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import servicesRoutes from "./services.routes.js";
import bookingsRoutes from "./bookings.routes.js";
import paymentsRoutes from "./payments.routes.js";
import adminRoutes from "./admin.routes.js";
import usersRoutes from "./users.routes.js";
import uploadRoutes from "./upload.routes.js";
import statsRoutes from "./stats.routes.js";

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

router.use("/services", servicesRoutes);
router.use("/bookings", bookingsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/admin", adminRoutes);
router.use("/users", usersRoutes);
router.use("/upload", uploadRoutes);
router.use("/stats", statsRoutes);

export default router;
