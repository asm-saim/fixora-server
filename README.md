# Fixora - Backend API

A RESTful backend API for **Fixora**, a smart device and home appliance repair platform. Customers can book verified technicians, track repair progress, and pay securely after service completion.

- **Client repo:** `https://github.com/asm-saim/fixora-client`
- **Live site:** `https://fixora-v1.vercel.app/`

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fixora.com` | `Admin1234` |
| Technician | `rahim.tech@example.com` | `Fixora123` |
| Customer | `ayesha.customer@example.com` | `Fixora123` |

Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Key features

- **Auth:** BetterAuth runs in the client. Express verifies the JWT against the client's JWKS endpoint, then loads the user and role **from the database** (never trusted from the token).
- **Role middleware:** `verifyToken` (401), `verifyCustomer`, `verifyTechnician`, `verifyAdmin` (403). Ownership checks always use the email from the token.
- **Services:** technician CRUD, approval workflow (edits reset to pending), separate availability toggle, public listing with search, category, mode, sort and pagination done in MongoDB.
- **Bookings:** duplicate active-request guard (409, also enforced by a partial unique index), date and description validation, cancel only while `requested`, and a server-enforced status pipeline: `requested → accepted | rejected`, `accepted → in-progress`, `in-progress → completed` (requires `finalAmount > 0`). Status history is stored for the timeline tracker.
- **Payments:** Stripe Checkout for completed, unpaid bookings owned by the caller. Payment is recorded by both the success-page verification and the signed webhook, and is idempotent (unique indexes on `stripeSessionId` and `bookingId`).
- **Admin and stats:** user role management (admins cannot change their own role), service approval, all bookings, transactions, and per-role dashboard stats.
- **Extras:** reviews and ratings, job timeline, server-side pagination.
- **Hardening:** helmet, env-based CORS allow-list, global error handler (no stack leaks in production), 404 handler, cached DB connection for serverless.

## Tech and npm packages

Node.js, Express 5, MongoDB (native driver)

`express`, `mongodb`, `cors`, `helmet`, `morgan`, `jose` (JWT/JWKS verification), `stripe`, `multer` (image upload), `dotenv`, `nodemon` (dev)

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `DB_NAME` | no | Database name (default `fixora`) |
| `CLIENT_URLS` | yes | Comma-separated allowed origins for CORS, no trailing slash |
| `CLIENT_URL` | no | Stripe return URL base (defaults to first `CLIENT_URLS` entry) |
| `AUTH_JWKS_URL` | yes | `https://<client>/api/auth/jwks` |
| `AUTH_ISSUER` | yes | Must equal the client's `BETTER_AUTH_URL` exactly |
| `STRIPE_SECRET_KEY` | yes | Test-mode key (`sk_test_...`); live keys are refused |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret (`whsec_...`) of the webhook endpoint |
| `IMGBB_API_KEY` | yes | Image uploads |
| `NODE_ENV` | no | Set `production` on Vercel |

## Run locally

```bash
npm install
cp .env.example .env      # fill in the values
npm run dev               # http://localhost:5000
npm run seed              # demo data (client must be running)
```

Forward Stripe webhooks locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start for production |
| `npm run seed` | Admin, 3 technicians, 3 customers, 14+ approved services, bookings in every status with payments |
| `npm run db:indexes` | Create or refresh indexes |

## API overview

| Area | Endpoints |
| --- | --- |
| Health | `GET /`, `GET /api/health` |
| Services | `GET /api/services` (public, approved only, plus `GET /mine` for technicians), `?limit=6&sort=newest` powers the home page's featured list, `GET /api/services/:id`; technician: `POST`, `PATCH /:id`, `DELETE /:id`, availability toggle |
| Bookings | customer: `POST /api/bookings`, `GET /my`, `PATCH /:id/cancel`; technician: `GET /technician`, `PATCH /:id/status` |
| Payments | `POST /api/payments/create-checkout-session`, `GET /verify?session_id=`, `GET /my`, `POST /webhook` (Stripe-signed) |
| Admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `GET /api/admin/services`, `PATCH /api/admin/services/:id/approval`, `GET /api/admin/bookings`, `GET /api/admin/payments` |
| Stats | `GET /api/stats/customer`, `/technician`, `/admin` |
| Profile / upload | `GET /api/users/me`, `PATCH /api/users/profile`, `POST /api/upload`; reviews: `POST /api/bookings/:id/review` |

## Deploy to Vercel

1. Import this repo as a new Vercel project (`vercel.json` is included).
2. Add every variable from the table above in **Settings, Environment Variables**.
3. In MongoDB Atlas, allow network access from `0.0.0.0/0` (Vercel IPs are dynamic).
4. In the Stripe dashboard (test mode) add a webhook endpoint:
   `https://<your-server>.vercel.app/api/payments/webhook`
   with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
5. Add the client's production URL to `CLIENT_URLS`.