const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('vendor sees their own payment summary', async () => {
  const res = await request(app).get('/payments/summary').set(auth(vendor1));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.summary, {
    soldQty: 1,
    gross: 17500,
    commission: 2100,
    netPayable: 15400,
  });

  const empty = await request(app).get('/payments/summary').set(auth(vendor2));
  assert.deepEqual(empty.body.summary, {
    soldQty: 0,
    gross: 0,
    commission: 0,
    netPayable: 0,
  });
});

test('admin sees the summary per vendor', async () => {
  const res = await request(app).get('/payments/summary').set(auth(admin));
  assert.equal(res.body.summaries.length, 2);
  const v1 = res.body.summaries.find((s) => s.vendorName === 'Vendor One');
  assert.equal(v1.soldQty, 1);
  assert.equal(v1.netPayable, 15400);
  const v2 = res.body.summaries.find((s) => s.vendorName === 'Vendor Two');
  assert.equal(v2.netPayable, 0);
});

test('cancelled invoices are excluded from the summary', async () => {
  await request(app).post('/invoices/INV-3001/cancel').set(auth(admin));
  const res = await request(app).get('/payments/summary').set(auth(vendor1));
  assert.deepEqual(res.body.summary, {
    soldQty: 0,
    gross: 0,
    commission: 0,
    netPayable: 0,
  });
});

test('summary requires authentication', async () => {
  assert.equal((await request(app).get('/payments/summary')).status, 401);
});