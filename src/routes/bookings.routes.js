import { Router } from "express";
import {
  cancelBooking, createBooking, myBookings, technicianBookings, updateStatus,
} from "../controllers/bookings.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer, verifyTechnician } from "../middlewares/verifyRole.js";

const router = Router();
const customerOnly = [verifyToken, verifyCustomer];
const technicianOnly = [verifyToken, verifyTechnician];

// Customer
router.post("/", customerOnly, createBooking);
router.get("/my", customerOnly, myBookings);
router.patch("/:id/cancel", customerOnly, cancelBooking);

// Technician
router.get("/technician", technicianOnly, technicianBookings);
router.patch("/:id/status", technicianOnly, updateStatus);

export default router;
