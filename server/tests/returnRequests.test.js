const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('vendor raises a return request for their own listing', async () => {
  const ok = await request(app)
    .post('/return-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1001', qty: 1, reason: 'Not selling' });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.request.id, 'RR-5001');
  assert.equal(ok.body.request.status, 'pending');

  const notOwn = await request(app)
    .post('/return-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1003', qty: 1 });
  assert.equal(notOwn.status, 404);

  const badQty = await request(app)
    .post('/return-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1001', qty: 0 });
  assert.equal(badQty.status, 400);

  const asAdmin = await request(app)
    .post('/return-requests')
    .set(auth(admin))
    .send({ shoeId: 'SHOE-1001', qty: 1 });
  assert.equal(asAdmin.status, 403);
});

test('lists are role-scoped', async () => {
  const v2 = await request(app).get('/return-requests').set(auth(vendor2));
  assert.equal(v2.body.requests.length, 0);

  const v1 = await request(app).get('/return-requests').set(auth(vendor1));
  assert.equal(v1.body.requests.length, 1);

  const all = await request(app).get('/return-requests').set(auth(admin));
  assert.equal(all.body.requests.length, 1);
});

test('admin approves or rejects; pending only, once', async () => {
  const second = await request(app)
    .post('/return-requests')
    .set(auth(vendor1))
    .send({ shoeId: 'SHOE-1002', qty: 1 });
  const secondId = second.body.request.id;

  const approved = await request(app)
    .post('/admin/return-requests/RR-5001/respond')
    .set(auth(admin))
    .send({ action: 'approve' });
  assert.equal(approved.body.request.status, 'approved');

  const again = await request(app)
    .post('/admin/return-requests/RR-5001/respond')
    .set(auth(admin))
    .send({ action: 'reject' });
  assert.equal(again.status, 400);

  const rejected = await request(app)
    .post(`/admin/return-requests/${secondId}/respond`)
    .set(auth(admin))
    .send({ action: 'reject' });
  assert.equal(rejected.body.request.status, 'rejected');

  const badAction = await request(app)
    .post('/admin/return-requests/RR-5001/respond')
    .set(auth(admin))
    .send({ action: 'maybe' });
  assert.equal(badAction.status, 400);

  const asVendor = await request(app)
    .post('/admin/return-requests/RR-5001/respond')
    .set(auth(vendor1))
    .send({ action: 'approve' });
  assert.equal(asVendor.status, 403);

  const unknown = await request(app)
    .post('/admin/return-requests/RR-9999/respond')
    .set(auth(admin))
    .send({ action: 'approve' });
  assert.equal(unknown.status, 404);
});
