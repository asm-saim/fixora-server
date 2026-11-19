import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyRole.js";
import { notImplemented } from "../controllers/notImplemented.js";

const router = Router();

// One gate for the whole router, so a new admin route can never be left unprotected
router.use(verifyToken, verifyAdmin);

router.get("/users", notImplemented("Step 10"));
router.patch("/users/:id/role", notImplemented("Step 10"));
router.get("/services", notImplemented("Step 10")); // all services, needed by the approval page
router.patch("/services/:id/approval", notImplemented("Step 10"));
router.get("/bookings", notImplemented("Step 10"));
router.get("/payments", notImplemented("Step 10"));

export default router;