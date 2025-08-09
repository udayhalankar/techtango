// server/routes/chowkidar.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const p = path.join(__dirname, '../../agent/results.json');
    if (!fs.existsSync(p)) {
      return res.json({
        scannedAt: null,
        results: {},
        summary: { totals: { pass: 0, warn: 0, fail: 0 }, byCheck: {} }
      });
    }
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (e) {
    console.error('Chowkidar API error:', e);
    return res.status(500).json({ error: 'Failed to read results.json' });
  }
});

module.exports = router;
