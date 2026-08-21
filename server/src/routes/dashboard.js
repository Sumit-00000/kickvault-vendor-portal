const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard/vendor', requireAuth, requireRole('vendor'), (req, res) => {
  const shoes = db
    .prepare('SELECT * FROM shoes WHERE vendorId = ? ORDER BY id')
    .all(req.user.id);

  const soldRow = db
    .prepare(
      `SELECT COALESCE(SUM(il.qtySold), 0) AS soldCount
       FROM invoice_lines il
       JOIN invoices i ON i.id = il.invoiceId
       WHERE i.vendorId = ? AND i.status != 'cancelled'`
    )
    .get(req.user.id);

  const pendingRows = db
    .prepare(
      `SELECT i.commissionPct, COALESCE(SUM(il.qtySold * il.unitPrice), 0) AS gross
       FROM invoices i
       LEFT JOIN invoice_lines il ON il.invoiceId = i.id
       WHERE i.vendorId = ? AND i.status IN ('draft', 'sent')
       GROUP BY i.id`
    )
    .all(req.user.id);
  const pendingPayments =
    Math.round(
      pendingRows.reduce(
        (sum, r) => sum + r.gross * (1 - r.commissionPct / 100),
        0
      ) * 100
    ) / 100;

  res.json({ shoes, soldCount: soldRow.soldCount, pendingPayments });
});

router.get('/dashboard/admin', requireAuth, requireRole('admin'), (req, res) => {
  const totalVendors = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'vendor'")
    .get().n;

  const liveListings = db
    .prepare("SELECT COUNT(*) AS n FROM shoes WHERE status = 'live'")
    .get().n;

  const soldValue = db
    .prepare(
      `SELECT COALESCE(SUM(il.qtySold * il.unitPrice), 0) AS v
       FROM invoice_lines il
       JOIN invoices i ON i.id = il.invoiceId
       WHERE i.status != 'cancelled'`
    )
    .get().v;

  const soldOverTime = db
    .prepare(
      `SELECT date(i.createdAt) AS day,
              SUM(il.qtySold * il.unitPrice) AS value
       FROM invoice_lines il
       JOIN invoices i ON i.id = il.invoiceId
       WHERE i.status != 'cancelled'
       GROUP BY date(i.createdAt)
       ORDER BY day`
    )
    .all();

  res.json({ totalVendors, liveListings, soldValue, soldOverTime });
});

module.exports = router;
