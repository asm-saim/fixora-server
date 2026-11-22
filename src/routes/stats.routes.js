import { Router } from "express";
import { adminStats, customerStats, technicianStats } from "../controllers/stats.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin, verifyCustomer, verifyTechnician } from "../middlewares/verifyRole.js";

const router = Router();

router.get("/customer", verifyToken, verifyCustomer, customerStats);
router.get("/technician", verifyToken, verifyTechnician, technicianStats);
router.get("/admin", verifyToken, verifyAdmin, adminStats);

export default router;
