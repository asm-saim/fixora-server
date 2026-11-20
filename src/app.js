import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import { stripeWebhook } from "./controllers/webhook.controller.js";
import { ensureDb } from "./middlewares/ensureDb.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  cors({
    origin(origin, callback) {
      // allow server-to-server calls (Stripe webhook, curl, health checks) that send no Origin
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false); // blocked by CORS, no 500 error
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Stripe webhook: needs the RAW body to verify the signature, so it is mounted BEFORE express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "1mb" }));

// Root route: no DB needed, useful to check the deployment is alive
app.get("/", (req, res) => res.json({ ok: true, name: "Fixora API", version: "1.0.0" }));

// Every other /api route waits for the DB connection first
app.use("/api", ensureDb, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
