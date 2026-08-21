const express = require('express');
const { db, transaction, nextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notify, notifyAdmins } = require('../services/notify');

const router = express.Router();

const DETAIL_SELECT = `
  SELECT pr.*, s.sku, s.brand, s.model, s.adminPrice AS currentAdminPrice,
         u.name AS vendorName, u.businessName
  FROM price_requests pr
  JOIN shoes s ON s.id = pr.shoeId
  JOIN users u ON u.id = pr.vendorId`;

router.post('/price-requests', requireAuth, requireRole('vendor'), (req, res) => {
  const { shoeId, requestedPrice } = req.body || {};

  const shoe = db
    .prepare('SELECT * FROM shoes WHERE id = ? AND vendorId = ?')
    .get(String(shoeId ?? ''), req.user.id);
  if (!shoe) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const price = Number(requestedPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return res
      .status(400)
      .json({ error: 'requestedPrice must be a positive number' });
  }

  const request = transaction(() => {
    const id = nextId('price_requests', 'PR', 4001);
    db.prepare(
      `INSERT INTO price_requests (id, shoeId, vendorId, requestedPrice, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(id, shoe.id, req.user.id, price);
    return db.prepare(`${DETAIL_SELECT} WHERE pr.id = ?`).get(id);
  });

  notifyAdmins(
    `Price request ${request.id}: ${req.user.name} asks ${price} for ${shoe.id}`
  );
  res.status(201).json({ request });
});

router.get('/price-requests', requireAuth, (req, res) => {
  const requests =
    req.user.role === 'admin'
      ? db.prepare(`${DETAIL_SELECT} ORDER BY pr.id`).all()
      : db
          .prepare(`${DETAIL_SELECT} WHERE pr.vendorId = ? ORDER BY pr.id`)
          .all(req.user.id);
  res.json({ requests });
});

router.post(
  '/admin/price-requests/:id/respond',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const request = db
      .prepare('SELECT * FROM price_requests WHERE id = ?')
      .get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Price request not found' });
    }
    if (request.status !== 'pending') {
      return res
        .status(400)
        .json({ error: `Price request is already ${request.status}` });
    }

    const { action } = req.body || {};
    if (action !== 'approve' && action !== 'reject') {
      return res
        .status(400)
        .json({ error: "action must be 'approve' or 'reject'" });
    }

    const updated = transaction(() => {
      if (action === 'approve') {
        db.prepare('UPDATE shoes SET adminPrice = ? WHERE id = ?').run(
          request.requestedPrice,
          request.shoeId
        );
        db.prepare(
          "UPDATE price_requests SET status = 'approved' WHERE id = ?"
        ).run(request.id);
      } else {
        db.prepare(
          "UPDATE price_requests SET status = 'rejected' WHERE id = ?"
        ).run(request.id);
      }
      return db.prepare(`${DETAIL_SELECT} WHERE pr.id = ?`).get(request.id);
    });

    notify(
      request.vendorId,
      `Your price request ${request.id} was ${action === 'approve' ? 'approved' : 'rejected'}`
    );
    res.json({ request: updated });
  }
);

module.exports = router;
