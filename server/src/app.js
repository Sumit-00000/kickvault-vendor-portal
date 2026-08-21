const express = require('express');
const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');
const shoesRoutes = require('./routes/shoes');
const adminShoesRoutes = require('./routes/adminShoes');
const adminVendorsRoutes = require('./routes/adminVendors');
const mrnRoutes = require('./routes/mrn');
const invoicesRoutes = require('./routes/invoices');
const priceRequestsRoutes = require('./routes/priceRequests');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.set('trust proxy', 'loopback');

app.use(express.json());
app.use(express.text({ type: 'text/csv', limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use(authRoutes);
app.use(kycRoutes);
app.use(shoesRoutes);
app.use(adminShoesRoutes);
app.use(adminVendorsRoutes);
app.use(mrnRoutes);
app.use(invoicesRoutes);
app.use(priceRequestsRoutes);
app.use(dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

module.exports = app;
