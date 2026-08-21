const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

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

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function nextId(table, prefix, start) {
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, ?) AS INTEGER)) AS maxNum FROM ${table}`
    )
    .get(prefix.length + 2);
  const num = row && row.maxNum ? row.maxNum + 1 : start;
  return `${prefix}-${num}`;
}

module.exports = { db, transaction, nextId };
