import "dotenv/config";
import { connectDB } from "../src/config/db.js";

const db = await connectDB(); // creates indexes on connect
const names = {};
for (const c of ["users", "services", "bookings", "payments"]) {
  names[c] = (await db.collection(c).indexes()).map((i) => i.name);
}
console.log(names);
process.exit(0);