import { Router } from "express";
import {
  listAdminBookings, listAdminPayments, listAdminServices, listUsers, setApproval, setUserRole,
} from "../controllers/admin.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyRole.js";

const router = Router();

// One gate for the whole router, so a new admin route can never be left unprotected
router.use(verifyToken, verifyAdmin);

router.get("/users", listUsers);
router.patch("/users/:id/role", setUserRole);
router.get("/services", listAdminServices); // all services, needed by the approval page
router.patch("/services/:id/approval", setApproval);
router.get("/bookings", listAdminBookings);
router.get("/payments", listAdminPayments);

export default router;
