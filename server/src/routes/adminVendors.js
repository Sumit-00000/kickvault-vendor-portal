const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/vendors', requireAuth, requireRole('admin'), (req, res) => {
  const vendors = db
    .prepare(
      `SELECT id, name, email, businessName, status, createdAt
       FROM users WHERE role = 'vendor' ORDER BY id`
    )
    .all();
  res.json({ vendors });
});

module.exports = router;
