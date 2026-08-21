const express = require('express');
const { db, transaction, nextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendMrnPdf } = require('../services/pdf');

const router = express.Router();

function getItems(mrnId) {
  return db
    .prepare(
      `SELECT mi.sku, mi.qty, s.brand, s.model
       FROM mrn_items mi
       LEFT JOIN mrns m ON m.id = mi.mrnId
       LEFT JOIN shoes s ON s.sku = mi.sku AND s.vendorId = m.vendorId
       WHERE mi.mrnId = ?
       ORDER BY mi.id`
    )
    .all(mrnId);
}

function withItems(mrn) {
  return { ...mrn, items: getItems(mrn.id) };
}

function findMrn(req, res) {
  const mrn = db
    .prepare(
      `SELECT m.*, u.name AS vendorName, u.businessName, u.email AS vendorEmail
       FROM mrns m JOIN users u ON u.id = m.vendorId
       WHERE m.id = ?`
    )
    .get(req.params.id);
  if (!mrn || (req.user.role === 'vendor' && mrn.vendorId !== req.user.id)) {
    res.status(404).json({ error: 'MRN not found' });
    return null;
  }
  return mrn;
}

router.post('/mrn', requireAuth, requireRole('admin'), (req, res) => {
  const { vendorId, items } = req.body || {};

  const vendor = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'vendor'")
    .get(Number(vendorId));
  if (!vendor) {
    return res.status(400).json({ error: 'Unknown vendor' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const vendorSkus = new Set(
    db
      .prepare('SELECT sku FROM shoes WHERE vendorId = ?')
      .all(vendor.id)
      .map((r) => r.sku)
  );
  for (const [i, item] of items.entries()) {
    if (typeof item.sku !== 'string' || !item.sku.trim()) {
      return res.status(400).json({ error: `items[${i}].sku is required` });
    }
    if (!vendorSkus.has(item.sku.trim())) {
      return res.status(400).json({
        error: `items[${i}].sku "${item.sku}" does not match any listing of this vendor`,
      });
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return res
        .status(400)
        .json({ error: `items[${i}].qty must be a positive integer` });
    }
  }

  const mrn = transaction(() => {
    const id = nextId('mrns', 'MRN', 2001);
    db.prepare(
      `INSERT INTO mrns (id, vendorId, createdBy, status)
       VALUES (?, ?, ?, 'awaiting_signature')`
    ).run(id, vendor.id, req.user.id);
    const insertItem = db.prepare(
      'INSERT INTO mrn_items (mrnId, sku, qty) VALUES (?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(id, item.sku.trim(), Number(item.qty));
    }
    return db.prepare('SELECT * FROM mrns WHERE id = ?').get(id);
  });

  res.status(201).json({ mrn: withItems(mrn) });
});

router.get('/mrn', requireAuth, (req, res) => {
  const base = `SELECT m.*, u.name AS vendorName, u.businessName
                FROM mrns m JOIN users u ON u.id = m.vendorId`;
  const mrns =
    req.user.role === 'admin'
      ? db.prepare(`${base} ORDER BY m.id`).all()
      : db.prepare(`${base} WHERE m.vendorId = ? ORDER BY m.id`).all(req.user.id);
  res.json({ mrns: mrns.map(withItems) });
});

router.get('/mrn/:id', requireAuth, (req, res) => {
  const mrn = findMrn(req, res);
  if (!mrn) return;
  res.json({ mrn: withItems(mrn) });
});

router.post('/mrn/:id/sign', requireAuth, requireRole('vendor'), (req, res) => {
  const mrn = findMrn(req, res);
  if (!mrn) return;

  if (mrn.status === 'signed') {
    return res.status(400).json({ error: 'MRN is already signed' });
  }

  const { accepted, name } = req.body || {};
  if (accepted !== true) {
    return res
      .status(400)
      .json({ error: 'You must tick the acceptance checkbox to sign' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required to sign' });
  }

  const signedAt = new Date().toISOString();
  db.prepare(
    "UPDATE mrns SET status = 'signed', signedBy = ?, signedAt = ? WHERE id = ?"
  ).run(name.trim(), signedAt, mrn.id);

  const updated = db.prepare('SELECT * FROM mrns WHERE id = ?').get(mrn.id);
  res.json({ mrn: withItems(updated) });
});

router.get('/mrn/:id/pdf', requireAuth, (req, res) => {
  const mrn = findMrn(req, res);
  if (!mrn) return;

  if (mrn.status !== 'signed') {
    return res
      .status(400)
      .json({ error: 'MRN is not signed yet — the PDF represents the signed MRN' });
  }

  sendMrnPdf(res, {
    mrn,
    vendor: {
      name: mrn.vendorName,
      businessName: mrn.businessName,
      email: mrn.vendorEmail,
    },
    items: getItems(mrn.id),
  });
});

module.exports = router;
