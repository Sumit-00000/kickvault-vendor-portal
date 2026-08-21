const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('vendor creates a request only for their own listing', async () => {
  const ok = await request(app)
    .post('/price-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1001', requestedPrice: 18000 });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.request.status, 'pending');

  const notOwn = await request(app)
    .post('/price-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1003', requestedPrice: 1 });
  assert.equal(notOwn.status, 404);

  const badPrice = await request(app)
    .post('/price-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1001', requestedPrice: 0 });
  assert.equal(badPrice.status, 400);
});

test('lists are role-scoped', async () => {
  const v2 = await request(app).get('/price-requests').set(auth(vendor2));
  assert.deepEqual(v2.body.requests.map((r) => r.id), ['PR-4001']);

  const all = await request(app).get('/price-requests').set(auth(admin));
  assert.equal(all.body.requests.length, 2);
});

test('approve updates the listing admin price; reject leaves it unchanged', async () => {
  // Approve seeded PR-4001 (SHOE-1003: 9500 -> 10500)
  const approved = await request(app)
    .post('/admin/price-requests/PR-4001/respond')
    .set(auth(admin))
    .send({ action: 'approve' });
  assert.equal(approved.body.request.status, 'approved');

  const shoes = await request(app).get('/shoes').set(auth(admin));
  assert.equal(shoes.body.shoes.find((s) => s.id === 'SHOE-1003').adminPrice, 10500);

  // Responding twice is refused
  const again = await request(app)
    .post('/admin/price-requests/PR-4001/respond')
    .set(auth(admin))
    .send({ action: 'reject' });
  assert.equal(again.status, 400);

  // Reject PR-4002 (SHOE-1001 requested 18000) — price stays 17500
  const rejected = await request(app)
    .post('/admin/price-requests/PR-4002/respond')
    .set(auth(admin))
    .send({ action: 'reject' });
  assert.equal(rejected.body.request.status, 'rejected');

  const after = await request(app).get('/shoes').set(auth(admin));
  assert.equal(after.body.shoes.find((s) => s.id === 'SHOE-1001').adminPrice, 17500);
});

test('respond validation and access control', async () => {
  const fresh = await request(app)
    .post('/price-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1002', requestedPrice: 23000 });
  const id = fresh.body.request.id;

  const badAction = await request(app)
    .post(`/admin/price-requests/${id}/respond`)
    .set(auth(admin))
    .send({ action: 'maybe' });
  assert.equal(badAction.status, 400);

  const asVendor = await request(app)
    .post(`/admin/price-requests/${id}/respond`)
    .set(auth(vendor1))
    .send({ action: 'approve' });
  assert.equal(asVendor.status, 403);

  const unknown = await request(app)
    .post('/admin/price-requests/PR-9999/respond')
    .set(auth(admin))
    .send({ action: 'approve' });
  assert.equal(unknown.status, 404);
});
