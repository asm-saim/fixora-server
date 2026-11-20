import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Fixora API running on port ${PORT}`)))
    .catch((err) => {
      console.error("Failed to start:", err.message);
      process.exit(1);
    });
}

export default app; // Vercel uses this export