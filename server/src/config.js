const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

if (!process.env.JWT_SECRET) {
  console.error(
    'Missing JWT_SECRET. Copy .env.example to .env in the server/ directory:\n' +
      '  cp .env.example .env'
  );
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  databasePath:
    process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'kickvault.db'),
};
