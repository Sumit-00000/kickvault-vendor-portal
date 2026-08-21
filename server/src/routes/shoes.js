const express = require('express');
const { db, transaction, nextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseCsv } = require('../utils/csv');

const router = express.Router();

const TEXT_FIELDS = ['brand', 'model', 'size', 'sku', 'condition'];

function validateShoeInput(input, { partial = false } = {}) {
  const errors = [];
  const value = {};

  for (const f of TEXT_FIELDS) {
    if (input[f] === undefined) {
      if (!partial) errors.push(`${f} is required`);
      continue;
    }
    if (typeof input[f] !== 'string' || !input[f].trim()) {
      errors.push(`${f} must be a non-empty string`);
    } else {
      value[f] = input[f].trim();
    }
  }

  if (input.askingPrice === undefined) {
    if (!partial) errors.push('askingPrice is required');
  } else {
    const n = Number(input.askingPrice);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push('askingPrice must be a positive number');
    } else {
      value.askingPrice = n;
    }
  }

  if (input.qty === undefined) {
    if (!partial) errors.push('qty is required');
  } else {
    const n = Number(input.qty);
    if (!Number.isInteger(n) || n < 1) {
      errors.push('qty must be a positive integer');
    } else {
      value.qty = n;
    }
  }

  return { errors, value };
}

function insertShoe(vendorId, value) {
  const id = nextId('shoes', 'SHOE', 1001);
  db.prepare(
    `INSERT INTO shoes (id, vendorId, brand, model, size, sku, condition,
                        askingPrice, qty, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`
  ).run(
    id,
    vendorId,
    value.brand,
    value.model,
    value.size,
    value.sku,
    value.condition,
    value.askingPrice,
    value.qty
  );
  return db.prepare('SELECT * FROM shoes WHERE id = ?').get(id);
}

router.get('/shoes', requireAuth, (req, res) => {
  if (req.user.role === 'admin') {
    const shoes = db
      .prepare(
        `SELECT s.*, u.name AS vendorName, u.businessName, u.email AS vendorEmail
         FROM shoes s JOIN users u ON u.id = s.vendorId
         ORDER BY s.id`
      )
      .all();
    return res.json({ shoes });
  }
  const shoes = db
    .prepare('SELECT * FROM shoes WHERE vendorId = ? ORDER BY id')
    .all(req.user.id);
  res.json({ shoes });
});

router.post('/shoes', requireAuth, requireRole('vendor'), (req, res) => {
  const { errors, value } = validateShoeInput(req.body || {});
  if (errors.length) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  const shoe = transaction(() => insertShoe(req.user.id, value));
  res.status(201).json({ shoe });
});

router.post('/shoes/bulk', requireAuth, requireRole('vendor'), (req, res) => {
  let items;
  if (typeof req.body === 'string') {
    try {
      items = parseCsv(req.body);
    } catch {
      return res.status(400).json({ error: 'Could not parse CSV' });
    }
  } else if (Array.isArray(req.body)) {
    items = req.body;
  } else if (req.body && Array.isArray(req.body.items)) {
    items = req.body.items;
  } else {
    return res.status(400).json({
      error:
        'Send a JSON array of listings or CSV text (Content-Type: text/csv)',
    });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'No listings to upload' });
  }

  const rowErrors = [];
  const validated = items.map((item, i) => {
    const { errors, value } = validateShoeInput(item);
    if (errors.length) rowErrors.push({ row: i + 1, errors });
    return value;
  });
  if (rowErrors.length) {
    return res
      .status(400)
      .json({ error: 'Bulk upload failed validation', rowErrors });
  }

  const shoes = transaction(() =>
    validated.map((value) => insertShoe(req.user.id, value))
  );
  res.status(201).json({ created: shoes.length, shoes });
});

function findOwnShoe(req, res) {
  const shoe = db
    .prepare('SELECT * FROM shoes WHERE id = ? AND vendorId = ?')
    .get(req.params.id, req.user.id);
  if (!shoe) {
    res.status(404).json({ error: 'Listing not found' });
    return null;
  }
  return shoe;
}

router.patch('/shoes/:id', requireAuth, requireRole('vendor'), (req, res) => {
  const shoe = findOwnShoe(req, res);
  if (!shoe) return;

  const { errors, value } = validateShoeInput(req.body || {}, {
    partial: true,
  });
  if (errors.length) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  const assignments = keys.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE shoes SET ${assignments} WHERE id = ?`).run(
    ...keys.map((k) => value[k]),
    shoe.id
  );
  res.json({
    shoe: db.prepare('SELECT * FROM shoes WHERE id = ?').get(shoe.id),
  });
});

router.delete('/shoes/:id', requireAuth, requireRole('vendor'), (req, res) => {
  const shoe = findOwnShoe(req, res);
  if (!shoe) return;

  try {
    db.prepare('DELETE FROM shoes WHERE id = ?').run(shoe.id);
  } catch (err) {
    if (String(err.message).includes('FOREIGN KEY')) {
      return res.status(409).json({
        error:
          'Listing is referenced by other records (e.g. a price request) and cannot be deleted',
      });
    }
    throw err;
  }
  res.json({ deleted: shoe.id });
});

module.exports = router;
