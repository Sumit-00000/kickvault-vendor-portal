const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const SHOE_STATUSES = ['submitted', 'priced', 'live', 'sold', 'returned'];

function findShoe(req, res) {
  const shoe = db
    .prepare('SELECT * FROM shoes WHERE id = ?')
    .get(req.params.id);
  if (!shoe) {
    res.status(404).json({ error: 'Listing not found' });
    return null;
  }
  return shoe;
}

router.post(
  '/admin/shoes/:id/price',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const shoe = findShoe(req, res);
    if (!shoe) return;

    const price = Number((req.body || {}).adminPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res
        .status(400)
        .json({ error: 'adminPrice must be a positive number' });
    }

    db.prepare('UPDATE shoes SET adminPrice = ? WHERE id = ?').run(
      price,
      shoe.id
    );
    res.json({
      shoe: db.prepare('SELECT * FROM shoes WHERE id = ?').get(shoe.id),
    });
  }
);

router.post(
  '/admin/shoes/:id/status',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const shoe = findShoe(req, res);
    if (!shoe) return;

    const { status } = req.body || {};
    if (!SHOE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${SHOE_STATUSES.join(', ')}`,
      });
    }

    db.prepare('UPDATE shoes SET status = ? WHERE id = ?').run(status, shoe.id);
    res.json({
      shoe: db.prepare('SELECT * FROM shoes WHERE id = ?').get(shoe.id),
    });
  }
);

module.exports = router;
