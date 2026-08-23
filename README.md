# KickVault — Vendor Consignment Portal

Take-home assignment implementation: a scoped-down but working B2B vendor
consignment portal for a fictional sneaker & streetwear business
("KickVault"), with two roles — external **vendors** and internal **admins**.

> **All data in this project is dummy/fictional**, per the assignment brief.
> Every external service (KYC, cloud storage, spreadsheet sync) is mocked —
> no real third-party provider is integrated and no real credentials exist
> anywhere in this repository.

## 1. Project overview

Vendors register, complete a mock KYC step, manage their sneaker listings
(including CSV/JSON bulk upload), sign Material Receiving Notes (MRNs),
view invoices, and request price changes. Admins log in separately, review
and price all vendor inventory, walk listings through the status lifecycle,
create MRNs and invoices (with PDF downloads for both), respond to
price-change requests, and see a dashboard with totals and a sold-value
chart. Every workflow is backed by role guards — vendors can only ever see
and act on their own records.

## 2. Tech stack

| Layer     | Choice |
| --------- | ------ |
| Backend   | Node.js 22.13+, Express 5 (REST/JSON API), CommonJS |
| Database  | SQLite via Node's built-in `node:sqlite` module (file-based, zero native deps) |
| Auth      | JWT (12h expiry), bcryptjs password hashing, per-role route guards, login rate limiting |
| Frontend  | React 18 SPA (Vite), react-router, Recharts for the dashboard chart, hand-rolled CSS |
| PDF       | pdfkit — generated locally on demand, streamed to the client |
| Tests     | node:test + supertest (33 API tests) |

## 3. Architecture overview

```
server/                      Express API
├── src/
│   ├── index.js             entry point
│   ├── app.js               app wiring: JSON/CSV parsing, routes, 404, error handler
│   ├── config.js            env loading (fails fast if JWT_SECRET is missing)
│   ├── db.js                node:sqlite connection, schema, transaction + id helpers
│   ├── middleware/          auth.js (JWT + role guards), rateLimit.js (login limiter)
│   ├── routes/              auth, kyc, shoes, adminShoes, adminVendors, mrn,
│   │                        invoices, priceRequests, dashboard
│   ├── services/pdf.js      pdfkit layout + MRN/invoice PDF generation
│   └── utils/csv.js         small CSV parser (bulk upload)
├── seed.js                  loads the assignment's dummy data (idempotent)
├── tests/                   automated API test suite
└── data/                    stock_sync.csv (assignment), sample bulk-upload files

client/                      React 18 SPA (Vite dev server proxies /api → :4000)
└── src/
    ├── auth.jsx             auth context (token storage, session restore, guards)
    ├── api.js               fetch wrapper + authenticated PDF download helper
    ├── components/          Layout (role-aware nav), RequireRole, StatusBadge
    └── pages/               Login, Register, vendor/* and admin/* pages
```

Single API process, single SQLite file, no external services. The React dev
server proxies `/api/*` to the backend, so no CORS setup is needed.

## 4. Setup steps

Requires **Node.js 22.13 or newer** (current LTS or later — see §14).

```bash
git clone <this repo>

# Backend
cd server
npm install
cp .env.example .env        # then set your own JWT_SECRET
npm run seed
npm start                   # API on http://localhost:4000

# Frontend (separate terminal)
cd client
npm install
npm run dev                 # SPA on http://localhost:5173
```

Open http://localhost:5173 and log in with any account from §11.

## 5. Environment variables

| Variable        | Purpose                                            | Default |
| --------------- | -------------------------------------------------- | ------- |
| `PORT`          | API port                                           | `4000`  |
| `JWT_SECRET`    | JWT signing secret — **required**, never committed | —       |
| `DATABASE_PATH` | SQLite file path                                    | `./data/kickvault.db` |
| `CRON_SECRET`   | Shared secret for `POST /cron/sync` (`x-cron-secret` header); sync returns 503 if unset | — |

The server refuses to start without `JWT_SECRET` and prints the fix
(`cp .env.example .env`). No secrets are committed; reviewers run with their
own `.env`.

## 6. .env.example

Provided at `server/.env.example`. Copy it to `server/.env` and set a value
for `JWT_SECRET`.

## 7. Database setup

None. SQLite is file-based and the schema is created automatically on first
start (or on seeding). Delete `server/data/kickvault.db` at any time to start
fresh — reseeding also fully resets the data.

