import { MongoClient, ServerApiVersion } from "mongodb";
import { checkEnv } from "./env.js";

const cache = (global._fixoraMongo ??= { client: null, db: null, promise: null });

export async function connectDB() {
  if (cache.db) return cache.db;

  if (!cache.promise) {
    checkEnv();
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
      maxPoolSize: 10,
    });

    cache.promise = client
      .connect()
      .then(async () => {
        const db = client.db(process.env.DB_NAME || "fixora");
        await ensureIndexes(db);
        cache.client = client;
        cache.db = db;
        console.log("MongoDB connected:", db.databaseName);
        return db;
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next request
        throw err;
      });
  }

  return cache.promise;
}

export function getDB() {
  if (!cache.db) throw new Error("Database not connected yet");
  return cache.db;
}

/** The 4 collections, accessed as col.users, col.services, col.bookings, col.payments */
export const col = {
  get users() { return getDB().collection("users"); },
  get services() { return getDB().collection("services"); },
  get bookings() { return getDB().collection("bookings"); },
  get payments() { return getDB().collection("payments"); },
};

export async function ensureIndexes(db) {
  await Promise.all([
    // users
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ role: 1 }),

    // services: public listing, technician's own list, search
    db.collection("services").createIndex({ approvalStatus: 1, isAvailable: 1, createdAt: -1 }),
    db.collection("services").createIndex({ technicianEmail: 1, createdAt: -1 }),
    db.collection("services").createIndex({ category: 1, serviceMode: 1, basePrice: 1 }),

    // bookings: duplicate check, customer list, technician list
    db.collection("bookings").createIndex({ customerEmail: 1, serviceId: 1, status: 1 }),
    db.collection("bookings").createIndex({ technicianEmail: 1, status: 1, createdAt: -1 }),
    db.collection("bookings").createIndex({ status: 1, createdAt: -1 }),

    // payments: idempotency guards (a payment can never be saved twice)
    db.collection("payments").createIndex({ stripeSessionId: 1 }, { unique: true }),
    db.collection("payments").createIndex({ bookingId: 1 }, { unique: true }),
    db.collection("payments").createIndex({ customerEmail: 1, paidAt: -1 }),
  ]);

  // A customer can have only ONE active request per service. The database enforces it too, so a
  // double-click can never create two. Partial indexes using $in need MongoDB 6.0+ (Atlas has it).
  // Wrapped in try/catch so old duplicate data can never stop the server from starting.
  try {
    await db.collection("bookings").createIndex(
      { customerEmail: 1, serviceId: 1 },
      {
        name: "one_active_booking_per_service",
        unique: true,
        partialFilterExpression: { status: { $in: ["requested", "accepted", "in-progress"] } },
      }
    );
  } catch (err) {
    console.warn("Could not create the one-active-booking index:", err.message);
  }
}
