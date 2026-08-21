const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function resolveThread(req, res) {
  const vendorId = Number(req.params.vendorId);
  if (req.user.role === 'vendor' && req.user.id !== vendorId) {
    res.status(404).json({ error: 'Thread not found' });
    return null;
  }
  const vendor = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'vendor'")
    .get(vendorId);
  if (!vendor) {
    res.status(404).json({ error: 'Thread not found' });
    return null;
  }
  return vendorId;
}

router.get('/chat/:vendorId/messages', requireAuth, (req, res) => {
  const vendorId = resolveThread(req, res);
  if (vendorId === null) return;

  const messages = db
    .prepare(
      `SELECT m.id, m.vendorId, m.senderId, m.body, m.createdAt,
              u.name AS senderName, u.role AS senderRole
       FROM messages m JOIN users u ON u.id = m.senderId
       WHERE m.vendorId = ?
       ORDER BY m.id`
    )
    .all(vendorId);
  res.json({ messages });
});

router.post('/chat/:vendorId/messages', requireAuth, (req, res) => {
  const vendorId = resolveThread(req, res);
  if (vendorId === null) return;

  const { body } = req.body || {};
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: 'body must be 2000 characters or less' });
  }

  const info = db
    .prepare('INSERT INTO messages (vendorId, senderId, body) VALUES (?, ?, ?)')
    .run(vendorId, req.user.id, body.trim());
  const message = db
    .prepare(
      `SELECT m.id, m.vendorId, m.senderId, m.body, m.createdAt,
              u.name AS senderName, u.role AS senderRole
       FROM messages m JOIN users u ON u.id = m.senderId
       WHERE m.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json({ message });
});

module.exports = router;
