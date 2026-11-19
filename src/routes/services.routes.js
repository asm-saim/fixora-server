import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyTechnician } from "../middlewares/verifyRole.js";
import { notImplemented } from "../controllers/notImplemented.js";

const router = Router();
const technicianOnly = [verifyToken, verifyTechnician];

// Public
router.get("/", notImplemented("Step 6"));

// IMPORTANT: "/mine" must be declared BEFORE "/:id", or Express treats "mine" as an id
router.get("/mine", technicianOnly, notImplemented("Step 6"));

router.get("/:id", notImplemented("Step 6"));

// Technician only
router.post("/", technicianOnly, notImplemented("Step 6"));
router.patch("/:id", technicianOnly, notImplemented("Step 6"));
router.patch("/:id/availability", technicianOnly, notImplemented("Step 6"));
router.delete("/:id", technicianOnly, notImplemented("Step 6"));

export default router;