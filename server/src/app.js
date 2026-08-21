const express = require('express');
const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');

const app = express();

// Only the local dev proxy (Vite) sits in front of the API; trusting loopback
// lets express-rate-limit key on the real client IP without trusting
// arbitrary X-Forwarded-For headers.
app.set('trust proxy', 'loopback');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use(authRoutes);
app.use(kycRoutes);
// Feature routes are mounted here as they are implemented
// (shoes, mrn, invoices, price-requests, dashboards).

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler — never leaks stack traces or internals to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

module.exports = app;
