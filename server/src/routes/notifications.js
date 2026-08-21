const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/notifications', requireAuth, (req, res) => {
  const notifications = db
    .prepare(
      `SELECT id, message, read, createdAt
       FROM notifications
       WHERE userId = ?
       ORDER BY id DESC
       LIMIT 50`
    )
    .all(req.user.id);
  const unread = db
    .prepare(
      'SELECT COUNT(*) AS n FROM notifications WHERE userId = ? AND read = 0'
    )
    .get(req.user.id).n;
  res.json({ notifications, unread });
});

router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').run(
    req.user.id
  );
  res.json({ ok: true });
});

module.exports = router;
