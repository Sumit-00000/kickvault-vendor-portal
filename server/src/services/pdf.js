const PDFDocument = require('pdfkit');

// Local PDF generation with pdfkit — no external document provider
// (assignment requirement).

const LEFT = 50;
const RIGHT = 545;

function header(doc, title) {
  doc.fontSize(20).font('Helvetica-Bold').text('KickVault', LEFT, 50);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666666')
    .text('Vendor Consignment Portal', LEFT, 74);
  doc
    .fontSize(16)
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .text(title, LEFT, 50, { align: 'right', width: RIGHT - LEFT });
  doc
    .moveTo(LEFT, 95)
    .lineTo(RIGHT, 95)
    .strokeColor('#cccccc')
    .stroke();
  doc.y = 110;
}

function keyValue(doc, pairs) {
  doc.fontSize(10);
  for (const [key, value] of pairs) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fillColor('#444444').text(`${key}:`, LEFT, y, {
      width: 130,
    });
    doc
      .font('Helvetica')
      .fillColor('#000000')
      .text(String(value ?? '—'), LEFT + 140, y, { width: RIGHT - LEFT - 140 });
    doc.moveDown(0.4);
  }
}

// columns: [{ label, width, align?, key }]
function table(doc, columns, rows) {
  const startX = LEFT;
  let y = doc.y + 10;

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444444');
  let x = startX;
  for (const col of columns) {
    doc.text(col.label.toUpperCase(), x, y, {
      width: col.width,
      align: col.align || 'left',
    });
    x += col.width;
  }
  y += 16;
  doc.moveTo(startX, y - 4).lineTo(RIGHT, y - 4).strokeColor('#cccccc').stroke();

  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  for (const row of rows) {
    x = startX;
    let rowHeight = 14;
    for (const col of columns) {
      const text = String(row[col.key] ?? '—');
      doc.text(text, x, y, { width: col.width, align: col.align || 'left' });
      rowHeight = Math.max(rowHeight, doc.heightOfString(text, { width: col.width }));
      x += col.width;
    }
    y += rowHeight + 6;
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
  }
  doc.y = y + 6;
}

function startPdfResponse(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

// Signed Material Receiving Note PDF: MRN id, vendor, items, signature.
function sendMrnPdf(res, { mrn, vendor, items }) {
  const doc = startPdfResponse(res, `${mrn.id}.pdf`);

  header(doc, 'Material Receiving Note');
  keyValue(doc, [
    ['MRN ID', mrn.id],
    ['Status', mrn.status],
    ['Created', mrn.createdAt],
    ['Vendor', vendor.name],
    ['Business', vendor.businessName],
    ['Vendor email', vendor.email],
  ]);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('Received items', LEFT, doc.y);
  table(
    doc,
    [
      { label: 'SKU', key: 'sku', width: 130 },
      { label: 'Item', key: 'item', width: 265 },
      { label: 'Qty', key: 'qty', width: 100, align: 'right' },
    ],
    items.map((it) => ({
      sku: it.sku,
      item: it.brand ? `${it.brand} ${it.model}` : '—',
      qty: it.qty,
    }))
  );

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).text('E-signature', LEFT, doc.y);
  doc.moveDown(0.4);
  keyValue(doc, [
    ['Signed by', mrn.signedBy],
    ['Signed at', mrn.signedAt],
  ]);
  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor('#888888')
    .text(
      'Electronically signed via the KickVault Vendor Portal (checkbox + name + timestamp). All data is fictional.',
      LEFT
    );

  doc.end();
}

// Invoice PDF: invoice id, vendor, line items (qty sold, unit price),
// commission percentage, totals, and invoice status.
function sendInvoicePdf(res, { invoice, vendor, lines, totals }) {
  const doc = startPdfResponse(res, `${invoice.id}.pdf`);

  header(doc, 'Invoice');
  keyValue(doc, [
    ['Invoice ID', invoice.id],
    ['Status', invoice.status],
    ['Created', invoice.createdAt],
    ['Vendor', vendor.name],
    ['Business', vendor.businessName],
    ['Vendor email', vendor.email],
    ['Commission', `${invoice.commissionPct}%`],
  ]);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('Sold items', LEFT, doc.y);
  table(
    doc,
    [
      { label: 'SKU', key: 'sku', width: 110 },
      { label: 'Item', key: 'item', width: 195 },
      { label: 'Qty sold', key: 'qtySold', width: 60, align: 'right' },
      { label: 'Unit price', key: 'unitPrice', width: 65, align: 'right' },
      { label: 'Line total', key: 'lineTotal', width: 65, align: 'right' },
    ],
    lines.map((l) => ({
      sku: l.sku,
      item: l.brand ? `${l.brand} ${l.model}` : '—',
      qtySold: l.qtySold,
      unitPrice: l.unitPrice,
      lineTotal: l.qtySold * l.unitPrice,
    }))
  );

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('Totals', LEFT, doc.y);
  doc.moveDown(0.3);
  keyValue(doc, [
    ['Gross total', totals.gross],
    [`Commission (${invoice.commissionPct}%)`, `-${totals.commission}`],
    ['Net payable to vendor', totals.net],
  ]);

  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor('#888888')
    .text('Generated by the KickVault Vendor Portal. All data is fictional.', LEFT);

  doc.end();
}

module.exports = {
  startPdfResponse,
  header,
  keyValue,
  table,
  sendMrnPdf,
  sendInvoicePdf,
};
