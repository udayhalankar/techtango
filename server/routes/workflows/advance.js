// server/routes/workflows/advance.js
const express = require('express');
const router = express.Router();

const pool = require('../../db');
const { verifyToken } = require('../../middleware/authMiddleware');

router.use(verifyToken);

// tiny helpers
async function one(client, sql, params=[]) { const { rows } = await client.query(sql, params); return rows[0] || null; }
async function many(client, sql, params=[]) { const { rows } = await client.query(sql, params); return rows; }

router.post('/advance', async (req, res) => {
  const { instanceId, taskId, action } = req.body || {};
  const userId = req.user?.userId ?? req.user?.id ?? null;

  if (!instanceId || !taskId) {
    return res.status(400).json({ error: 'Missing instanceId or taskId' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Load current task (and basic sanity)
    const task = await one(client, `
      SELECT id, instance_id, node_id, node_type, form_id, assigned_to, status, workflow_id
      FROM workflow_tasks
      WHERE id = $1 AND instance_id = $2
      FOR UPDATE
    `, [taskId, instanceId]);

    if (!task) {
      throw new Error('Task not found for this instance');
    }

    // Optional: enforce that the caller owns the task
    if (userId != null && task.assigned_to != null && Number(task.assigned_to) !== Number(userId)) {
      // not fatal if you don’t want to enforce — switch to a 403 if you do
      // throw new Error('Task is not assigned to the current user');
    }

    // 2) Complete current task
    const normalizedAction = String(action || 'submit').toLowerCase();
    const newStatus = normalizedAction === 'reject' ? 'Rejected'
                    : normalizedAction === 'close'  ? 'Closed'
                    : 'Completed';
    await client.query(`
      UPDATE workflow_tasks
      SET status = $1, completed_at = NOW(), updated_at = NOW(), modified_at = NOW(), modified_by = $2
      WHERE id = $3
    `, [newStatus, (userId != null ? Number(userId) : null), taskId]);

    // 3) Load instance + workflow graph
    const inst = await one(client, `
      SELECT id, workflow_row_id, workflow_id, workflow_name, version,
             master_form_id, master_row_id, started_by, started_at, status,
             step_name, assigned_to AS inst_assigned_to, updateform_id
      FROM workflow_instances
      WHERE id = $1
      FOR UPDATE
    `, [instanceId]);
    if (!inst) throw new Error('Instance not found');

    const wf = await one(client, `
      SELECT id, name, version, graph
      FROM workflows
      WHERE id = $1
    `, [inst.workflow_row_id]);
    if (!wf) throw new Error('Workflow definition not found');

    let graph;
    try { graph = typeof wf.graph === 'string' ? JSON.parse(wf.graph) : wf.graph; }
    catch { graph = { nodes: [], edges: [] }; }

    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];

    const currentNodeId = String(task.node_id || '');
    // Find outgoing edges from current node
    const outs = edges.filter(e => String(e.source) === currentNodeId);

    // 4) No outgoing edges → end of workflow
    if (outs.length === 0) {
      await client.query(`
        UPDATE workflow_instances
        SET status = 'Completed',
            step_name = NULL,
            assigned_to = NULL,
            updateform_id = NULL
        WHERE id = $1
      `, [instanceId]);

      // (Optional) audit
      await client.query(`
        INSERT INTO workflow_audit (workflow_id, instance_id, actor_id, event, detail)
        VALUES ($1, $2, $3, $4, $5)
      `, [inst.workflow_id, instanceId, (userId != null ? Number(userId) : null), 'completed', { fromNode: currentNodeId }]).catch(()=>{});

      await client.query('COMMIT');
      return res.json({ ok: true, done: true });
    }

    // 5) Pick the first next edge (extend with conditions later if needed)
    const nextEdge = outs[0];
    const nextNodeId = String(nextEdge.target);
    const nextNode = nodes.find(n => String(n.id) === nextNodeId) || null;

    if (!nextNode) {
      // If graph is inconsistent, mark completed to avoid stuck instances
      await client.query(`UPDATE workflow_instances SET status='Completed' WHERE id=$1`, [instanceId]);
      await client.query('COMMIT');
      return res.json({ ok: true, done: true, warn: 'Next node not found; instance closed' });
    }

    const nextType = String(nextNode.type || nextNode.data?.stepType || 'form');
    const nextData = nextNode.data || {};
    const nextFormId = nextData.formId ?? inst.master_form_id;
    const nextStepName = nextData.stepName || nextType;
    const recipients = Array.isArray(nextData.recipients) ? nextData.recipients : [];

    // Normalize recipients (numbers preferred)
    const normalizedRecips = recipients
      .map(r => (r === null || r === undefined) ? null : (Number.isNaN(Number(r)) ? null : Number(r)))
      .filter(r => r !== null);

    // 6) Create next task(s) if there are recipients
    let createdTasks = [];
    if (normalizedRecips.length > 0) {
      const insertValues = [];
      const params = [];
      let p = 1;
      normalizedRecips.forEach(rec => {
        insertValues.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, 'Pending', NOW(), $${p++}, NOW(), $${p++})`
        );
        params.push(
          instanceId,                      // instance_id
          nextNodeId,                      // node_id
          nextType,                        // node_type
          String(nextFormId ?? ''),        // form_id (TEXT in your schema)
          rec,                             // assigned_to (INT/BIGINT)
          String(rec),                     // assignee_id (TEXT mirror)
          (userId != null ? Number(userId) : null), // created_by
          inst.workflow_id                 // workflow_id
        );
      });

      const inserted = await many(client, `
        INSERT INTO workflow_tasks
          (instance_id, node_id, node_type, form_id,
           assigned_to, assignee_id,
           status, started_at, created_by, updated_at, workflow_id)
        VALUES ${insertValues.join(',')}
        RETURNING id, assigned_to
      `, params);

      createdTasks = inserted;
    }

    // 7) Update instance snapshot to reflect the next node
    const nextAssignedTo = createdTasks.length > 0 ? createdTasks[0].assigned_to : (normalizedRecips[0] ?? null);
    await client.query(`
      UPDATE workflow_instances
      SET status         = 'Running',
          step_name      = $2,
          assigned_to    = $3,
          updateform_id  = $4
      WHERE id = $1
    `, [instanceId, nextStepName, nextAssignedTo, (nextFormId ?? null)]);

    // (Optional) audit step transition
    await client.query(`
      INSERT INTO workflow_audit (workflow_id, instance_id, actor_id, event, detail)
      VALUES ($1, $2, $3, $4, $5)
    `, [inst.workflow_id, instanceId, (userId != null ? Number(userId) : null), 'advanced',
        { fromNode: currentNodeId, toNode: nextNodeId, nextAssignedTo, nextFormId }]).catch(()=>{});

    await client.query('COMMIT');

    // 8) Build response
    const next = {
      nodeId: nextNodeId,
      formId: nextFormId ?? null,
      taskId: createdTasks.length ? createdTasks[0].id : null,
      assignedTo: nextAssignedTo ?? null,
      stepName: nextStepName
    };

    return res.json({ ok: true, instanceId, next });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[advance] error:', err);
    return res.status(500).json({ error: 'Failed to advance workflow', detail: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
