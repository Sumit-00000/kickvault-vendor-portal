const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const TOKEN_TTL = '12h';

function issueToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: TOKEN_TTL,
  });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Shared login handler; separate vendor/admin endpoints per the assignment.
// The same "Invalid credentials" response covers unknown email, wrong
// password, and wrong role — no information leaks.
function login(role) {
  return (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE email = ? AND role = ?')
      .get(email.trim().toLowerCase(), role);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ token: issueToken(user), user: publicUser(user) });
  };
}

// Vendor registration — new vendors start in `pending_kyc` and become
// `active` via the mock KYC step (POST /kyc/verify).
router.post('/auth/vendor/register', (req, res) => {
  const { name, email, password, businessName, pan } = req.body || {};

  const fields = { name, email, password, businessName, pan };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: `${key} is required` });
    }
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const info = db
    .prepare(
      `INSERT INTO users (role, email, name, passwordHash, businessName, pan, status)
       VALUES ('vendor', ?, ?, ?, ?, ?, 'pending_kyc')`
    )
    .run(
      normalizedEmail,
      name.trim(),
      bcrypt.hashSync(password, 10),
      businessName.trim(),
      pan.trim()
    );

  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

router.post('/auth/vendor/login', loginLimiter, login('vendor'));
router.post('/auth/admin/login', loginLimiter, login('admin'));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
