const pool = require('../db');

exports.inbox = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { rows } = await pool.query(
      `SELECT
         t.id                      AS task_id,
         t.instance_id,
         t.status                  AS task_status,
         t.completed_at,
         t.data,
         n.type                    AS node_type,
         (n.config->>'formId')::int AS form_id,
         w.id                      AS workflow_id,
         w.name                    AS workflow_name,
         i.started_at,
         i.status                  AS instance_status
       FROM workflow_tasks t
       JOIN workflow_instances i ON i.id = t.instance_id
       JOIN workflows w         ON w.id = i.workflow_id
       JOIN workflow_nodes n    ON n.id = t.node_id
      WHERE t.assigned_to = $1
        AND t.status = 'Pending'
      ORDER BY t.id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('inbox error:', e);
    res.status(500).json({ error: 'Failed to load inbox' });
  }
};

exports.outbox = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { rows } = await pool.query(
      `SELECT
         i.id         AS instance_id,
         w.id         AS workflow_id,
         w.name       AS workflow_name,
         w.version,
         i.status     AS instance_status,
         i.started_at
       FROM workflow_instances i
       JOIN workflows w ON w.id = i.workflow_id
      WHERE i.started_by = $1
      ORDER BY i.started_at DESC NULLS LAST, i.id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('outbox error:', e);
    res.status(500).json({ error: 'Failed to load outbox' });
  }
};
