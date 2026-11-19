import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer, verifyTechnician } from "../middlewares/verifyRole.js";
import { notImplemented } from "../controllers/notImplemented.js";

const router = Router();
const customerOnly = [verifyToken, verifyCustomer];
const technicianOnly = [verifyToken, verifyTechnician];

// Customer
router.post("/", customerOnly, notImplemented("Step 8"));
router.get("/my", customerOnly, notImplemented("Step 8"));
router.patch("/:id/cancel", customerOnly, notImplemented("Step 8"));

// Technician
router.get("/technician", technicianOnly, notImplemented("Step 8"));
router.patch("/:id/status", technicianOnly, notImplemented("Step 8"));

export default router;