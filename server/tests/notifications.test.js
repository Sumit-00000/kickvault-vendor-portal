const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('workflow events create per-user notifications', async () => {
  await request(app)
    .post('/admin/shoes/SHOE-1002/price')
    .set(auth(admin))
    .send({ adminPrice: 21000 });
  await request(app)
    .post('/admin/shoes/SHOE-1002/status')
    .set(auth(admin))
    .send({ status: 'priced' });
  await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(vendor1))
    .send({ accepted: true, name: 'Vendor One' });
  await request(app)
    .post('/admin/price-requests/PR-4001/respond')
    .set(auth(admin))
    .send({ action: 'approve' });

  const v1 = await request(app).get('/notifications').set(auth(vendor1));
  const v1Messages = v1.body.notifications.map((n) => n.message).join(' | ');
  assert.match(v1Messages, /SHOE-1002 was priced at 21000/);
  assert.match(v1Messages, /SHOE-1002 is now "priced"/);
  assert.equal(v1.body.unread >= 2, true);

  const v2 = await request(app).get('/notifications').set(auth(vendor2));
  assert.match(
    v2.body.notifications.map((n) => n.message).join(' | '),
    /PR-4001 was approved/
  );
  assert.doesNotMatch(
    v2.body.notifications.map((n) => n.message).join(' | '),
    /SHOE-1002/
  );

  const a = await request(app).get('/notifications').set(auth(admin));
  assert.match(
    a.body.notifications.map((n) => n.message).join(' | '),
    /MRN-2001 was signed by Vendor One/
  );
});

test('mark-all-read clears the unread count', async () => {
  const before = await request(app).get('/notifications').set(auth(vendor1));
  assert.equal(before.body.unread > 0, true);

  const read = await request(app)
    .post('/notifications/read')
    .set(auth(vendor1));
  assert.equal(read.status, 200);

  const after = await request(app).get('/notifications').set(auth(vendor1));
  assert.equal(after.body.unread, 0);
  assert.equal(after.body.notifications.every((n) => n.read === 1), true);

  const other = await request(app).get('/notifications').set(auth(vendor2));
  assert.equal(other.body.unread > 0, true);
});

test('notifications require authentication', async () => {
  assert.equal((await request(app).get('/notifications')).status, 401);
  assert.equal((await request(app).post('/notifications/read')).status, 401);
});
