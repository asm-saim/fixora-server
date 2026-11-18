import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Fixora API running on port ${PORT}`));
}

export default app; // Vercel uses this export