import { connectDB } from "../config/db.js";

export async function ensureDb(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
}