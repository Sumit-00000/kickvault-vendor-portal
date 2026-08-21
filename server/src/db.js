const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Statuses and lifecycles come verbatim from the assignment:
//   vendor:  pending_kyc -> active
//   shoe:    submitted -> priced -> live -> sold / returned
//   mrn:     awaiting_signature -> signed (signing stores signedBy + signedAt)
//   invoice: draft -> sent -> cancelled
//   price request: pending -> approved / rejected
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT    NOT NULL CHECK (role IN ('admin', 'vendor')),
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  passwordHash  TEXT    NOT NULL,
  businessName  TEXT,
  pan           TEXT,
  status        TEXT    CHECK (status IN ('pending_kyc', 'active')),
  createdAt     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shoes (
  id           TEXT    PRIMARY KEY,
  vendorId     INTEGER NOT NULL REFERENCES users(id),
  brand        TEXT    NOT NULL,
  model        TEXT    NOT NULL,
  size         TEXT    NOT NULL,
  sku          TEXT    NOT NULL,
  condition    TEXT    NOT NULL,
  askingPrice  REAL    NOT NULL,
  adminPrice   REAL,
  qty          INTEGER NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'submitted'
               CHECK (status IN ('submitted', 'priced', 'live', 'sold', 'returned')),
  createdAt    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mrns (
  id         TEXT    PRIMARY KEY,
  vendorId   INTEGER NOT NULL REFERENCES users(id),
  createdBy  INTEGER NOT NULL REFERENCES users(id),
  status     TEXT    NOT NULL DEFAULT 'awaiting_signature'
             CHECK (status IN ('awaiting_signature', 'signed')),
  signedBy   TEXT,
  signedAt   TEXT,
  createdAt  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mrn_items (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  mrnId  TEXT    NOT NULL REFERENCES mrns(id),
  sku    TEXT    NOT NULL,
  qty    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id             TEXT    PRIMARY KEY,
  vendorId       INTEGER NOT NULL REFERENCES users(id),
  commissionPct  REAL    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'cancelled')),
  createdAt      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceId  TEXT    NOT NULL REFERENCES invoices(id),
  sku        TEXT    NOT NULL,
  qtySold    INTEGER NOT NULL,
  unitPrice  REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS price_requests (
  id              TEXT    PRIMARY KEY,
  shoeId          TEXT    NOT NULL REFERENCES shoes(id),
  vendorId        INTEGER NOT NULL REFERENCES users(id),
  requestedPrice  REAL    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  createdAt       TEXT    NOT NULL DEFAULT (datetime('now'))
);
`);

// Generates the next human-readable id for a table whose ids look like
// "SHOE-1001" / "MRN-2001" / "INV-3001" / "PR-4001", continuing the dummy-data
// sequences. `start` is used when the table is empty.
function nextId(table, prefix, start) {
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, ?) AS INTEGER)) AS maxNum FROM ${table}`
    )
    .get(prefix.length + 2); // skip "PREFIX-"
  const num = row && row.maxNum ? row.maxNum + 1 : start;
  return `${prefix}-${num}`;
}

module.exports = { db, nextId };
