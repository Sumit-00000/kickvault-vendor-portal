const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth } = require('./helpers');

let vendor1, vendor2, admin;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
});

test('vendors see only their own listings; admin sees all with vendor identity', async () => {
  const own = await request(app).get('/shoes').set(auth(vendor1));
  assert.deepEqual(
    own.body.shoes.map((s) => s.id),
    ['SHOE-1001', 'SHOE-1002']
  );

  const all = await request(app).get('/shoes').set(auth(admin));
  assert.equal(all.body.shoes.length, 3);
  assert.equal(all.body.shoes[0].vendorName, 'Vendor One');
});

test('vendor CRUD with ownership enforcement', async () => {
  const created = await request(app).post('/shoes').set(auth(vendor1)).send({
    brand: 'Nike',
    model: 'Dunk Low Panda',
    size: 'US 9',
    sku: 'DUNK-PAN-9',
    condition: 'New',
    askingPrice: 7999,
    qty: 2,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.shoe.status, 'submitted');
  assert.equal(created.body.shoe.adminPrice, null);
  const id = created.body.shoe.id;

  const patched = await request(app)
    .patch(`/shoes/${id}`)
    .set(auth(vendor1))
    .send({ askingPrice: 8499 });
  assert.equal(patched.body.shoe.askingPrice, 8499);

  assert.equal(
    (await request(app).patch(`/shoes/${id}`).set(auth(vendor2)).send({ qty: 1 })).status,
    404
  );
  assert.equal(
    (await request(app).delete(`/shoes/${id}`).set(auth(vendor2))).status,
    404
  );

  const noFields = await request(app)
    .patch(`/shoes/${id}`)
    .set(auth(vendor1))
    .send({ status: 'live', adminPrice: 1 });
  assert.equal(noFields.status, 400);

  const del = await request(app).delete(`/shoes/${id}`).set(auth(vendor1));
  assert.equal(del.status, 200);
});

test('invalid listing input is rejected', async () => {
  const res = await request(app).post('/shoes').set(auth(vendor1)).send({
    brand: 'Nike',
    askingPrice: -5,
    qty: 1.5,
  });
  assert.equal(res.status, 400);
});

test('admin cannot create vendor listings', async () => {
  const res = await request(app).post('/shoes').set(auth(admin)).send({});
  assert.equal(res.status, 403);
});

test('bulk upload accepts JSON and CSV; bad rows insert nothing', async () => {
  const json = await request(app)
    .post('/shoes/bulk')
    .set(auth(vendor2))
    .send([
      { brand: 'Vans', model: 'Old Skool', size: 'US 9', sku: 'VANS-OS-9', condition: 'New', askingPrice: 4499, qty: 2 },
      { brand: 'Converse', model: 'Chuck 70', size: 'US 10', sku: 'CONV-C70-10', condition: 'Used - Good', askingPrice: 3499, qty: 1 },
    ]);
  assert.equal(json.status, 201);
  assert.equal(json.body.created, 2);

  const csv = await request(app)
    .post('/shoes/bulk')
    .set(auth(vendor2))
    .set('Content-Type', 'text/csv')
    .send(
      'brand,model,size,sku,condition,askingPrice,qty\nPuma,Suede Classic,US 8,PUMA-SC-8,New,4999,1\n'
    );
  assert.equal(csv.status, 201);
  assert.equal(csv.body.created, 1);

  const before = (await request(app).get('/shoes').set(auth(vendor2))).body.shoes.length;
  const bad = await request(app)
    .post('/shoes/bulk')
    .set(auth(vendor2))
    .set('Content-Type', 'text/csv')
    .send('brand,model,size,sku,condition,askingPrice,qty\nNike,Air Max,US 9,AM-9,New,abc,1\n');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.rowErrors.length, 1);
  const after = (await request(app).get('/shoes').set(auth(vendor2))).body.shoes.length;
  assert.equal(after, before);
});

test('admin sets price and walks the status lifecycle', async () => {
  const priced = await request(app)
    .post('/admin/shoes/SHOE-1002/price')
    .set(auth(admin))
    .send({ adminPrice: 21000 });
  assert.equal(priced.body.shoe.adminPrice, 21000);

  for (const status of ['priced', 'live', 'sold']) {
    const res = await request(app)
      .post('/admin/shoes/SHOE-1002/status')
      .set(auth(admin))
      .send({ status });
    assert.equal(res.body.shoe.status, status);
  }

  const invalid = await request(app)
    .post('/admin/shoes/SHOE-1002/status')
    .set(auth(admin))
    .send({ status: 'vaporized' });
  assert.equal(invalid.status, 400);

  const badPrice = await request(app)
    .post('/admin/shoes/SHOE-1002/price')
    .set(auth(admin))
    .send({ adminPrice: 'free' });
  assert.equal(badPrice.status, 400);

  const blocked = await request(app)
    .post('/admin/shoes/SHOE-1001/price')
    .set(auth(vendor1))
    .send({ adminPrice: 1 });
  assert.equal(blocked.status, 403);
});
