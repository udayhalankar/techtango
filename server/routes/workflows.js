// server/routes/workflows.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

/* ---------------- helpers ---------------- */
const safeJson = (x, d = {}) => { try { return typeof x === 'string' ? JSON.parse(x || '{}') : (x || d); } catch { return d; } };
const getUserEmail = (req) => (req.user && (req.user.email || req.user.username)) || 'anonymous@local';

// Accept numbers, emails, or objects {id,email} and return a normalized recipient.
function pickRecipient(recips) {
  if (!Array.isArray(recips) || recips.length === 0) return { id: null, email: null };
  const r = recips[0];
  if (typeof r === 'number') return { id: r, email: null };
  if (typeof r === 'string') {
    const s = r.trim();
    const asNum = Number(s);
    if (Number.isFinite(asNum) && String(asNum) === s) return { id: asNum, email: null };
    if (/@/.test(s)) return { id: null, email: s };
    return { id: null, email: null };
  }
  if (r && typeof r === 'object') {
    const id = Number(r.id);
    const email = r.email && String(r.email).trim();
    return { id: Number.isFinite(id) ? id : null, email: email || null };
  }
  return { id: null, email: null };
}

/* ---------------- runtime tables ---------------- */
let _runtimeEnsured = false;
async function ensureRuntimeTables() {
  if (_runtimeEnsured) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id               BIGSERIAL PRIMARY KEY,
        workflow_row_id  INTEGER NOT NULL,
        workflow_id      BIGINT,
        workflow_name    TEXT,
        version          INTEGER,
        master_form_id   INTEGER,
        master_row_id    BIGINT,
        started_by       TEXT,
        started_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        status           TEXT
      );

      CREATE TABLE IF NOT EXISTS workflow_tasks (
        id             BIGSERIAL PRIMARY KEY,
        instance_id    BIGINT REFERENCES workflow_instances(id) ON DELETE CASCADE,
        node_id        TEXT,
        node_type      TEXT,
        form_id        INTEGER,
        assignee_id    BIGINT,
        assignee_email TEXT,
        status         TEXT DEFAULT 'Pending',
        created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE workflow_tasks
        ADD COLUMN IF NOT EXISTS assignee_email TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wi_started_by ON workflow_instances (started_by);
      CREATE INDEX IF NOT EXISTS idx_wi_rowid      ON workflow_instances (workflow_row_id);
      CREATE INDEX IF NOT EXISTS idx_wt_instance   ON workflow_tasks (instance_id);
      CREATE INDEX IF NOT EXISTS idx_wt_assignee   ON workflow_tasks (assignee_id);
      CREATE INDEX IF NOT EXISTS idx_wt_status     ON workflow_tasks (status);
    `);

    await client.query('COMMIT');
    _runtimeEnsured = true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* === unified start handler === */
async function startWorkflowHandler(req, res) {
  const { id } = req.params;
  const { formId, masterId } = req.body || {};
  const starter = getUserEmail(req);

  const client = await pool.connect();
  try {
    await ensureRuntimeTables();
    await client.query('BEGIN');

    const wfRow = await client.query(
      `SELECT id, name, version, graph
         FROM workflows
        WHERE id = $1`,
      [id]
    );
    if (wfRow.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const wf = wfRow.rows[0];
    const graph = safeJson(wf.graph, { workflowMeta: {}, nodes: [], edges: [] });
    const meta  = graph.workflowMeta || {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const initiatorFormId = meta.initiatorFormId ?? (formId ? Number(formId) : null);

    const inst = await client.query(
      `INSERT INTO workflow_instances
         (workflow_row_id, workflow_id, workflow_name, version,
          master_form_id, master_row_id, started_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Running')
       RETURNING id`,
      [wf.id, wf.id, wf.name, wf.version || 1,
       initiatorFormId, masterId ? Number(masterId) : null, starter]
    );
    const instanceId = inst.rows[0].id;

    // First Form after Initiator
    const initNode = nodes.find(n => n.type === 'initiator');
    let nextFormId = null, nextNodeId = null, assigneeId = null, assigneeEmail = null;

    if (initNode) {
      const outEdge = edges.find(e => String(e.source) === String(initNode.id));
      if (outEdge) {
        const tgt = nodes.find(n => String(n.id) === String(outEdge.target));
        if (tgt && tgt.type === 'form') {
          nextNodeId = String(tgt.id);
          nextFormId = tgt?.data?.formId || null;
          const { id: aid, email: aemail } = pickRecipient(tgt?.data?.recipients);
          assigneeId = aid;
          assigneeEmail = aemail;
        }
      }
    }

    // Create first task
    let taskId = null;
    if (nextFormId) {
      const taskIns = await client.query(
        `INSERT INTO workflow_tasks
           (instance_id, node_id, node_type, form_id, assignee_id, assignee_email, status)
         VALUES ($1,$2,'form',$3,$4,$5,'Pending')
         RETURNING id`,
        [instanceId, nextNodeId || 'n/a', nextFormId, assigneeId, assigneeEmail]
      );
      taskId = taskIns.rows[0].id;
    }

    await client.query('COMMIT');
    return res.json({
      instanceId,
      initiatorFormId,
      masterRowId: masterId ? Number(masterId) : null,
      next: nextFormId ? { formId: nextFormId, taskId } : null,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /workflows/start failed:', e);
    return res.status(500).json({ error: 'Failed to start workflow', detail: e.detail || e.message });
  } finally {
    client.release();
  }
}

// both URLs
router.post('/start/:id', verifyToken, startWorkflowHandler);
router.post('/:id/start', verifyToken, startWorkflowHandler);

/* ---------------- list, initiable, check-name, get, create, update, delete (your existing) ---------------- */
// GET all workflows
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, version, created_at FROM workflows ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Workflows with an Initiator (for “New Workflow” list)
router.get('/initiable', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, description, version, created_at, graph
         FROM workflows
        ORDER BY created_at DESC`
    );
    const rows = r.rows
      .map(row => {
        const g = safeJson(row.graph, {});
        return { ...row, initiator_form_id: g?.workflowMeta?.initiatorFormId || null };
      })
      .filter(x => !!x.initiator_form_id);
    res.json(rows);
  } catch (e) {
    console.error('GET /workflows/initiable failed:', e);
    res.status(500).json({ error: 'Failed to load initiable workflows' });
  }
});

