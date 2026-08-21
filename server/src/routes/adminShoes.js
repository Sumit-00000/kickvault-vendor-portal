const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Listing statuses come verbatim from the assignment:
// submitted -> priced -> live -> sold / returned
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

// Admin sets the admin-approved price for a listing.
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

// Admin changes a listing's status (validated against the assignment's
// status set).
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
