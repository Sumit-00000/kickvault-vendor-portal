const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin, vendor1Id, vendor2Id;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
  vendor1Id = (await request(app).get('/me').set(auth(vendor1))).body.user.id;
  vendor2Id = (await request(app).get('/me').set(auth(vendor2))).body.user.id;
});

test('vendor and admin exchange messages in the vendor thread', async () => {
  const sent = await request(app)
    .post(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor1))
    .send({ body: 'Hi, when will my Yeezys go live?' });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.message.senderRole, 'vendor');

  const reply = await request(app)
    .post(`/chat/${vendor1Id}/messages`)
    .set(auth(admin))
    .send({ body: 'Reviewing them today.' });
  assert.equal(reply.status, 201);
  assert.equal(reply.body.message.senderRole, 'admin');

  const thread = await request(app)
    .get(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor1));
  assert.equal(thread.body.messages.length, 2);
  assert.equal(thread.body.messages[0].senderName, 'Vendor One');
  assert.equal(thread.body.messages[1].senderName, 'Admin User');
});

test('threads are isolated per vendor', async () => {
  const other = await request(app)
    .get(`/chat/${vendor2Id}/messages`)
    .set(auth(vendor2));
  assert.equal(other.body.messages.length, 0);

  const crossRead = await request(app)
    .get(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor2));
  assert.equal(crossRead.status, 404);

  const crossWrite = await request(app)
    .post(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor2))
    .send({ body: 'sneaking in' });
  assert.equal(crossWrite.status, 404);

  const adminAny = await request(app)
    .get(`/chat/${vendor2Id}/messages`)
    .set(auth(admin));
  assert.equal(adminAny.status, 200);
});

test('message validation and auth', async () => {
  const empty = await request(app)
    .post(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor1))
    .send({ body: '   ' });
  assert.equal(empty.status, 400);

  const tooLong = await request(app)
    .post(`/chat/${vendor1Id}/messages`)
    .set(auth(vendor1))
    .send({ body: 'x'.repeat(2001) });
  assert.equal(tooLong.status, 400);

  const unknownVendor = await request(app)
    .get('/chat/9999/messages')
    .set(auth(admin));
  assert.equal(unknownVendor.status, 404);

  const noToken = await request(app).get(`/chat/${vendor1Id}/messages`);
  assert.equal(noToken.status, 401);
});
