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

router.post('/auth/vendor/login', loginLimiter, login('vendor'));
router.post('/auth/admin/login', loginLimiter, login('admin'));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
