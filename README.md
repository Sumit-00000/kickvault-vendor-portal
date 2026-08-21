# KickVault — Vendor Consignment Portal

Take-home assignment implementation: a scoped-down B2B vendor consignment
portal for a fictional sneaker & streetwear business ("KickVault").

> All data in this project is dummy/fictional, per the assignment brief.
> Every external service (KYC, spreadsheet sync, storage) is mocked — no real
> third-party provider is integrated.

**Status: in progress.** This README will be completed alongside the
implementation. Current state: project scaffold, database schema, and seed
data.

## Tech stack

- **Backend:** Node.js 22.13+ (see note below), Express (REST/JSON API), CommonJS
- **Database:** SQLite via Node's built-in `node:sqlite` module (file-based — zero setup, zero native compilation for reviewers)
- **Auth:** JWT + bcrypt password hashing (in progress)
- **Frontend:** React 18 SPA (Vite, react-router)
- **PDF:** local generation (planned: pdfkit)

## Repository layout

```
server/   Express API, SQLite database, seed script
client/   React 18 SPA (Vite dev server proxies /api → backend)
```

## Setup

Requires **Node.js 22.13 or newer** (current LTS or later).

> **Decision/trade-off:** the assignment allows any simple database; SQLite was
> chosen for zero reviewer setup. The server uses Node's built-in `node:sqlite`
> module instead of a native-addon driver (e.g. `better-sqlite3`) so that
> `npm install` never needs a C++ toolchain — native SQLite drivers fail to
> install on Windows machines without Visual Studio Build Tools. This raises
> the minimum Node version from 18 to 22.13 (the version where `node:sqlite`
> became available without a flag). Node may print an "SQLite is an
> experimental feature" warning on startup; it is harmless.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env     # set your own JWT_SECRET
npm run seed             # loads the assignment's dummy data
npm start                # API on http://localhost:4000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev              # SPA on http://localhost:5173
```

## Environment variables

See `server/.env.example`:

| Variable        | Purpose                                   |
| --------------- | ----------------------------------------- |
| `PORT`          | API port (default 4000)                   |
| `JWT_SECRET`    | JWT signing secret — required, not committed |
| `DATABASE_PATH` | SQLite file path (default `./data/kickvault.db`) |

## Test logins (seeded)

Password for all: `Passw0rd!`

| Role   | Email                 | Notes                          |
| ------ | --------------------- | ------------------------------ |
| Admin  | admin@kickvault.test  |                                |
| Vendor | vendor1@example.test  | Alpha Kicks Co — `active`      |
| Vendor | vendor2@example.test  | Beta Soles Co — `pending_kyc`  |

The seed also loads listings SHOE-1001/1002/1003, MRN-2001, invoice INV-3001,
and price request PR-4001, exactly as given in the assignment. Re-running
`npm run seed` resets the database to this state.

_Sections to be added as implementation progresses: architecture overview,
API overview, PDF behavior, decisions/trade-offs, bonus features, known
limitations._
