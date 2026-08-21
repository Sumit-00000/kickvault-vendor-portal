const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { parseCsv } = require('../utils/csv');

const CSV_PATH = path.join(__dirname, '..', '..', 'data', 'stock_sync.csv');

function runStockSync() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  let updated = 0;
  const notFound = [];
  const invalidRows = [];

  for (const row of rows) {
    const stock = Number(row.stock_qty);
    const sold = Number(row.sold_qty);
    if (
      !row.sku ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isInteger(sold) ||
      sold < 0
    ) {
      invalidRows.push(row.sku || '(missing sku)');
      continue;
    }
    const info = db
      .prepare('UPDATE shoes SET qty = ?, soldQty = ? WHERE sku = ?')
      .run(stock, sold, row.sku);
    if (info.changes === 0) {
      notFound.push(row.sku);
    } else {
      updated += info.changes;
    }
  }

  return { updated, notFound, invalidRows };
}

module.exports = { runStockSync, CSV_PATH };
