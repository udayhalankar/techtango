// server/routes/workflows.sequelize.js
const express = require('express');
const router = express.Router();

/**
 * Prefer the central bootstrap: server/sequelize.js
 * (server.js should also attach req.db = { sequelize, models } for requests)
 */
let boot = null;
try {
  boot = require('../sequelize'); // { sequelize, models, testSequelize }
} catch (e) {
  console.warn('[workflows.sequelize] Could not load ../sequelize at require-time:', e.message);
}

/** Get models (from req.db if available, otherwise from the cached bootstrap) */
function getModels(req) {
  return (req.db && req.db.models) || (boot && boot.models) || null;
}

/** Utility: pick the first model that exists from a list of keys */
function pickModel(ms, keys) {
  for (const k of keys) if (ms[k]) return ms[k];
  return null;
}

/* ---------------------------------------------
 * Health check (uses sequelize directly)
 * ------------------------------------------- */
router.get('/seq/health', async (_req, res) => {
  try {
    const sequelize = (boot && boot.sequelize) || (require('../sequelize').sequelize);
    await sequelize.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ---------------------------------------------
 * Sample: list rows from any available model
 * Adjust the preferred model keys to your tables
 * ------------------------------------------- */
router.get('/seq/sample', async (req, res) => {
  const models = getModels(req);
  if (!models) return res.status(500).json({ error: 'Sequelize models not available' });

  // Try your likely tables first; fall back to the first model found.
  const Model =
    pickModel(models, [
      'workflow_instances', 'WorkflowInstances',
      'workflow_tasks',     'WorkflowTasks',
      'users',              'Users'
    ]) || Object.values(models)[0];

  if (!Model) return res.status(500).json({ error: 'No models found' });

  try {
    const rows = await Model.findAll({ limit: 10, order: [['id', 'DESC']] });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
