const express = require('express');
const config = require('../config');
const { runStockSync } = require('../services/stockSync');

const router = express.Router();

router.post('/cron/sync', (req, res) => {
  if (!config.cronSecret) {
    return res
      .status(503)
      .json({ error: 'Stock sync is not configured (set CRON_SECRET)' });
  }
  if (req.headers['x-cron-secret'] !== config.cronSecret) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }
  res.json(runStockSync());
});

module.exports = router;
