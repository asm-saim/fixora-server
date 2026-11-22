import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { getMe, updateProfile } from "../controllers/users.controller.js";

const router = Router();

// Any logged-in user. The profile belongs to whoever the token says they are.
router.get("/me", verifyToken, getMe);
router.patch("/profile", verifyToken, updateProfile);

export default router;
