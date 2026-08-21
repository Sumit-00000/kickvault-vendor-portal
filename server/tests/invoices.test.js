const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth, binaryParser } = require('./helpers');

let vendor1, vendor2, admin, vendor1Id;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
  vendor1Id = (await request(app).get('/me').set(auth(vendor1))).body.user.id;
});

test('seeded invoice computes the assignment totals', async () => {
  const res = await request(app).get('/invoices').set(auth(vendor1));
  const inv = res.body.invoices.find((i) => i.id === 'INV-3001');
  assert.equal(inv.status, 'draft');
  assert.equal(inv.totals.gross, 17500);
  assert.equal(inv.totals.commission, 2100);
  assert.equal(inv.totals.net, 15400);
});

test('admin creates invoices with validated lines', async () => {
  const created = await request(app)
    .post('/invoices')
    .set(auth(admin))
    .send({
      vendorId: vendor1Id,
      commissionPct: 10,
      lines: [{ sku: 'YZY-ZEB-10', qtySold: 1, unitPrice: 22000 }],
    });
  assert.equal(created.status, 201);
  assert.equal(created.body.invoice.status, 'draft');
  assert.equal(created.body.invoice.totals.net, 19800);

  const foreignSku = await request(app)
    .post('/invoices')
    .set(auth(admin))
    .send({
      vendorId: vendor1Id,
      commissionPct: 10,
      lines: [{ sku: 'NB550-WG-8', qtySold: 1, unitPrice: 9500 }],
    });
  assert.equal(foreignSku.status, 400);

  const badPct = await request(app)
    .post('/invoices')
    .set(auth(admin))
    .send({
      vendorId: vendor1Id,
      commissionPct: 150,
      lines: [{ sku: 'YZY-ZEB-10', qtySold: 1, unitPrice: 1 }],
    });
  assert.equal(badPct.status, 400);

  const asVendor = await request(app).post('/invoices').set(auth(vendor1)).send({});
  assert.equal(asVendor.status, 403);
});

test('invoice access is role-scoped', async () => {
  const v2 = await request(app).get('/invoices').set(auth(vendor2));
  assert.equal(v2.body.invoices.length, 0);

  const crossDetail = await request(app).get('/invoices/INV-3001').set(auth(vendor2));
  assert.equal(crossDetail.status, 404);

  const crossPdf = await request(app).get('/invoices/INV-3001/pdf').set(auth(vendor2));
  assert.equal(crossPdf.status, 404);
});

test('lifecycle draft -> sent -> cancelled with invalid transitions rejected', async () => {
  const sent = await request(app).post('/invoices/INV-3001/send').set(auth(admin));
  assert.equal(sent.body.invoice.status, 'sent');

  const resend = await request(app).post('/invoices/INV-3001/send').set(auth(admin));
  assert.equal(resend.status, 400);

  const cancelled = await request(app).post('/invoices/INV-3001/cancel').set(auth(admin));
  assert.equal(cancelled.body.invoice.status, 'cancelled');

  const recancel = await request(app).post('/invoices/INV-3001/cancel').set(auth(admin));
  assert.equal(recancel.status, 400);

  const sendCancelled = await request(app).post('/invoices/INV-3001/send').set(auth(admin));
  assert.equal(sendCancelled.status, 400);

  const vendorSend = await request(app).post('/invoices/INV-3002/send').set(auth(vendor1));
  assert.equal(vendorSend.status, 403);
});

test('invoice PDF downloads with required content-type', async () => {
  const pdf = await request(app)
    .get('/invoices/INV-3001/pdf')
    .set(auth(vendor1))
    .buffer(true)
    .parse(binaryParser);
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.equal(pdf.body.slice(0, 4).toString(), '%PDF');
});
