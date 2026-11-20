import "dotenv/config";
import { connectDB } from "../src/config/db.js";

const db = await connectDB();
const r = await db.collection("services").updateMany({}, { $set: { approvalStatus: "approved" } });
console.log(`Approved ${r.modifiedCount} service(s)`);
process.exit(0);