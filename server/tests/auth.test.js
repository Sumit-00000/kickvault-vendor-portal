const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

test('admin and vendor can log in and see themselves via /me', async () => {
  const adminToken = await login('admin', 'admin@kickvault.test');
  const me = await request(app).get('/me').set(auth(adminToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.user.role, 'admin');
  assert.equal(me.body.user.passwordHash, undefined);

  const vendorToken = await login('vendor', 'vendor1@example.test');
  const vme = await request(app).get('/me').set(auth(vendorToken));
  assert.equal(vme.body.user.email, 'vendor1@example.test');
});

test('invalid credentials and wrong-role logins are rejected identically', async () => {
  const wrongPw = await request(app)
    .post('/auth/admin/login')
    .send({ email: 'admin@kickvault.test', password: 'wrong' });
  assert.equal(wrongPw.status, 401);
  assert.equal(wrongPw.body.error, 'Invalid credentials');

  const wrongRole = await request(app)
    .post('/auth/vendor/login')
    .send({ email: 'admin@kickvault.test', password: 'Passw0rd!' });
  assert.equal(wrongRole.status, 401);
  assert.equal(wrongRole.body.error, 'Invalid credentials');
});

test('missing fields are a 400', async () => {
  const res = await request(app).post('/auth/vendor/login').send({});
  assert.equal(res.status, 400);
});

test('protected routes require a valid token', async () => {
  assert.equal((await request(app).get('/me')).status, 401);
  assert.equal(
    (await request(app).get('/me').set(auth('garbage'))).status,
    401
  );
  assert.equal((await request(app).get('/shoes')).status, 401);
});

test('role guards separate vendor and admin', async () => {
  const vendorToken = await login('vendor', 'vendor1@example.test');
  const adminToken = await login('admin', 'admin@kickvault.test');

  const blocked = await request(app)
    .get('/admin/vendors')
    .set(auth(vendorToken));
  assert.equal(blocked.status, 403);

  const alsoBlocked = await request(app)
    .post('/kyc/verify')
    .set(auth(adminToken))
    .send({ pan: 'AAAAA0000A' });
  assert.equal(alsoBlocked.status, 403);
});

test('login endpoint is rate limited', async () => {
  let limited = null;
  for (let i = 0; i < 15; i++) {
    const res = await request(app)
      .post('/auth/vendor/login')
      .send({ email: 'nobody@example.test', password: 'bad' });
    if (res.status === 429) {
      limited = res;
      break;
    }
  }
  assert.ok(limited, 'expected a 429 within 15 attempts');
  assert.match(limited.body.error, /too many/i);
});
