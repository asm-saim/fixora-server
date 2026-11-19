import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { notImplemented } from "../controllers/notImplemented.js";

const router = Router();

// Any logged-in user. Returns the profile and role from the database.
router.get("/me", verifyToken, (req, res) => {
  const { id, email, name, image, role } = req.user;
  res.json({ id, email, name, image, role });
});

router.patch("/profile", verifyToken, notImplemented("Step 11"));

export default router;