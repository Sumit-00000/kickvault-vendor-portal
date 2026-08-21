const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

router.post('/kyc/verify', requireAuth, requireRole('vendor'), (req, res) => {
  const bodyPan = (req.body || {}).pan;
  if (bodyPan !== undefined && typeof bodyPan !== 'string') {
    return res.status(400).json({ error: 'pan must be a string' });
  }

  const pan = (bodyPan ?? req.user.pan ?? '').trim();
  if (!pan) {
    return res.status(400).json({ error: 'pan is required' });
  }

  const verified = PAN_REGEX.test(pan);
  if (verified) {
    db.prepare("UPDATE users SET pan = ?, status = 'active' WHERE id = ?").run(
      pan,
      req.user.id
    );
  } else {
    db.prepare('UPDATE users SET pan = ? WHERE id = ?').run(pan, req.user.id);
  }

  const user = db
    .prepare(
      `SELECT id, role, email, name, businessName, pan, status, createdAt
       FROM users WHERE id = ?`
    )
    .get(req.user.id);
  res.json({ verified, user });
});

module.exports = router;
