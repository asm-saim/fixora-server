import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:3000").split(",");

app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: allowedOrigins, credentials: true }));

// NOTE: the Stripe webhook route (Step 9) must be mounted BEFORE express.json()
app.use(express.json());

app.get("/", (req, res) => res.json({ ok: true, name: "Fixora API" }));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;