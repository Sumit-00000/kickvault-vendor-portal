const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, login, auth, binaryParser } = require('./helpers');

let vendor1, vendor2, admin, vendor2Id;

test.before(async () => {
  vendor1 = await login('vendor', 'vendor1@example.test');
  vendor2 = await login('vendor', 'vendor2@example.test');
  admin = await login('admin', 'admin@kickvault.test');
  const me = await request(app).get('/me').set(auth(vendor2));
  vendor2Id = me.body.user.id;
});

test('admin creates an MRN; items must reference the vendor listings', async () => {
  const created = await request(app)
    .post('/mrn')
    .set(auth(admin))
    .send({ vendorId: vendor2Id, items: [{ sku: 'NB550-WG-8', qty: 3 }] });
  assert.equal(created.status, 201);
  assert.equal(created.body.mrn.status, 'awaiting_signature');
  assert.equal(created.body.mrn.items.length, 1);

  const foreignSku = await request(app)
    .post('/mrn')
    .set(auth(admin))
    .send({ vendorId: vendor2Id, items: [{ sku: 'AJ1-CHI-9', qty: 1 }] });
  assert.equal(foreignSku.status, 400);

  const unknownVendor = await request(app)
    .post('/mrn')
    .set(auth(admin))
    .send({ vendorId: 999, items: [{ sku: 'X', qty: 1 }] });
  assert.equal(unknownVendor.status, 400);

  const asVendor = await request(app).post('/mrn').set(auth(vendor1)).send({});
  assert.equal(asVendor.status, 403);
});

test('MRN lists and detail are role-scoped', async () => {
  const v1List = await request(app).get('/mrn').set(auth(vendor1));
  assert.deepEqual(v1List.body.mrns.map((m) => m.id), ['MRN-2001']);

  const adminList = await request(app).get('/mrn').set(auth(admin));
  assert.equal(adminList.body.mrns.length, 2);

  const crossDetail = await request(app).get('/mrn/MRN-2002').set(auth(vendor1));
  assert.equal(crossDetail.status, 404);
});

test('signing: checkbox + name + timestamp; PDF only after signing', async () => {
  // PDF before signing is refused
  const early = await request(app).get('/mrn/MRN-2001/pdf').set(auth(vendor1));
  assert.equal(early.status, 400);

  // Checkbox is mandatory
  const noCheckbox = await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(vendor1))
    .send({ accepted: false, name: 'Vendor One' });
  assert.equal(noCheckbox.status, 400);

  // Cross-vendor signing looks like a 404
  const crossSign = await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(vendor2))
    .send({ accepted: true, name: 'V2' });
  assert.equal(crossSign.status, 404);

  // Admin cannot sign
  const adminSign = await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(admin))
    .send({ accepted: true, name: 'Admin' });
  assert.equal(adminSign.status, 403);

  // Vendor signs
  const signed = await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(vendor1))
    .send({ accepted: true, name: 'Vendor One' });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.mrn.status, 'signed');
  assert.equal(signed.body.mrn.signedBy, 'Vendor One');
  assert.match(signed.body.mrn.signedAt, /^\d{4}-\d{2}-\d{2}T/);

  // Re-signing is refused
  const again = await request(app)
    .post('/mrn/MRN-2001/sign')
    .set(auth(vendor1))
    .send({ accepted: true, name: 'Vendor One' });
  assert.equal(again.status, 400);

  // Signed MRN downloads as a real PDF (vendor and admin)
  const pdf = await request(app)
    .get('/mrn/MRN-2001/pdf')
    .set(auth(vendor1))
    .buffer(true)
    .parse(binaryParser);
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.equal(pdf.body.slice(0, 4).toString(), '%PDF');

  const adminPdf = await request(app).get('/mrn/MRN-2001/pdf').set(auth(admin));
  assert.equal(adminPdf.status, 200);
});