## 8. Seed command

```bash
cd server && npm run seed
```

Loads exactly the dummy data from the assignment: the three users, listings
SHOE-1001/1002/1003, MRN-2001 (awaiting signature, 2 items), invoice INV-3001
(draft, 12% commission), and price request PR-4001 (pending). Idempotent —
re-running resets the database to this state.

## 9. Run the backend

```bash
cd server && npm start      # or: npm run dev (auto-restart on change)
npm test                    # 33 API tests (auth, KYC, inventory, MRN, invoices,
                            # price requests, dashboards)
```

## 10. Run the frontend

```bash
cd client && npm run dev    # http://localhost:5173
```

## 11. Test login credentials

Password for all: `Passw0rd!`

| Role   | Email                 | Notes                         |
| ------ | --------------------- | ----------------------------- |
| Admin  | admin@kickvault.test  |                               |
| Vendor | vendor1@example.test  | Alpha Kicks Co — `active`     |
| Vendor | vendor2@example.test  | Beta Soles Co — `pending_kyc` (its PAN `ZZZZZ9999Z` passes the mock KYC) |

To try bulk upload, use `server/data/sample-bulk-listings.csv` or `.json`.

## 12. API overview

All routes are JSON over REST; protected routes take `Authorization: Bearer <token>`.

```
Auth        POST /auth/vendor/register · POST /auth/vendor/login ·
            POST /auth/admin/login (both logins rate-limited) · GET /me
KYC (mock)  POST /kyc/verify            PAN regex ^[A-Z]{5}[0-9]{4}[A-Z]$ →
                                        verified true/false; true → vendor active
Inventory   GET /shoes                  vendor: own · admin: all (with vendor identity)
            POST /shoes · PATCH /shoes/:id · DELETE /shoes/:id     vendor, own only
            POST /shoes/bulk            JSON array or text/csv; all-or-nothing
            POST /admin/shoes/:id/price · POST /admin/shoes/:id/status
                                        status ∈ submitted/priced/live/sold/returned
MRN         POST /mrn (admin) · GET /mrn · GET /mrn/:id · POST /mrn/:id/sign
            GET /mrn/:id/pdf            signed MRNs only
Invoices    POST /invoices (admin) · GET /invoices · GET /invoices/:id
            POST /invoices/:id/send · POST /invoices/:id/cancel
            GET /invoices/:id/pdf
Price reqs  POST /price-requests (vendor) · GET /price-requests
            POST /admin/price-requests/:id/respond   { action: approve | reject }
Chat        GET/POST /chat/:vendorId/messages        per-vendor thread; vendors
                                                     reach only their own thread
Returns     POST /return-requests (vendor) · GET /return-requests
            POST /admin/return-requests/:id/respond  { action: approve | reject }
Notifs      GET /notifications (own, latest 50 + unread count)
            POST /notifications/read (mark all read)
Stock sync  POST /cron/sync             header: x-cron-secret (no JWT) — reads
                                        server/data/stock_sync.csv
Payments    GET /payments/summary       vendor: own summary · admin: per vendor
Dashboards  GET /dashboard/vendor · GET /dashboard/admin
Misc        GET /admin/vendors (admin) · GET /health
```

## 13. PDF behavior

Both PDFs are generated locally with pdfkit and streamed as
`application/pdf` attachments — nothing is stored on disk, no external
document provider is used.

- **MRN PDF** (`GET /mrn/:id/pdf`): MRN id, status, created date, vendor
  (name/business/email), received items (SKU, item, qty), and the e-signature
  block (signed by + timestamp). Available only once the MRN is signed, since
  the assignment's PDF represents the *signed* MRN.
- **Invoice PDF** (`GET /invoices/:id/pdf`): invoice id, status, vendor,
  line items (SKU, item, qty sold, unit price, line total), commission
  percentage, and totals (gross, commission, net payable).

The e-signature is the assignment-specified checkbox + typed name + server
timestamp — no signature provider.

## 14. Decisions / trade-offs

- **SQLite via built-in `node:sqlite`.** The assignment allows any simple
  database; SQLite gives reviewers zero setup. The built-in module (instead
  of a native driver like `better-sqlite3`) means `npm install` needs no C++
  toolchain — native SQLite drivers fail on Windows without Visual Studio
  Build Tools. This raises the minimum Node version to 22.13 (where
  `node:sqlite` is available unflagged); Node may print a harmless
  "SQLite is an experimental feature" warning at startup.
