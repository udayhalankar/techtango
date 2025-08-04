const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all workflows (for dropdown)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM workflows ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// POST create new workflow with steps
router.post('/', async (req, res) => {
  const { name, steps, createdBy = 'admin@example.com' } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO workflows (name, created_by) VALUES ($1, $2) RETURNING id',
      [name, createdBy]
    );

    const workflowId = result.rows[0].id;

    const stepValues = steps.map((step, index) => [
      workflowId,
      index + 1,
      step.stepName,
      step.assignedUser,
      step.ccList ? step.ccList.split(',').map(s => s.trim()) : [],
      step.actionType,
      step.sendEmailTo,
      step.sendOnApprove,
      step.sendOnReject,
      step.sendOnRefer,
      step.sendOnSubmit,
    ]);

    const insertStepQuery = `
      INSERT INTO workflow_steps (
        workflow_id, step_number, step_name, assigned_user, cc_list,
        action_type, send_email_to, on_approve_send_to, on_reject_send_to,
        on_refer_send_to, on_submit_send_to
      )
      VALUES ${stepValues.map((_, i) =>
        `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
      ).join(', ')}
    `;

    const flattened = stepValues.flat();
    await client.query(insertStepQuery, flattened);

    await client.query('COMMIT');

    res.status(201).json({ message: 'Workflow created successfully', workflowId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving workflow:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  } finally {
    client.release();
  }
});

module.exports = router;
