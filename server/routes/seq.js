// server/routes/seq.js
const router = require('express').Router();
const { sequelize, models } = require('../sequelize');

router.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/models', (_req, res) => {
  res.json(Object.keys(models));
});

// adjust table/model as needed if Workflow doesn't exist
router.get('/sample', async (_req, res) => {
  try {
    if (!models.Workflow) return res.json({ note: 'No Workflow model; pick another' });
    const rows = await models.Workflow.findAll({ limit: 5 });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
