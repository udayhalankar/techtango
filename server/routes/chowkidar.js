// server/routes/chowkidar.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Resolve to project root: /server/routes -> ../.. (repo root)
const ROOT = path.resolve(__dirname, '..', '..');

// Where the agent writes the latest results
const RESULTS_PATH =
  process.env.SENTINEL_RESULTS_PATH ||
  path.join(ROOT, 'agent', 'results.json');

// Optional: directory where historical scans are saved
const HISTORY_DIR =
  process.env.SENTINEL_HISTORY_DIR ||
  path.join(ROOT, 'agent', 'history');

// Shape used when results.json is missing
const EMPTY_PAYLOAD = {
  scannedAt: null,
  results: {},
  summary: {
    totals: { pass: 0, warn: 0, fail: 0 },
    byCheck: {}
  }
};

// GET /api/chowkidar  → latest results
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(RESULTS_PATH)) {
      return res.json(EMPTY_PAYLOAD);
    }
    const raw = fs.readFileSync(RESULTS_PATH, 'utf8');
    if (!raw || !raw.trim()) {
      return res.json(EMPTY_PAYLOAD);
    }
    const json = JSON.parse(raw);
    return res.json(json);
  } catch (e) {
    console.error('Chowkidar route read error:', e);
    return res.status(500).json({ error: 'Results not available', message: e.message });
  }
});

// POST /api/chowkidar/rescan  → trigger a rescan if scanner is available
router.post('/rescan', async (req, res) => {
  try {
    let scanAll;
    try {
      // agent/scanner.js should export { scanAll }
      ({ scanAll } = require('../../agent/scanner'));
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        return res.status(501).json({
          error: 'Rescan not implemented',
          message: 'agent/scanner.js not found (expected to export scanAll)'
        });
      }
      throw err;
    }

    const out = await scanAll();
    return res.json(out);
  } catch (e) {
    console.error('Rescan error:', e);
    return res.status(500).json({ error: 'Rescan failed', message: e.message });
  }
});

// GET /api/chowkidar/_debug  → quick file diagnostics
router.get('/_debug', (req, res) => {
  try {
    const exists = fs.existsSync(RESULTS_PATH);
    const stat = exists ? fs.statSync(RESULTS_PATH) : null;
    const raw = exists ? fs.readFileSync(RESULTS_PATH, 'utf8') : null;

    return res.json({
      RESULTS_PATH,
      HISTORY_DIR,
      exists,
      size: stat?.size || 0,
      mtime: stat?.mtime || null,
      sample: raw ? raw.slice(0, 400) : null
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// (Optional) GET /api/chowkidar/history → list history files (if you save them)
router.get('/history', (req, res) => {
  try {
    if (!fs.existsSync(HISTORY_DIR)) return res.json([]);
    const files = fs
      .readdirSync(HISTORY_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const p = path.join(HISTORY_DIR, f);
        const s = fs.statSync(p);
        return { file: f, size: s.size, mtime: s.mtime };
      });
    return res.json(files);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
