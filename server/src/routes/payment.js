const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const round2 = (n) => Math.round(n * 100) / 100;

function vendorSummary(vendorId) {
  const rows = db
    .prepare(
      `SELECT i.commissionPct,
              COALESCE(SUM(il.qtySold), 0) AS qty,
              COALESCE(SUM(il.qtySold * il.unitPrice), 0) AS gross
       FROM invoices i
       LEFT JOIN invoice_lines il ON il.invoiceId = i.id
       WHERE i.vendorId = ? AND i.status != 'cancelled'
       GROUP BY i.id`
    )
    .all(vendorId);

  let soldQty = 0;
  let gross = 0;
  let commission = 0;
  for (const row of rows) {
    soldQty += row.qty;
    gross += row.gross;
    commission += row.gross * (row.commissionPct / 100);
  }
  return {
    soldQty,
    gross: round2(gross),
    commission: round2(commission),
    netPayable: round2(gross - commission),
  };
}

router.get('/payments/summary', requireAuth, (req, res) => {
  if (req.user.role === 'vendor') {
    return res.json({ summary: vendorSummary(req.user.id) });
  }

  const vendors = db
    .prepare(
      "SELECT id, name, businessName, email FROM users WHERE role = 'vendor' ORDER BY id"
    )
    .all();
  res.json({
    summaries: vendors.map((v) => ({
      vendorId: v.id,
      vendorName: v.name,
      businessName: v.businessName,
      email: v.email,
      ...vendorSummary(v.id),
    })),
  });
});

module.exports = router;