const pool = require('../db');

const ACTIONABLE = new Set(['form','approval','process','email']);

// simple dot-path getter (e.g., "amount.total")
const getByPath = (obj, path) => path.split('.').reduce((a,k)=> (a && a[k] !== undefined) ? a[k] : undefined, obj);

const evalOp = (left, op, right) => {
  switch (op) {
    case '==': return left == right;
    case '!=': return left != right;
    case '>':  return Number(left) >  Number(right);
    case '<':  return Number(left) <  Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    case 'includes': return Array.isArray(left) ? left.includes(right) : String(left||'').includes(String(right||''));
    default: return false;
  }
};

// traverse from a node, evaluating evaluate-nodes until actionable nodes found
async function traverseFrom(client, workflowId, startNodeId, context) {
  const nextActionable = [];

  const queue = [startNodeId];
  const seen = new Set();

  while (queue.length) {
    const nodeId = queue.shift();
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);

    const { rows: [node] } = await client.query(
      `SELECT id, type, config FROM workflow_nodes WHERE id=$1 AND workflow_id=$2`,
      [nodeId, workflowId]
    );
    if (!node) continue;

    if (ACTIONABLE.has(node.type)) {
      nextActionable.push(node);
      continue; // stop traversal at actionable; a new task will be created
    }

    // get outgoing edges
    const { rows: outs } = await client.query(
      `SELECT target_node_id AS target, condition
       FROM workflow_edges WHERE workflow_id=$1 AND source_node_id=$2`,
      [workflowId, nodeId]
    );

    if (node.type === 'evaluate') {
      // choose TRUE or FALSE branch
      const field = node.config?.field;
      const op    = node.config?.op || '==';
      const value = node.config?.value;

      const leftVal = field ? getByPath(context, field) : undefined;
      const truthy = evalOp(leftVal, op, value);
      const branch = truthy ? 'true' : 'false';
      const next = outs.find(o => o.condition === branch);
      if (next) queue.push(next.target);
    } else {
      // other non-actionable -> fan out
      for (const o of outs) queue.push(o.target);
    }
  }

  return nextActionable;
}

exports.completeTaskAndAdvance = async (req, res) => {
  const { taskId } = req.params;
  const { status = 'Completed', data = {}, payloadMerge = {} } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // find task + instance + workflow
    const { rows: [task] } = await client.query(
      `SELECT t.id, t.instance_id, t.node_id, i.workflow_id, i.payload
       FROM workflow_tasks t
       JOIN workflow_instances i ON i.id = t.instance_id
       WHERE t.id=$1`, [taskId]
    );
    if (!task) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    // complete task
    await client.query(
      `UPDATE workflow_tasks
         SET status=$1, completed_at=NOW(), data = COALESCE(data,'{}'::jsonb) || $2::jsonb
       WHERE id=$3`,
      [status, data, taskId]
    );

    // merge payload updates to instance
    if (payloadMerge && Object.keys(payloadMerge).length) {
      await client.query(
        `UPDATE workflow_instances SET payload = COALESCE(payload,'{}'::jsonb) || $1::jsonb WHERE id=$2`,
        [payloadMerge, task.instance_id]
      );
    }

    // get the updated payload as context
    const { rows: [inst] } = await client.query(
      `SELECT payload FROM workflow_instances WHERE id=$1`, [task.instance_id]
    );
    const context = inst?.payload || {};

    // traverse from current node to next actionable
    const nextNodes = await traverseFrom(client, task.workflow_id, task.node_id, context);

    // create tasks for each actionable
    const createdTasks = [];
    for (const n of nextNodes) {
      const assigned = n.config?.assigned_user_id ?? null;
      const { rows: [nt] } = await client.query(
        `INSERT INTO workflow_tasks(instance_id, node_id, assigned_to, status, data)
         VALUES ($1,$2,$3,'Pending',$4) RETURNING id`,
        [task.instance_id, n.id, assigned, {}]
      );
      createdTasks.push(nt.id);
    }

    try {
  await client.query(
    `INSERT INTO workflow_audit(workflow_id, instance_id, actor_id, event, detail)
     SELECT i.workflow_id, t.instance_id, $1, 'task.completed',
            jsonb_build_object('taskId', t.id, 'status', $2)
     FROM workflow_tasks t
     JOIN workflow_instances i ON i.id = t.instance_id
     WHERE t.id = $3`,
    [req.user?.id ?? null, status, taskId]
  );
} catch (e) {
  console.warn('audit insert failed (task completed):', e.message);
}

    await client.query('COMMIT');
    return res.json({ ok: true, completedTaskId: taskId, createdTasks });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('completeTaskAndAdvance error:', err);
    return res.status(500).json({ error: 'Failed to complete task' });
  } finally {
    client.release();
  }
};

// ---------- list endpoints ----------
exports.getInbox = async (req, res) => {
  const qMe = Number(req.query.me);
 const me = (req.user && req.user.id)
   ? req.user.id
   : (Number.isFinite(qMe) ? qMe : null);
  if (!me) return res.status(400).json({ error: 'Missing user context' });

  try {
    const { rows } = await pool.query(
      `SELECT t.id AS task_id, t.status AS task_status, t.completed_at,
              t.data AS task_data,
              n.type AS node_type, n.config AS node_config,
              i.id AS instance_id, i.started_at, i.status AS instance_status, i.payload,
              w.id AS workflow_id, w.name AS workflow_name, w.version
         FROM workflow_tasks t
         JOIN workflow_instances i ON i.id = t.instance_id
         JOIN workflows w         ON w.id = i.workflow_id
         JOIN workflow_nodes n    ON n.id = t.node_id
        WHERE t.assigned_to = $1 AND t.status IN ('Pending','Draft')
        ORDER BY t.id DESC`,
      [me]
    );
    res.json(rows);
  } catch (e) {
    console.error('getInbox error:', e);
    res.status(500).json({ error: 'Failed to load inbox' });
  }
};