router.get('/check-name', async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) return res.json({ unique: false });
  try {
    const r = await pool.query(`SELECT 1 FROM workflows WHERE LOWER(name)=LOWER($1) LIMIT 1`, [name]);
    res.json({ unique: r.rowCount === 0 });
  } catch (e) {
    console.warn('check-name failed (treating as unique):', e.message);
    res.json({ unique: true });
  }
});

// GET one for Designer
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      `SELECT id, name, description, version, COALESCE(graph, '{}') AS graph
       FROM workflows
       WHERE id = $1`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    let graph = {};
    try {
      graph = typeof r.rows[0].graph === 'string'
        ? JSON.parse(r.rows[0].graph)
        : r.rows[0].graph;
    } catch {}

    const fallback = {
      workflowMeta: {
        name: r.rows[0].name,
        description: r.rows[0].description,
        initiatorFormId: null,
        participantIds: []
      },
      nodes: [],
      edges: []
    };

    res.json(graph.workflowMeta ? graph : fallback);
  } catch (e) {
    console.error('GET /workflows/:id failed:', e);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// CREATE (supports graph + simple steps)
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isGraph = !!(req.body && (req.body.workflowMeta || req.body.nodes || req.body.edges));
    if (isGraph) {
      const { workflowMeta = {}, nodes = [], edges = [] } = req.body;
      const wfName = (workflowMeta.name || 'Untitled Workflow').trim();
      const wfDescription = workflowMeta.description || '';
      const graph = { workflowMeta, nodes, edges };

      const ins = await client.query(
        `INSERT INTO workflows (name, description, version, graph)
         VALUES ($1, $2, 1, $3)
         RETURNING id, version`,
        [wfName, wfDescription, JSON.stringify(graph)]
      );

      await client.query('COMMIT');
      return res.status(201).json({ workflowId: ins.rows[0].id, version: ins.rows[0].version });
    }

    const { name, description = '', steps = [], createdBy = 'admin@example.com' } = req.body || {};
    if (!name || !name.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'name is required' });
    }

    const wf = await client.query(
      `INSERT INTO workflows (name, description, created_by, version)
       VALUES ($1, $2, $3, 1)
       RETURNING id, version`,
      [name.trim(), description, createdBy]
    );
    const workflowId = wf.rows[0].id;

    if (Array.isArray(steps) && steps.length > 0) {
      const stepValues = steps.map((step, index) => [
        workflowId,
        index + 1,
        step.stepName || '',
        step.assignedUser || null,
        step.ccList ? step.ccList.split(',').map(s => s.trim()) : [],
        step.actionType || null,
        step.sendEmailTo || null,
        step.sendOnApprove || null,
        step.sendOnReject || null,
        step.sendOnRefer || null,
        step.sendOnSubmit || null,
      ]);
      const insertStepQuery = `
        INSERT INTO workflow_steps (
          workflow_id, step_number, step_name, assigned_user, cc_list,
          action_type, send_email_to, on_approve_send_to, on_reject_send_to,
          on_refer_send_to, on_submit_send_to
        )
        VALUES ${stepValues.map((_, i) =>
          `($${i*11+1},$${i*11+2},$${i*11+3},$${i*11+4},$${i*11+5},$${i*11+6},$${i*11+7},$${i*11+8},$${i*11+9},$${i*11+10},$${i*11+11})`
        ).join(', ')}`;
      await client.query(insertStepQuery, stepValues.flat());
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Workflow created successfully', workflowId, version: wf.rows[0].version });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving workflow:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  } finally {
    client.release();
  }
});

// UPDATE
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, workflowMeta, nodes, edges } = req.body || {};
  try {
    if (workflowMeta || nodes || edges) {
      const graph = { workflowMeta: workflowMeta || {}, nodes: nodes || [], edges: edges || [] };
      await pool.query(
        `UPDATE workflows
           SET name = COALESCE($1, name),
               description = COALESCE($2, description),
               graph = $3
         WHERE id = $4`,
        [name, description, JSON.stringify(graph), id]
      );
    } else {
      await pool.query(
        `UPDATE workflows
           SET name = COALESCE($1, name),
               description = COALESCE($2, description)
         WHERE id = $3`,
        [name, description, id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /workflows/:id failed:', e);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

router.patch('/:id', verifyToken, async (req, res, next) => {
  req.method = 'PUT';
  next();
}, router);

// DELETE
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM workflow_steps WHERE workflow_id = $1`, [id]);
    await client.query(`DELETE FROM workflows WHERE id = $1`, [id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('DELETE /workflows/:id failed:', e);
    res.status(500).json({ error: 'Failed to delete workflow' });
  } finally {
    client.release();
  }
});

module.exports = router;


