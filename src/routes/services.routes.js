import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyTechnician } from "../middlewares/verifyRole.js";
import {
  createService, deleteService, getService, listServices, myServices, setAvailability, updateService,
} from "../controllers/services.controller.js";

const router = Router();
const technicianOnly = [verifyToken, verifyTechnician];

// Public
router.get("/", listServices);

// "/mine" MUST come before "/:id"
router.get("/mine", technicianOnly, myServices);

router.get("/:id", getService);

// Technician only
router.post("/", technicianOnly, createService);
router.patch("/:id", technicianOnly, updateService);
router.patch("/:id/availability", technicianOnly, setAvailability);
router.delete("/:id", technicianOnly, deleteService);

export default router;