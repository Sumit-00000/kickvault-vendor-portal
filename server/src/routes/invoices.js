const express = require('express');
const { db, transaction, nextId } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendInvoicePdf } = require('../services/pdf');
const { notify } = require('../services/notify');

const router = express.Router();

function getLines(invoiceId) {
  return db
    .prepare(
      `SELECT il.sku, il.qtySold, il.unitPrice, s.brand, s.model
       FROM invoice_lines il
       LEFT JOIN invoices i ON i.id = il.invoiceId
       LEFT JOIN shoes s ON s.sku = il.sku AND s.vendorId = i.vendorId
       WHERE il.invoiceId = ?
       ORDER BY il.id`
    )
    .all(invoiceId);
}

function computeTotals(lines, commissionPct) {
  const gross = lines.reduce((sum, l) => sum + l.qtySold * l.unitPrice, 0);
  const commission = Math.round(gross * (commissionPct / 100) * 100) / 100;
  const net = Math.round((gross - commission) * 100) / 100;
  return { gross, commission, net };
}

function withDetails(invoice) {
  const lines = getLines(invoice.id);
  return {
    ...invoice,
    lines,
    totals: computeTotals(lines, invoice.commissionPct),
  };
}

function findInvoice(req, res) {
  const invoice = db
    .prepare(
      `SELECT i.*, u.name AS vendorName, u.businessName, u.email AS vendorEmail
       FROM invoices i JOIN users u ON u.id = i.vendorId
       WHERE i.id = ?`
    )
    .get(req.params.id);
  if (
    !invoice ||
    (req.user.role === 'vendor' && invoice.vendorId !== req.user.id)
  ) {
    res.status(404).json({ error: 'Invoice not found' });
    return null;
  }
  return invoice;
}

router.post('/invoices', requireAuth, requireRole('admin'), (req, res) => {
  const { vendorId, commissionPct, lines } = req.body || {};

  const vendor = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'vendor'")
    .get(Number(vendorId));
  if (!vendor) {
    return res.status(400).json({ error: 'Unknown vendor' });
  }

  const pct = Number(commissionPct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res
      .status(400)
      .json({ error: 'commissionPct must be a number between 0 and 100' });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'lines must be a non-empty array' });
  }
  const vendorSkus = new Set(
    db
      .prepare('SELECT sku FROM shoes WHERE vendorId = ?')
      .all(vendor.id)
      .map((r) => r.sku)
  );
  for (const [i, line] of lines.entries()) {
    if (typeof line.sku !== 'string' || !line.sku.trim()) {
      return res.status(400).json({ error: `lines[${i}].sku is required` });
    }
    if (!vendorSkus.has(line.sku.trim())) {
      return res.status(400).json({
        error: `lines[${i}].sku "${line.sku}" does not match any listing of this vendor`,
      });
    }
    const qty = Number(line.qtySold);
    if (!Number.isInteger(qty) || qty < 1) {
      return res
        .status(400)
        .json({ error: `lines[${i}].qtySold must be a positive integer` });
    }
    const price = Number(line.unitPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res
        .status(400)
        .json({ error: `lines[${i}].unitPrice must be a positive number` });
    }
  }

  const invoice = transaction(() => {
    const id = nextId('invoices', 'INV', 3001);
    db.prepare(
      `INSERT INTO invoices (id, vendorId, commissionPct, status)
       VALUES (?, ?, ?, 'draft')`
    ).run(id, vendor.id, pct);
    const insertLine = db.prepare(
      'INSERT INTO invoice_lines (invoiceId, sku, qtySold, unitPrice) VALUES (?, ?, ?, ?)'
    );
    for (const line of lines) {
      insertLine.run(id, line.sku.trim(), Number(line.qtySold), Number(line.unitPrice));
    }
    return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  });

  notify(vendor.id, `Invoice ${invoice.id} was created for you (draft)`);
  res.status(201).json({ invoice: withDetails(invoice) });
});

router.get('/invoices', requireAuth, (req, res) => {
  const base = `SELECT i.*, u.name AS vendorName, u.businessName
                FROM invoices i JOIN users u ON u.id = i.vendorId`;
  const invoices =
    req.user.role === 'admin'
      ? db.prepare(`${base} ORDER BY i.id`).all()
      : db
          .prepare(`${base} WHERE i.vendorId = ? ORDER BY i.id`)
          .all(req.user.id);
  res.json({ invoices: invoices.map(withDetails) });
});

router.get('/invoices/:id', requireAuth, (req, res) => {
  const invoice = findInvoice(req, res);
  if (!invoice) return;
  res.json({ invoice: withDetails(invoice) });
});

router.post(
  '/invoices/:id/send',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const invoice = findInvoice(req, res);
    if (!invoice) return;
    if (invoice.status !== 'draft') {
      return res
        .status(400)
        .json({ error: `Only draft invoices can be sent (status: ${invoice.status})` });
    }
    db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").run(invoice.id);
    notify(invoice.vendorId, `Invoice ${invoice.id} was sent to you`);
    res.json({
      invoice: withDetails(
        db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id)
      ),
    });
  }
);

router.post(
  '/invoices/:id/cancel',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const invoice = findInvoice(req, res);
    if (!invoice) return;
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice is already cancelled' });
    }
    db.prepare("UPDATE invoices SET status = 'cancelled' WHERE id = ?").run(
      invoice.id
    );
    notify(invoice.vendorId, `Invoice ${invoice.id} was cancelled`);
    res.json({
      invoice: withDetails(
        db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id)
      ),
    });
  }
);

router.get('/invoices/:id/pdf', requireAuth, (req, res) => {
  const invoice = findInvoice(req, res);
  if (!invoice) return;

  const lines = getLines(invoice.id);
  sendInvoicePdf(res, {
    invoice,
    vendor: {
      name: invoice.vendorName,
      businessName: invoice.businessName,
      email: invoice.vendorEmail,
    },
    lines,
    totals: computeTotals(lines, invoice.commissionPct),
  });
});

module.exports = router;
