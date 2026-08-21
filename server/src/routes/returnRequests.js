const express = require('express');
const { db, transaction, nextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notify, notifyAdmins } = require('../services/notify');

const router = express.Router();

const DETAIL_SELECT = `
  SELECT rr.*, s.sku, s.brand, s.model,
         u.name AS vendorName, u.businessName
  FROM return_requests rr
  JOIN shoes s ON s.id = rr.shoeId
  JOIN users u ON u.id = rr.vendorId`;

router.post('/return-requests', requireAuth, requireRole('vendor'), (req, res) => {
  const { shoeId, qty, reason } = req.body || {};

  const shoe = db
    .prepare('SELECT * FROM shoes WHERE id = ? AND vendorId = ?')
    .get(String(shoeId ?? ''), req.user.id);
  if (!shoe) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const quantity = Number(qty);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'qty must be a positive integer' });
  }
  if (reason !== undefined && typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason must be a string' });
  }

  const request = transaction(() => {
    const id = nextId('return_requests', 'RR', 5001);
    db.prepare(
      `INSERT INTO return_requests (id, shoeId, vendorId, qty, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).run(id, shoe.id, req.user.id, quantity, reason?.trim() || null);
    return db.prepare(`${DETAIL_SELECT} WHERE rr.id = ?`).get(id);
  });

  notifyAdmins(
    `Return request ${request.id}: ${req.user.name} wants to return ${quantity} × ${shoe.sku}`
  );
  res.status(201).json({ request });
});

router.get('/return-requests', requireAuth, (req, res) => {
  const requests =
    req.user.role === 'admin'
      ? db.prepare(`${DETAIL_SELECT} ORDER BY rr.id`).all()
      : db
          .prepare(`${DETAIL_SELECT} WHERE rr.vendorId = ? ORDER BY rr.id`)
          .all(req.user.id);
  res.json({ requests });
});

router.post(
  '/admin/return-requests/:id/respond',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const request = db
      .prepare('SELECT * FROM return_requests WHERE id = ?')
      .get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    if (request.status !== 'pending') {
      return res
        .status(400)
        .json({ error: `Return request is already ${request.status}` });
    }

    const { action } = req.body || {};
    if (action !== 'approve' && action !== 'reject') {
      return res
        .status(400)
        .json({ error: "action must be 'approve' or 'reject'" });
    }

    db.prepare('UPDATE return_requests SET status = ? WHERE id = ?').run(
      action === 'approve' ? 'approved' : 'rejected',
      request.id
    );
    notify(
      request.vendorId,
      `Your return request ${request.id} was ${action === 'approve' ? 'approved' : 'rejected'}`
    );
    res.json({
      request: db.prepare(`${DETAIL_SELECT} WHERE rr.id = ?`).get(request.id),
    });
  }
);

module.exports = router;