exports.getOutbox = async (req, res) => {
  const qMe = Number(req.query.me);
 const me = (req.user && req.user.id)
   ? req.user.id
   : (Number.isFinite(qMe) ? qMe : null);
  if (!me) return res.status(400).json({ error: 'Missing user context' });

  try {
    // instances I started (with a quick summary)
    const { rows } = await pool.query(
      `SELECT i.id AS instance_id,
              i.workflow_id, w.name AS workflow_name, w.version,
              i.status AS instance_status, i.started_at,
              (SELECT json_agg(json_build_object('task_id',t.id,'status',t.status,'node_type',n.type,'assigned_to',t.assigned_to))
                 FROM workflow_tasks t
                 JOIN workflow_nodes n ON n.id = t.node_id
                WHERE t.instance_id = i.id AND t.status IN ('Pending','Draft')) AS active_tasks
         FROM workflow_instances i
         JOIN workflows w ON w.id = i.workflow_id
        WHERE i.started_by = $1
        ORDER BY i.id DESC`,
      [me]
    );
    res.json(rows);
  } catch (e) {
    console.error('getOutbox error:', e);
    res.status(500).json({ error: 'Failed to load outbox' });
  }
};

exports.getTaskById = async (req, res) => {
  const { taskId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT t.id AS task_id, t.status AS task_status, t.data AS task_data, t.assigned_to,
              n.id AS node_id, n.type AS node_type, n.config AS node_config,
              i.id AS instance_id, i.workflow_id, i.payload, i.status AS instance_status,
              w.name AS workflow_name, w.version
         FROM workflow_tasks t
         JOIN workflow_instances i ON i.id = t.instance_id
         JOIN workflows w ON w.id = i.workflow_id
         JOIN workflow_nodes n ON n.id = t.node_id
        WHERE t.id=$1`,
      [taskId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('getTaskById error:', e);
    res.status(500).json({ error: 'Failed to load task' });
  }
};

// ---------- draft & submit ----------
exports.saveDraft = async (req, res) => {
  const { taskId } = req.params;
  const { draft = {}, note } = req.body || {};
  try {
    const { rows: [row] } = await pool.query(
      `UPDATE workflow_tasks
          SET status = 'Draft',
              data   = COALESCE(data,'{}'::jsonb) || jsonb_build_object('draft', $1::jsonb, 'note', $2)
        WHERE id=$3
      RETURNING id, status, data`,
      [draft, note ?? null, taskId]
    );
    if (!row) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, task: row });
  } catch (e) {
    console.error('saveDraft error:', e);
    res.status(500).json({ error: 'Failed to save draft' });
  }
};

exports.submitTask = async (req, res) => {
  const { taskId } = req.params;
  const { formData = {}, payloadMerge = {}, status = 'Completed' } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // get task + instance
    const { rows: [task] } = await client.query(
      `SELECT t.id, t.instance_id, t.node_id, i.workflow_id, i.payload
         FROM workflow_tasks t
         JOIN workflow_instances i ON i.id = t.instance_id
        WHERE t.id=$1 FOR UPDATE`, [taskId]
    );
    if (!task) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Task not found' }); }

    // 1) store submission on the task
    await client.query(
      `UPDATE workflow_tasks
          SET status=$1, completed_at=NOW(),
              data = COALESCE(data,'{}'::jsonb) || jsonb_build_object('submission', $2::jsonb)
        WHERE id=$3`,
      [status, formData, taskId]
    );

    // 2) merge into instance payload
    const merged = Object.keys(payloadMerge).length ? payloadMerge : formData;
    await client.query(
      `UPDATE workflow_instances SET payload = COALESCE(payload,'{}'::jsonb) || $1::jsonb WHERE id=$2`,
      [merged, task.instance_id]
    );

    // 3) figure next actionable nodes
    const { rows: [inst] } = await client.query(`SELECT payload FROM workflow_instances WHERE id=$1`, [task.instance_id]);
    const context = inst?.payload || {};
    const nextNodes = await traverseFrom(client, task.workflow_id, task.node_id, context);

    // 4) create new tasks
    const createdTasks = [];
    for (const n of nextNodes) {
      const assigned = n.config?.assigned_user_id ?? null; // your designer can set this, or map from participants
      const { rows: [nt] } = await client.query(
        `INSERT INTO workflow_tasks(instance_id, node_id, assigned_to, status, data)
         VALUES ($1,$2,$3,'Pending',$4) RETURNING id`,
        [task.instance_id, n.id, assigned, {}]
      );
      createdTasks.push(nt.id);
    }

    await client.query('COMMIT');

    // audit (best-effort)
    try {
      await pool.query(
        `INSERT INTO workflow_audit(workflow_id, instance_id, actor_id, event, detail)
         SELECT i.workflow_id, t.instance_id, $1, 'task.completed',
                jsonb_build_object('taskId', t.id, 'status', $2)
           FROM workflow_tasks t
           JOIN workflow_instances i ON i.id=t.instance_id
          WHERE t.id=$3`,
        [req.user?.id ?? null, status, taskId]
      );
    } catch (e) { console.warn('audit insert failed (task completed):', e.message); }

    res.json({ ok: true, completedTaskId: taskId, createdTasks });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('submitTask error:', e);
    res.status(500).json({ error: 'Failed to submit task' });
  } finally {
    client.release();
  }
};