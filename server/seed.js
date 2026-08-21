// Seed script — loads the exact dummy data supplied by the assignment so
// reviewers can log in and click around immediately. Idempotent: re-running
// clears all tables and re-inserts the dummy data.
const bcrypt = require('bcryptjs');
const { db } = require('./src/db');

const PASSWORD = 'Passw0rd!'; // dummy password from the assignment brief

const users = [
  { role: 'admin', email: 'admin@kickvault.test', name: 'Admin User' },
  {
    role: 'vendor',
    email: 'vendor1@example.test',
    name: 'Vendor One',
    businessName: 'Alpha Kicks Co',
    pan: 'AAAAA0000A',
    status: 'active',
  },
  {
    role: 'vendor',
    email: 'vendor2@example.test',
    name: 'Vendor Two',
    businessName: 'Beta Soles Co',
    pan: 'ZZZZZ9999Z',
    status: 'pending_kyc',
  },
];

const shoes = [
  {
    id: 'SHOE-1001',
    vendorEmail: 'vendor1@example.test',
    brand: 'Nike',
    model: 'Air Jordan 1 High Chicago',
    size: 'US 9',
    sku: 'AJ1-CHI-9',
    condition: 'New',
    askingPrice: 18999,
    adminPrice: 17500,
    qty: 2,
    status: 'live',
  },
  {
    id: 'SHOE-1002',
    vendorEmail: 'vendor1@example.test',
    brand: 'Adidas',
    model: 'Yeezy Boost 350 V2 Zebra',
    size: 'US 10',
    sku: 'YZY-ZEB-10',
    condition: 'New',
    askingPrice: 22999,
    adminPrice: null,
    qty: 1,
    status: 'submitted',
  },
  {
    id: 'SHOE-1003',
    vendorEmail: 'vendor2@example.test',
    brand: 'New Balance',
    model: '550 White Green',
    size: 'US 8',
    sku: 'NB550-WG-8',
    condition: 'Used - Good',
    askingPrice: 9999,
    adminPrice: 9500,
    qty: 3,
    status: 'priced',
  },
];

const mrn = {
  id: 'MRN-2001',
  vendorEmail: 'vendor1@example.test',
  createdByEmail: 'admin@kickvault.test',
  items: [
    { sku: 'AJ1-CHI-9', qty: 2 },
    { sku: 'YZY-ZEB-10', qty: 1 },
  ],
  status: 'awaiting_signature',
  signedBy: null,
  signedAt: null,
};

const invoice = {
  id: 'INV-3001',
  vendorEmail: 'vendor1@example.test',
  lines: [{ sku: 'AJ1-CHI-9', qtySold: 1, unitPrice: 17500 }],
  commissionPct: 12,
  status: 'draft',
};

const priceRequest = {
  id: 'PR-4001',
  shoeId: 'SHOE-1003',
  vendorEmail: 'vendor2@example.test',
  requestedPrice: 10500,
  status: 'pending',
};

const seed = db.transaction(() => {
  // Clear tables in FK-safe order
  for (const table of [
    'invoice_lines',
    'invoices',
    'mrn_items',
    'mrns',
    'price_requests',
    'shoes',
    'users',
  ]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  const idByEmail = {};

  const insertUser = db.prepare(`
    INSERT INTO users (role, email, name, passwordHash, businessName, pan, status)
    VALUES (@role, @email, @name, @passwordHash, @businessName, @pan, @status)
  `);
  for (const u of users) {
    const info = insertUser.run({
      businessName: null,
      pan: null,
      status: null,
      ...u,
      passwordHash,
    });
    idByEmail[u.email] = info.lastInsertRowid;
  }

  const insertShoe = db.prepare(`
    INSERT INTO shoes (id, vendorId, brand, model, size, sku, condition,
                       askingPrice, adminPrice, qty, status)
    VALUES (@id, @vendorId, @brand, @model, @size, @sku, @condition,
            @askingPrice, @adminPrice, @qty, @status)
  `);
  for (const s of shoes) {
    insertShoe.run({ ...s, vendorId: idByEmail[s.vendorEmail] });
  }

  db.prepare(`
    INSERT INTO mrns (id, vendorId, createdBy, status, signedBy, signedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    mrn.id,
    idByEmail[mrn.vendorEmail],
    idByEmail[mrn.createdByEmail],
    mrn.status,
    mrn.signedBy,
    mrn.signedAt
  );
  const insertMrnItem = db.prepare(
    'INSERT INTO mrn_items (mrnId, sku, qty) VALUES (?, ?, ?)'
  );
  for (const item of mrn.items) {
    insertMrnItem.run(mrn.id, item.sku, item.qty);
  }

  db.prepare(`
    INSERT INTO invoices (id, vendorId, commissionPct, status)
    VALUES (?, ?, ?, ?)
  `).run(
    invoice.id,
    idByEmail[invoice.vendorEmail],
    invoice.commissionPct,
    invoice.status
  );
  const insertLine = db.prepare(
    'INSERT INTO invoice_lines (invoiceId, sku, qtySold, unitPrice) VALUES (?, ?, ?, ?)'
  );
  for (const line of invoice.lines) {
    insertLine.run(invoice.id, line.sku, line.qtySold, line.unitPrice);
  }

  db.prepare(`
    INSERT INTO price_requests (id, shoeId, vendorId, requestedPrice, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    priceRequest.id,
    priceRequest.shoeId,
    idByEmail[priceRequest.vendorEmail],
    priceRequest.requestedPrice,
    priceRequest.status
  );
});

seed();

console.log('Seed complete. Test logins (password for all: Passw0rd!):');
console.log('  admin:  admin@kickvault.test');
console.log('  vendor: vendor1@example.test (active)');
console.log('  vendor: vendor2@example.test (pending_kyc)');
