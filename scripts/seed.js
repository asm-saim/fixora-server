/**
 * Fixora seed script:  npm run seed
 *
 * Creates demo data so every page of the site looks complete:
 *   - 1 admin, 3 technicians, 3 customers (real BetterAuth accounts, so they can sign in)
 *   - 14 approved services (2 per category) + 2 pending + 1 rejected
 *   - 16 bookings covering EVERY status, including paid ones with payment records and reviews
 *
 * Accounts are created through the client's BetterAuth sign-up endpoint, so the passwords are hashed
 * exactly like real sign-ups. That means the CLIENT must be running (npm run dev in fixora-client,
 * or point SEED_AUTH_URL at the deployed client).
 *
 * Safe to run again: accounts that exist are kept, and the services, bookings and payments of the
 * previous seed run (marked seed: true) are replaced. Real data created by people is never touched.
 */
import "dotenv/config";
import { connectDB } from "../src/config/db.js";

const AUTH_URL = (process.env.SEED_AUTH_URL || process.env.AUTH_ISSUER || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.SEED_PASSWORD || "Fixora123";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@fixora.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin1234";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = Date.now();
const ago = (days, extraMs = 0) => new Date(now - days * DAY + extraMs);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ people */

const PEOPLE = [
  {
    key: "admin", role: "admin", name: "Fixora Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    phone: "+880 1700-000000", area: "Dhaka", bio: "Platform administrator.",
  },
  {
    key: "t1", role: "technician", name: "Rahim Uddin", email: "rahim.tech@example.com", password: PASSWORD,
    phone: "+880 1711-100001", area: "Dhanmondi, Dhaka",
    bio: "Phone and TV specialist with 9 years of bench experience. Genuine parts, 30-day warranty on every repair.",
  },
  {
    key: "t2", role: "technician", name: "Nusrat Jahan", email: "nusrat.tech@example.com", password: PASSWORD,
    phone: "+880 1711-100002", area: "Uttara, Dhaka",
    bio: "Laptop, PC and washing machine technician. I explain the fault in plain words before I start any work.",
  },
  {
    key: "t3", role: "technician", name: "Tanvir Ahmed", email: "tanvir.tech@example.com", password: PASSWORD,
    phone: "+880 1711-100003", area: "Gulshan, Dhaka",
    bio: "Certified HVAC and electrical technician. Fridge, AC and wiring jobs done safely and on time.",
  },
  {
    key: "c1", role: "customer", name: "Ayesha Rahman", email: "ayesha.customer@example.com", password: PASSWORD,
    phone: "+880 1811-200001", area: "Dhanmondi, Dhaka", bio: "",
  },
  {
    key: "c2", role: "customer", name: "Sabbir Khan", email: "sabbir.customer@example.com", password: PASSWORD,
    phone: "+880 1811-200002", area: "Mirpur, Dhaka", bio: "",
  },
  {
    key: "c3", role: "customer", name: "Mehedi Hasan", email: "mehedi.customer@example.com", password: PASSWORD,
    phone: "+880 1811-200003", area: "Banani, Dhaka", bio: "",
  },
];

/* ---------------------------------------------------------------- services */

// Every service has its own local photo in fixora-client/public/images/services.
// Local files are served instantly by Next's image optimizer, unlike remote URLs.
const image = (name) => `/images/services/${name}.jpg`;
const FALLBACK_IMAGE = "/images/hero-repair.jpg";

// Index in this list = the "s" number used by the bookings below
const SERVICES = [
  // Smartphone (Rahim)
  { tech: "t1", category: "Smartphone", title: "Smartphone Screen Replacement (All Major Brands)", basePrice: 55, estimatedDuration: "1-2 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka",
    image: image("smartphone-screen-replacement"),
    description: "Cracked or unresponsive screen? I replace displays for Samsung, iPhone, Xiaomi, Oppo and more using tested panels. Touch, brightness and face or fingerprint unlock are all checked before you leave, and the repair comes with a 30-day warranty." },
  { tech: "t1", category: "Smartphone", title: "Phone Battery & Charging Port Repair", basePrice: 28, estimatedDuration: "45-90 minutes", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Mohammadpur, Lalmatia",
    image: image("phone-battery-charging-repair"),
    description: "Battery draining fast, phone not charging, or the cable keeps falling out? I replace worn batteries and clean or swap damaged charging ports at your door, then run a full charge-and-discharge test so you know it is fixed." },
  // Laptop & PC (Nusrat)
  { tech: "t2", category: "Laptop & PC", title: "Laptop Not Booting: Diagnosis & Repair", basePrice: 40, estimatedDuration: "2-4 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka",
    image: image("laptop-not-booting-repair"),
    description: "Black screen, boot loops, beeping or no power at all. I find the real fault first (RAM, storage, charger circuit or motherboard), tell you the exact cost, and only then start the repair. Data is protected throughout." },
  { tech: "t2", category: "Laptop & PC", title: "Laptop Screen, Keyboard & SSD Upgrade", basePrice: 75, estimatedDuration: "Same day", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka",
    image: image("laptop-screen-keyboard-ssd-upgrade"),
    description: "Replace a broken screen or keyboard, or make an old laptop fast again with an SSD and extra RAM. I clone your existing system so all your files and programs are exactly where you left them." },
  // AC (Tanvir)
  { tech: "t3", category: "AC", title: "AC Gas Refill & Full Servicing", basePrice: 60, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Baridhara",
    image: image("ac-gas-refill-servicing"),
    description: "Weak cooling or water dripping indoors? A full service covers deep cleaning of filters and coils, leak check, gas pressure test and refill if needed. Your AC cools faster and uses less electricity afterwards." },
  { tech: "t3", category: "AC", title: "Split AC Installation & Repair", basePrice: 85, estimatedDuration: "3-5 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Badda",
    image: image("split-ac-installation-repair"),
    description: "Professional installation of new split ACs with proper piping, drainage and a stable outdoor mount, plus repair for noisy fans, tripping breakers and remote or sensor faults. Clean finish, no mess left behind." },
  // Refrigerator (Tanvir)
  { tech: "t3", category: "Refrigerator", title: "Refrigerator Not Cooling: Complete Fix", basePrice: 50, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Mohakhali",
    image: image("refrigerator-not-cooling-fix"),
    description: "Fridge warm, freezer frosting over or food spoiling early? I test the thermostat, defrost system, door seals and fan, fix the cause on the spot and explain what went wrong so it does not happen again." },
  { tech: "t3", category: "Refrigerator", title: "Fridge Compressor & Thermostat Replacement", basePrice: 110, estimatedDuration: "Half a day", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Uttara",
    image: image("fridge-compressor-thermostat"),
    description: "For fridges that run constantly or do not start at all. Compressor, start relay and thermostat replacement with genuine parts, vacuum and gas charging, and a 90-day warranty on the replaced components." },
  // TV (Rahim)
  { tech: "t1", category: "TV", title: "LED / LCD TV Panel & Backlight Repair", basePrice: 65, estimatedDuration: "1-2 days", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka",
    image: image("tv-panel-backlight-repair"),
    description: "Dark screen with sound, vertical lines, flickering or dim picture. I repair backlight strips and power boards for all major brands, and give you a clear quote before any parts are ordered." },
  { tech: "t1", category: "TV", title: "Smart TV Software & Mainboard Repair", basePrice: 45, estimatedDuration: "3-6 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Mohammadpur, Farmgate",
    image: image("smart-tv-mainboard-repair"),
    description: "TV stuck on the logo, apps crashing, Wi-Fi dropping or no signal on HDMI. I reflash firmware, repair mainboards and fix port faults, then test every input and app before I leave." },
  // Washing Machine (Nusrat)
  { tech: "t2", category: "Washing Machine", title: "Washing Machine Drum & Motor Repair", basePrice: 70, estimatedDuration: "2-4 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Tongi, Dhaka",
    image: image("washing-machine-drum-motor"),
    description: "Loud banging, drum not spinning, or clothes coming out soaking wet. I replace bearings, belts and motors for top-load and front-load machines and balance the drum so it runs quietly again." },
  { tech: "t2", category: "Washing Machine", title: "Front-Load Washer Leak & Drain Fix", basePrice: 35, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka",
    image: image("front-load-washer-leak-drain"),
    description: "Water on the floor or the machine will not drain? I clear blocked pumps and filters, replace door seals and hoses, and test a full wash cycle so you are sure the leak is gone." },
  // Electrical (Tanvir)
  { tech: "t3", category: "Electrical", title: "Home Electrical Wiring & Switchboard Repair", basePrice: 45, estimatedDuration: "2-4 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Baridhara",
    image: image("home-electrical-wiring"),
    description: "Tripping breakers, burning smell, loose sockets or outdated switchboards. A licensed technician inspects your wiring, replaces damaged parts and leaves everything safe, labelled and to code." },
  { tech: "t3", category: "Electrical", title: "Ceiling Fan, Light & Short-Circuit Fix", basePrice: 22, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Banani, Badda",
    image: image("ceiling-fan-light-repair"),
    description: "Slow or wobbling fans, flickering lights, dead sockets and short circuits. Quick same-day visits with the common parts already on the van, so most jobs are finished in a single trip." },
];

// Waiting for the admin, and one the admin turned down, so the approval page has something to show
const EXTRA_SERVICES = [
  { tech: "t2", category: "Laptop & PC", title: "Data Recovery from Dead Hard Drives", basePrice: 95, estimatedDuration: "2-3 days", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka", approvalStatus: "pending",
    image: image("data-recovery-hard-drive"),
    description: "Lost files after a crash or a drive that no longer shows up? I recover documents, photos and databases from failed HDDs and SSDs, and you only pay for the files that are actually recovered." },
  { tech: "t1", category: "Smartphone", title: "Water Damage Recovery for Phones", basePrice: 48, estimatedDuration: "1 day", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", approvalStatus: "pending",
    image: image("phone-water-damage-recovery"),
    description: "Phone dropped in water? Switch it off and bring it straight in. Ultrasonic cleaning, corrosion treatment and a full board inspection give the best chance of saving your phone and your data." },
  { tech: "t3", category: "Electrical", title: "Cheap Wiring Jobs, No Licence Needed", basePrice: 10, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Dhaka", approvalStatus: "rejected",
    image: image("cheap-wiring-jobs"),
    description: "Very low priced wiring work for any home. This listing was turned down by the admin because it does not describe the work or the qualifications clearly enough." },
];

/* ---------------------------------------------------------------- bookings */

// s = service number, c = customer, ageDays = when it was requested.
// finalAmount only applies once a job is completed. paid: true also creates a payment record.
const BOOKINGS = [
  { c: "c1", s: 0, status: "completed", paid: true, ageDays: 150, finalAmount: 55, problem: "The screen cracked after a fall and the touch only works on half of the display. Please replace the whole screen.",
    review: { rating: 5, comment: "Fast, clean work and the phone feels brand new. Rahim explained everything before he started." } },
  { c: "c2", s: 2, status: "completed", paid: true, ageDays: 122, finalAmount: 48, problem: "My laptop shows a black screen when I press the power button, although the fan spins for a few seconds.",
    review: { rating: 4, comment: "Found the faulty RAM stick quickly and fixed it the same day. Fair price." } },
  { c: "c3", s: 4, status: "completed", paid: true, ageDays: 96, finalAmount: 72, problem: "The AC runs all day but the room barely cools down, and there is some water dripping from the indoor unit.",
    review: { rating: 5, comment: "Tanvir was on time, very polite, and the AC cools like new. Highly recommended." } },
  { c: "c1", s: 6, status: "completed", paid: true, ageDays: 71, finalAmount: 60, problem: "The fridge is warm inside but the freezer still works. Food is spoiling within a day or two.",
    review: { rating: 5, comment: "Fixed the thermostat in under two hours and gave me tips to keep the fridge healthy." } },
  { c: "c2", s: 8, status: "completed", paid: true, ageDays: 52, finalAmount: 90, problem: "The TV turns on and I can hear sound, but the screen is almost completely dark unless I shine a torch on it.",
    review: { rating: 4, comment: "Backlight repaired and the picture is bright again. It took two days, but the result is great." } },
  { c: "c3", s: 10, status: "completed", paid: true, ageDays: 33, finalAmount: 65, problem: "The washing machine makes a loud banging noise during the spin cycle and walks across the floor.",
    review: { rating: 3, comment: "The machine works well now, but the technician arrived about an hour late." } },
  { c: "c1", s: 12, status: "completed", paid: true, ageDays: 21, finalAmount: 40, problem: "The main breaker keeps tripping when I run the iron and the microwave together in the kitchen.",
    review: { rating: 5, comment: "Found a loose connection at the switchboard and made everything safe. Very professional." } },
  { c: "c2", s: 1, status: "completed", paid: true, ageDays: 11, finalAmount: 30, problem: "My phone battery drops from 100 percent to 20 percent in a couple of hours and the phone gets warm." },
  { c: "c3", s: 3, status: "completed", paid: false, ageDays: 6, finalAmount: 75, problem: "The laptop is very slow and the keyboard has several keys that no longer respond. I would like an SSD upgrade too." },
  { c: "c1", s: 5, status: "in-progress", ageDays: 4, problem: "I bought a new split AC and need it installed in the bedroom with the outdoor unit on the balcony wall." },
  { c: "c2", s: 7, status: "accepted", ageDays: 3, problem: "The fridge compressor makes a clicking sound and never starts. It stopped cooling completely last night." },
  { c: "c3", s: 9, status: "requested", ageDays: 1, problem: "Our smart TV is stuck on the brand logo after a failed software update. Nothing else on the screen." },
  { c: "c1", s: 11, status: "rejected", ageDays: 13, problem: "Water leaks from the bottom of the front-load washer during every wash and the door seal looks torn." },
  { c: "c2", s: 13, status: "cancelled", ageDays: 9, problem: "The ceiling fan in the living room wobbles badly and makes a grinding noise on the highest speed." },
  { c: "c3", s: 0, status: "requested", ageDays: 0, problem: "The phone screen has a green line down the side after it fell on a tile floor. Touch still works fine." },
  { c: "c1", s: 2, status: "requested", ageDays: 0, problem: "My laptop will not start after a Windows update. It restarts again and again and never reaches the desktop." },
];

const ADDRESSES = {
  c1: "House 24, Road 7, Dhanmondi, Dhaka 1209",
  c2: "Flat 5B, Block C, Section 10, Mirpur, Dhaka 1216",
  c3: "House 8, Road 12, Block E, Banani, Dhaka 1213",
};

/* ----------------------------------------------------------------- helpers */

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Creates the account through BetterAuth. Resolves to "created" or "exists". */
async function signUp(person) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try {
      res = await fetch(`${AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: AUTH_URL },
        body: JSON.stringify({
          name: person.name,
          email: person.email,
          password: person.password,
          role: person.role === "technician" ? "technician" : "customer", // admin is set in the database below
        }),
      });
    } catch {
      die(
        `Could not reach the client at ${AUTH_URL}.\n` +
          "Start fixora-client first (npm run dev), or set SEED_AUTH_URL to your deployed client URL."
      );
    }

    if (res.ok) return "created";

    const body = await res.json().catch(() => ({}));
    if (String(body?.code || "").startsWith("USER_ALREADY_EXISTS")) return "exists";

    if (res.status === 429) {
      // BetterAuth rate-limits sign-ups in production. Wait as long as it asks, then try again.
      const wait = (Number(res.headers.get("x-retry-after")) || 10) + 1;
      console.log(`    rate limited, waiting ${wait}s...`);
      await sleep(wait * 1000);
      continue;
    }
    die(`Sign-up failed for ${person.email}: ${res.status} ${JSON.stringify(body)}`);
  }
  die(`Sign-up kept being rate limited for ${person.email}. Wait a minute and run the seed again.`);
}

const midnightUtc = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** statusHistory for a booking, with believable gaps between the steps. */
function buildHistory(b, created) {
  const at = (ms) => new Date(created.getTime() + ms);
  const history = [{ status: "requested", changedAt: created }];
  let paidAt = null;

  if (b.status === "rejected") history.push({ status: "rejected", changedAt: at(4 * HOUR) });
  if (b.status === "cancelled") history.push({ status: "cancelled", changedAt: at(2 * HOUR) });
  if (["accepted", "in-progress", "completed"].includes(b.status)) history.push({ status: "accepted", changedAt: at(3 * HOUR) });
  if (["in-progress", "completed"].includes(b.status)) history.push({ status: "in-progress", changedAt: at(DAY + 2 * HOUR) });
  if (b.status === "completed") {
    history.push({ status: "completed", changedAt: at(2 * DAY + 5 * HOUR) });
    if (b.paid) {
      paidAt = at(2 * DAY + 11 * HOUR);
      history.push({ status: "paid", changedAt: paidAt });
    }
  }
  return { history, paidAt, updatedAt: history[history.length - 1].changedAt };
}

/* -------------------------------------------------------------------- main */

console.log(`Seeding Fixora (accounts via ${AUTH_URL})\n`);
const db = await connectDB();
const users = db.collection("users");

// 1. Accounts
console.log("1/4  Accounts");
const byKey = {};
for (const person of PEOPLE) {
  const email = person.email.toLowerCase();
  const exists = await users.findOne({ email }, { projection: { _id: 1 } });
  const result = exists ? "exists" : await signUp(person);
  console.log(`     ${result === "created" ? "+" : "="} ${person.role.padEnd(10)} ${email}`);
  if (result === "created") await sleep(1200); // stay well under the sign-up rate limit

  // Role, profile details and a verified email are set directly in the database
  const set = { role: person.role, emailVerified: true, phone: person.phone, area: person.area, bio: person.bio, updatedAt: new Date() };
  const done = await users.updateOne({ email }, { $set: set });
  if (!done.matchedCount) die(`Could not find ${email} in the database after sign-up. Check that DB_NAME matches the client's database.`);

  byKey[person.key] = await users.findOne({ email });
}

// 2. Clear the previous seed run (people's real data has no seed flag and is never touched)
console.log("2/4  Clearing the previous seed data");
for (const name of ["payments", "bookings", "services"]) {
  const r = await db.collection(name).deleteMany({ seed: true });
  if (r.deletedCount) console.log(`     removed ${r.deletedCount} ${name}`);
}

// 3. Services
console.log("3/4  Services");
const admin = byKey.admin;
const serviceDocs = [];
const everyService = [
  ...SERVICES.map((s) => ({ ...s, approvalStatus: "approved" })),
  ...EXTRA_SERVICES,
];
for (let i = 0; i < everyService.length; i++) {
  const s = everyService[i];
  const tech = byKey[s.tech];
  const image = s.image ?? FALLBACK_IMAGE;
  const createdAt = ago(175 - i * 9);

  serviceDocs.push({
    title: s.title,
    category: s.category,
    description: s.description,
    image,
    basePrice: s.basePrice,
    estimatedDuration: s.estimatedDuration,
    serviceMode: s.serviceMode,
    serviceArea: s.serviceArea,
    technicianName: tech.name,
    technicianEmail: tech.email,
    approvalStatus: s.approvalStatus,
    isAvailable: true,
    createdAt,
    ...(s.approvalStatus === "pending" ? {} : { reviewedAt: new Date(createdAt.getTime() + 6 * HOUR), reviewedBy: admin.email }),
    seed: true,
  });
}
const inserted = await db.collection("services").insertMany(serviceDocs);
const services = serviceDocs.map((doc, i) => ({ ...doc, _id: inserted.insertedIds[i] }));
console.log(`     ${services.length} services (${SERVICES.length} approved, ${EXTRA_SERVICES.length} waiting for review)`);

// 4. Bookings, payments and reviews
console.log("4/4  Bookings, payments and reviews");
const bookingDocs = [];
const paymentSeeds = [];

BOOKINGS.forEach((b, index) => {
  const service = services[b.s];
  const customer = byKey[b.c];
  const created = ago(b.ageDays, -(index % 5) * HOUR); // small offsets so the order is stable
  const { history, paidAt, updatedAt } = buildHistory(b, created);
  const completed = b.status === "completed";

  bookingDocs.push({
    serviceId: String(service._id),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    address: ADDRESSES[b.c],
    preferredDate: midnightUtc(new Date(created.getTime() + 3 * DAY)),
    problemDescription: b.problem,
    status: b.status,
    finalAmount: completed ? b.finalAmount : service.basePrice,
    paymentStatus: b.paid ? "paid" : "unpaid",
    statusHistory: history,
    createdAt: created,
    updatedAt,
    ...(paidAt ? { paidAt } : {}),
    ...(b.review ? { review: { ...b.review, createdAt: new Date((paidAt ?? updatedAt).getTime() + DAY) } } : {}),
    seed: true,
  });
  if (b.paid) paymentSeeds.push({ index, paidAt });
});

const bookingResult = await db.collection("bookings").insertMany(bookingDocs);

const paymentDocs = paymentSeeds.map(({ index, paidAt }, n) => {
  const booking = bookingDocs[index];
  return {
    bookingId: String(bookingResult.insertedIds[index]),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: booking.finalAmount,
    currency: "usd",
    transactionId: `pi_seed_${String(n + 1).padStart(4, "0")}`,
    stripeSessionId: `cs_test_seed_${String(n + 1).padStart(4, "0")}`,
    paymentStatus: "paid",
    paidAt,
    seed: true,
  };
});
if (paymentDocs.length) await db.collection("payments").insertMany(paymentDocs);

const counts = {};
for (const b of bookingDocs) counts[b.status] = (counts[b.status] ?? 0) + 1;
const reviewCount = bookingDocs.filter((b) => b.review).length;
const revenue = paymentDocs.reduce((sum, p) => sum + p.amount, 0);
console.log(`     ${bookingDocs.length} bookings: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}`);
console.log(`     ${paymentDocs.length} payments ($${revenue} revenue), ${reviewCount} reviews`);

/* ------------------------------------------------------------- credentials */

console.log("\nDone. Sign in with:\n");
console.log("  Role         Email                              Password");
console.log("  -----------  ---------------------------------  -----------");
for (const p of PEOPLE) {
  console.log(`  ${p.role.padEnd(11)}  ${p.email.padEnd(33)}  ${p.password}`);
}
console.log("\nAccounts that already existed keep their old password.\n");
process.exit(0);
