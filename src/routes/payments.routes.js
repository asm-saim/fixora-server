import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer } from "../middlewares/verifyRole.js";
import { notImplemented } from "../controllers/notImplemented.js";

const router = Router();
const customerOnly = [verifyToken, verifyCustomer];

router.post("/create-checkout-session", customerOnly, notImplemented("Step 9"));
router.get("/verify", customerOnly, notImplemented("Step 9"));
router.get("/my", customerOnly, notImplemented("Step 9"));

// The Stripe webhook (Step 9) is NOT JWT protected. Stripe signs it instead, and it
// is mounted in app.js before express.json().

export default router;