- **Human-readable primary keys** (`SHOE-1001`, `MRN-2001`, `INV-3001`,
  `PR-4001`) so seeded records match the dummy data verbatim; new records
  continue the sequences.
- **"Sold" derives from invoices.** The assignment doesn't specify the action
  that marks items sold, so no extra "mark sold" feature was invented:
  sold count / sold value are computed from invoice lines of non-cancelled
  invoices, and the admin sets a listing's status to `sold` via the required
  status-change action.
- **Pending payments** (vendor dashboard) = net payable (gross minus
  commission) of the vendor's `draft` + `sent` invoices — there is no "paid"
  status in the assignment's lifecycle.
- **Lifecycles enforced minimally, statuses exactly as specified.** Listing
  status changes validate against the five assignment statuses without an
  invented transition graph. Invoices: `send` requires `draft`; `cancel` is
  allowed from `draft` or `sent`; everything else is rejected.
- **`pending_kyc` vendors are not restricted** — the assignment defines
  `pending_kyc → active` as a lifecycle, not a permission model, so no
  additional gating was invented. KYC accepts a PAN in the request body or
  falls back to the PAN stored at registration.
- **MRN/invoice items reference the vendor's listing SKUs** and MRN creation
  does not mutate stock (the assignment doesn't require it).
- **Prices are plain numbers** — the assignment gives numeric values with no
  currency, so none is assumed.
- **No websockets, no ORM, no Docker** — smallest stack that satisfies the
  requirements cleanly.

## 15. Bonus features implemented

- **Vendor ↔ admin chat** — two-way messaging with one thread per vendor.
  Vendors chat from *Chat* in their nav; admins pick a vendor thread on the
  admin *Chat* page. The thread polls every 5 seconds — deliberately no
  websocket infrastructure, per the brief's "keep it simple" guidance.

- **Return requests** — a vendor raises a return for one of their listings
  (quantity + optional reason); the admin approves or rejects it. Responding
  changes only the request status — the assignment specifies no further
  effect.
- **Notifications** — per-user in-app notifications behind the bell icon in
  the top bar (unread badge, opens a panel, opening marks all read). Events:
  vendors are notified on pricing, status changes, MRN creation, invoice
  creation/send/cancel, and price/return request responses; admins are
  notified on MRN signatures and new price/return requests. Polls every 15s.

- **Scheduled stock/sold sync (mock)** — `server/data/stock_sync.csv` (the
  brief's mock "spreadsheet") is read and each matching listing's stock (`qty`)
  and sold (`soldQty`) quantities are updated. No Google Sheets/Drive — the
  CSV file is the mock. Two ways to run it:

  ```bash
  # via the protected endpoint (schedule with OS cron / Task Scheduler)
  curl -X POST http://localhost:4000/cron/sync -H "x-cron-secret: <your CRON_SECRET>"

  # or directly as a script
  cd server && npm run sync
  ```

  The endpoint is guarded by the `x-cron-secret` header (503 when
  `CRON_SECRET` isn't configured, 401 on a wrong secret). The response reports
  updated listings, unknown SKUs, and invalid rows. Sold/stock columns are
  visible on the listing tables.
- **Payment summary** — per vendor: sold quantity × settlement price (invoice
  unit price), minus the invoice's commission percentage, across non-cancelled
  invoices. Vendors see their own summary on the *Payments* page; admins see a
  per-vendor table.

## 16. Known limitations / unimplemented bonus features

- Bonus features not implemented: document upload, live deploy.
- The stock sync is triggered on demand (endpoint or script); actual
  scheduling is left to OS cron / Task Scheduler rather than an in-process
  scheduler, keeping the server dependency-free.
- Chat updates by polling (5s), so messages can take a few seconds to appear
  on the other side.
- JWTs are stateless with a 12h expiry; there is no refresh token or logout
  blacklist (out of scope for the brief).
- The login rate limiter is in-memory (per process) — appropriate for this
  scope; a shared store would be needed behind multiple instances.
- Currency is displayed as plain numbers (see §14).
- Vendor bulk upload expects the documented CSV header exactly
  (`brand,model,size,sku,condition,askingPrice,qty`).