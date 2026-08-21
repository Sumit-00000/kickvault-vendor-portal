const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('vendor dashboard: inventory, sold count, pending payments', async () => {
  const res = await request(app).get('/dashboard/vendor').set(auth(vendor1));
  assert.equal(res.status, 200);
  assert.equal(res.body.shoes.length, 2);
  assert.equal(res.body.soldCount, 1); // INV-3001 line qtySold 1
  assert.equal(res.body.pendingPayments, 15400); // 17500 - 12%
});

test('admin dashboard: totals and chart series from real data', async () => {
  const res = await request(app).get('/dashboard/admin').set(auth(admin));
  assert.equal(res.body.totalVendors, 2);
  assert.equal(res.body.liveListings, 1);
  assert.equal(res.body.soldValue, 17500);
  assert.equal(res.body.soldOverTime.length, 1);
  assert.equal(res.body.soldOverTime[0].value, 17500);
  assert.match(res.body.soldOverTime[0].day, /^\d{4}-\d{2}-\d{2}$/);
});

test('dashboards are role-guarded', async () => {
  assert.equal(
    (await request(app).get('/dashboard/admin').set(auth(vendor1))).status,
    403
  );
  assert.equal(
    (await request(app).get('/dashboard/vendor').set(auth(admin))).status,
    403
  );
  assert.equal((await request(app).get('/dashboard/vendor')).status, 401);
});

test('cancelled invoices are excluded from all metrics', async () => {
  await request(app).post('/invoices/INV-3001/cancel').set(auth(admin));

  const vendor = await request(app).get('/dashboard/vendor').set(auth(vendor1));
  assert.equal(vendor.body.soldCount, 0);
  assert.equal(vendor.body.pendingPayments, 0);

  const adminDash = await request(app).get('/dashboard/admin').set(auth(admin));
  assert.equal(adminDash.body.soldValue, 0);
  assert.equal(adminDash.body.soldOverTime.length, 0);
});
