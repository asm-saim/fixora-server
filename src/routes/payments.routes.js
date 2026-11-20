import { Router } from "express";
import { createCheckoutSession, myPayments, verifyPayment } from "../controllers/payments.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer } from "../middlewares/verifyRole.js";

const router = Router();
const customerOnly = [verifyToken, verifyCustomer];

router.post("/create-checkout-session", customerOnly, createCheckoutSession);
router.get("/verify", customerOnly, verifyPayment);
router.get("/my", customerOnly, myPayments);

// The Stripe webhook (POST /api/payments/webhook) is NOT here. Stripe signs it instead of using a JWT,
// and it needs the raw body, so it is mounted in app.js before express.json().

export default router;
