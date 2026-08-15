// server/routes/assignments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// These return empty arrays if you don't have task tables yet
router.get('/inbox', verifyToken, async (_req, res) => {
  try {
    // TODO: replace with your tasks query
    res.json([]); // keeps UI happy
  } catch (e) {
    console.error('GET /inbox failed:', e);
    res.status(500).json({ error: 'Failed to load inbox' });
  }
});

router.get('/outbox', verifyToken, async (_req, res) => {
  try {
    res.json([]);
  } catch (e) {
    console.error('GET /outbox failed:', e);
    res.status(500).json({ error: 'Failed to load outbox' });
  }
});

// Workflows your user can initiate
router.get('/workflows/initiable', verifyToken, async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, COALESCE((graph->'workflowMeta'->>'initiatorFormId')::int, NULL) AS initiator_form_id,
              COALESCE(version,1) AS version
       FROM workflows
       ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error('GET /workflows/initiable failed:', e);
    res.status(500).json({ error: 'Failed to load workflows' });
  }
});

// Start an instance — stub success so UI proceeds
router.post('/workflows/start/:workflowId', verifyToken, async (req, res) => {
  const { workflowId } = req.params;
  const { formId, masterId } = req.body || {};
  try {
    // TODO: insert into your instances/tasks tables
    const instanceId = Math.floor(Math.random() * 1e9);
    res.json({
      instanceId,
      initiatorFormId: formId,
      initiatorTaskId: null,
      next: { formId, taskId: null }
    });
  } catch (e) {
    console.error('POST /workflows/start failed:', e);
    res.status(500).json({ error: 'Failed to start workflow' });
  }
});

module.exports = router;
