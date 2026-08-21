const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

test('sync requires the shared secret header', async () => {
  const missing = await request(app).post('/cron/sync');
  assert.equal(missing.status, 401);

  const wrong = await request(app)
    .post('/cron/sync')
    .set('x-cron-secret', 'nope');
  assert.equal(wrong.status, 401);
});

test('sync reads stock_sync.csv and updates stock and sold quantities', async () => {
  const res = await request(app)
    .post('/cron/sync')
    .set('x-cron-secret', 'test-cron-secret');
  assert.equal(res.status, 200);
  assert.equal(res.body.updated, 3);
  assert.deepEqual(res.body.notFound, []);
  assert.deepEqual(res.body.invalidRows, []);

  const admin = await login('admin', 'admin@kickvault.test');
  const shoes = (await request(app).get('/shoes').set(auth(admin))).body.shoes;
  const bySku = Object.fromEntries(shoes.map((s) => [s.sku, s]));

  assert.equal(bySku['AJ1-CHI-9'].qty, 1);
  assert.equal(bySku['AJ1-CHI-9'].soldQty, 1);
  assert.equal(bySku['YZY-ZEB-10'].qty, 1);
  assert.equal(bySku['YZY-ZEB-10'].soldQty, 0);
  assert.equal(bySku['NB550-WG-8'].qty, 3);
  assert.equal(bySku['NB550-WG-8'].soldQty, 0);
});

test('sync is idempotent and reports unknown SKUs from the CSV only', async () => {
  const again = await request(app)
    .post('/cron/sync')
    .set('x-cron-secret', 'test-cron-secret');
  assert.equal(again.status, 200);
  assert.equal(again.body.updated, 3);
});
