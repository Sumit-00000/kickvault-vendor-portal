const { runStockSync, CSV_PATH } = require('../src/services/stockSync');

const result = runStockSync();
console.log(`Stock sync from ${CSV_PATH}`);
console.log(`  listings updated: ${result.updated}`);
if (result.notFound.length) {
  console.log(`  SKUs not found:   ${result.notFound.join(', ')}`);
}
if (result.invalidRows.length) {
  console.log(`  invalid rows:     ${result.invalidRows.join(', ')}`);
}
