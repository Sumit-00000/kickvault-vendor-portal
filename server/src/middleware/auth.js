const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');

// Verifies the Bearer JWT and attaches the current user (sans passwordHash)
// to req.user. 401 on any failure — the response never says why.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = db
    .prepare(
      `SELECT id, role, email, name, businessName, pan, status, createdAt
       FROM users WHERE id = ?`
    )
    .get(Number(payload.sub));
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Role guard — use after requireAuth. Vendors can never reach admin routes
// and vice versa.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
