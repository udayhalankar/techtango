// server/routes/seq-demo.js
const router = require('express').Router();

// Health
router.get('/health', async (req, res) => {
  try {
    await req.db.sequelize.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Example: list a few rows from a table you know exists.
// Replace 'users' with an actual generated model name from autogen.
router.get('/sample', async (req, res) => {
  try {
    const { models } = req.db;

    // 👉 Inspect server/models/autogen/init-models.js to see the keys.
    // They’re usually the table names (e.g., workflow_instances, workflow_tasks, users, etc.)
    const rows = await models.workflow_instances.findAll({ limit: 10, order: [['id','DESC']] });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
