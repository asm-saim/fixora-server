import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadImage, uploadMiddleware } from "../controllers/upload.controller.js";

const router = Router();
router.post("/", verifyToken, uploadMiddleware, uploadImage); // any logged-in user (profile photo too)
export default router;