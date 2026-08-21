const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

test('vendor registration creates a pending_kyc account and logs in', async () => {
  const res = await request(app).post('/auth/vendor/register').send({
    name: 'Vendor Three',
    businessName: 'Gamma Grails Co',
    email: 'vendor3@example.test',
    pan: 'not-valid-yet',
    password: 'Passw0rd!',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.status, 'pending_kyc');
  assert.equal(res.body.user.role, 'vendor');
});

test('duplicate email and invalid input are rejected', async () => {
  const dup = await request(app).post('/auth/vendor/register').send({
    name: 'X',
    businessName: 'X Co',
    email: 'vendor1@example.test',
    pan: 'AAAAA1111A',
    password: 'Passw0rd!',
  });
  assert.equal(dup.status, 409);

  const missing = await request(app)
    .post('/auth/vendor/register')
    .send({ email: 'a@b.test', password: 'Passw0rd!' });
  assert.equal(missing.status, 400);

  const shortPw = await request(app).post('/auth/vendor/register').send({
    name: 'X',
    businessName: 'X Co',
    email: 'x@b.test',
    pan: 'AAAAA1111A',
    password: 'short',
  });
  assert.equal(shortPw.status, 400);
});

test('mock KYC: invalid PAN stays pending, valid PAN activates', async () => {
  const reg = await request(app).post('/auth/vendor/register').send({
    name: 'Vendor Four',
    businessName: 'Delta Heat Co',
    email: 'vendor4@example.test',
    pan: 'bad-pan',
    password: 'Passw0rd!',
  });
  const token = reg.body.token;

  const fail = await request(app)
    .post('/kyc/verify')
    .set(auth(token))
    .send({ pan: 'bad-pan' });
  assert.equal(fail.status, 200);
  assert.equal(fail.body.verified, false);
  assert.equal(fail.body.user.status, 'pending_kyc');

  const ok = await request(app)
    .post('/kyc/verify')
    .set(auth(token))
    .send({ pan: 'DDDDD4444D' });
  assert.equal(ok.body.verified, true);
  assert.equal(ok.body.user.status, 'active');
});

test('seeded pending vendor verifies with the PAN stored at registration', async () => {
  const token = await login('vendor', 'vendor2@example.test');
  const res = await request(app).post('/kyc/verify').set(auth(token)).send({});
  assert.equal(res.body.verified, true);
  assert.equal(res.body.user.status, 'active');
});

test('KYC requires authentication', async () => {
  const res = await request(app).post('/kyc/verify').send({ pan: 'AAAAA0000A' });
  assert.equal(res.status, 401);
});
