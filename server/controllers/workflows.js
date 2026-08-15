const pool = require('../db');


// Optional: keep a list of node types you expect
const KNOWN_NODE_TYPES = new Set(['initiator','form','process','evaluate','email','approval','end']);

// POST /api/workflows
// body: { workflowMeta, nodes, edges }
// exports.createWorkflow = async (req, res) => {
//   try {
//     const { workflowMeta = {}, nodes = [], edges = [] } = req.body || {};
//     const name = (workflowMeta.name || '').trim();
//     const description = workflowMeta.description ?? null;
//     const createdBy = req.user?.id ?? req.body.createdBy ?? null;

//     if (!name) return res.status(400).json({ error: 'Workflow name required' });
//     if (!Array.isArray(nodes) || !Array.isArray(edges)) {
//       return res.status(400).json({ error: 'Both "nodes" and "edges" must be arrays' });
//     }

//     // Minimal validation (full validation can be added later)
//     const initiatorCount = nodes.filter(n => n?.type === 'initiator').length;
//     if (initiatorCount !== 1) {
//       return res.status(400).json({ error: 'Workflow must contain exactly one initiator node' });
//     }
//     for (const n of nodes) {
//       if (!KNOWN_NODE_TYPES.has(n.type)) {
//         return res.status(400).json({ error: `Unknown node type: ${n.type}` });
//       }
//     }

//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');

//       // Next version for this workflow name
//       const { rows: [v] } = await client.query(
//         'SELECT COALESCE(MAX(version),0)+1 AS v FROM workflows WHERE name=$1',
//         [name]
//       );
//       const version = Number(v.v);

//       const { rows: [wf] } = await client.query(
//         `INSERT INTO workflows(name, description, created_by, version)
//          VALUES ($1,$2,$3,$4)
//          RETURNING id`,
//         [name, description, createdBy, version]
//       );
//       const workflowId = wf.id;

//       // Insert nodes and remember id mapping (clientId -> dbId)
//       const idMap = new Map();
//       for (const n of nodes) {
//         const position = n.position || {};
//         const config   = n.data || {};
//         const { rows: [row] } = await client.query(
//           `INSERT INTO workflow_nodes(workflow_id, type, config, position)
//            VALUES ($1,$2,$3,$4) RETURNING id`,
//           [workflowId, n.type, config, position]
//         );
//         idMap.set(String(n.id), row.id);
//       }

//       // Insert edges using the id map
//       for (const e of edges) {
//         const srcDbId = idMap.get(String(e.source));
//         const tgtDbId = idMap.get(String(e.target));
//         if (!srcDbId || !tgtDbId) {
//           throw new Error(`Edge refers to unknown node (source:${e.source}, target:${e.target})`);
//         }
//         await client.query(
//           `INSERT INTO workflow_edges(workflow_id, source_node_id, target_node_id, condition)
//            VALUES ($1,$2,$3,$4)`,
//           [workflowId, srcDbId, tgtDbId, e.sourceHandle || e.condition || null]
//         );
//       }

//       await client.query('COMMIT');
//       return res.json({ ok: true, workflowId, version });
//     } catch (txErr) {
//       await client.query('ROLLBACK');
//       console.error('createWorkflow tx failed:', txErr);
//       return res.status(500).json({ error: 'Failed to save workflow' });
//     } finally {
//       client.release();
//     }
//   } catch (outerErr) {
//     console.error('createWorkflow error:', outerErr);
//     return res.status(500).json({ error: 'Unexpected server error' });
//   }
// };


exports.createWorkflow = async (req, res) => {
  try {
    const { workflowMeta = {}, nodes = [], edges = [] } = req.body || {};
    const name = (workflowMeta.name || '').trim();
    const description = workflowMeta.description ?? null;
    const createdBy = req.user?.id ?? req.body.createdBy ?? null;

    if (!name) return res.status(400).json({ error: 'Workflow name required' });
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: '"nodes" and "edges" must be arrays' });
    }
    if (!nodes.length) {
      return res.status(400).json({ error: 'At least one node is required' });
    }

    // --- Basic node checks ---
    const initiators = nodes.filter(n => n?.type === 'initiator');
    if (initiators.length !== 1) {
      return res.status(400).json({ error: 'Workflow must contain exactly one initiator node' });
    }
    for (const n of nodes) {
      if (!KNOWN_NODE_TYPES.has(n.type)) {
        return res.status(400).json({ error: `Unknown node type: ${n.type}` });
      }
    }

    // --- Pre-insert graph validation using client IDs ---
    const nodeIdSet = new Set(nodes.map(n => String(n.id)));
    for (const e of edges) {
      if (!nodeIdSet.has(String(e.source)) || !nodeIdSet.has(String(e.target))) {
        return res.status(400).json({ error: `Edge refers to unknown node (source:${e.source}, target:${e.target})` });
      }
    }

    // Build adjacency and out-degree
    const adj = new Map();
    const outdeg = new Map();
    for (const n of nodes) { adj.set(String(n.id), []); outdeg.set(String(n.id), 0); }
    for (const e of edges) {
      const s = String(e.source), t = String(e.target);
      adj.get(s).push({ target: t, condition: e.sourceHandle || e.condition || null });
      outdeg.set(s, (outdeg.get(s) || 0) + 1);
    }

    // Reachability from initiator
    const initId = String(initiators[0].id);
    const q = [initId];
    const seen = new Set([initId]);
    while (q.length) {
      const cur = q.shift();
      for (const { target } of adj.get(cur) || []) {
        if (!seen.has(target)) { seen.add(target); q.push(target); }
      }
    }

    // Terminal nodes = reachable nodes with no outgoing edges
    const reachableTerminals = [...seen].filter(id => (outdeg.get(id) || 0) === 0);
    if (reachableTerminals.length === 0) {
      return res.status(400).json({ error: 'No terminal path: add at least one node reachable from Initiator with no outgoing edges (or an explicit "end" node).' });
    }

    // --- Insert (as before) ---
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [v] } = await client.query(
        'SELECT COALESCE(MAX(version),0)+1 AS v FROM workflows WHERE name=$1',
        [name]
      );
      const version = Number(v.v);

      const { rows: [wf] } = await client.query(
        `INSERT INTO workflows(name, description, created_by, version)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [name, description, createdBy, version]
      );
      const workflowId = wf.id;

      const idMap = new Map();
      for (const n of nodes) {
        const { rows: [row] } = await client.query(
          `INSERT INTO workflow_nodes(workflow_id, type, config, position)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [workflowId, n.type, n.data || {}, n.position || {}]
        );
        idMap.set(String(n.id), row.id);
      }

      for (const e of edges) {
        await client.query(
          `INSERT INTO workflow_edges(workflow_id, source_node_id, target_node_id, condition)
           VALUES ($1,$2,$3,$4)`,
          [workflowId, idMap.get(String(e.source)), idMap.get(String(e.target)), e.sourceHandle || e.condition || null]
        );
      }

      await client.query('COMMIT');
      await pool.query(
  `INSERT INTO workflow_audit(workflow_id, actor_id, event, detail)
   VALUES ($1,$2,'workflow.created',$3)`,
  [workflowId, createdBy, { version }]
);
      return res.json({ ok: true, workflowId, version });
      
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('createWorkflow tx failed:', txErr);
      return res.status(500).json({ error: 'Failed to save workflow' });
    } finally {
      client.release();
    }
  } catch (outerErr) {
    console.error('createWorkflow error:', outerErr);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};







// POST /api/workflows/start/:workflowId
exports.getWorkflowById = async (req, res) => {
  const { workflowId } = req.params;
  const client = await pool.connect();
  try {
    const { rows: wfRows } = await client.query(
      `SELECT id, name, description, version, created_by, created_at
       FROM workflows WHERE id=$1`, [workflowId]
    );
    if (wfRows.length === 0) return res.status(404).json({ error: 'Workflow not found' });
    const wf = wfRows[0];

    const { rows: nodeRows } = await client.query(
      `SELECT id, type, config AS data, position
       FROM workflow_nodes WHERE workflow_id=$1 ORDER BY id`, [workflowId]
    );

    const { rows: edgeRows } = await client.query(
      `SELECT id, source_node_id AS source, target_node_id AS target, condition
       FROM workflow_edges WHERE workflow_id=$1 ORDER BY id`, [workflowId]
    );

    // Map condition => sourceHandle ('true'/'false' only)
    const edges = edgeRows.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: (e.condition === 'true' || e.condition === 'false') ? e.condition : null
    }));

    return res.json({
      workflowMeta: {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        version: wf.version,
        created_by: wf.created_by,
        created_at: wf.created_at
      },
      nodes: nodeRows,
      edges
    });
  } catch (err) {
    console.error('getWorkflowById error:', err);
    return res.status(500).json({ error: 'Failed to load workflow' });
  } finally {
    client.release();
  }
};


// GET /api/workflows/:id
exports.getWorkflow = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const { rows: wfRows } = await pool.query(
      `SELECT id, name, description, version, created_by, created_at
         FROM workflows WHERE id=$1`,
      [id]
    );
    if (wfRows.length === 0) return res.status(404).json({ error: 'workflow not found' });
    const meta = wfRows[0];

    const { rows: nodeRows } = await pool.query(
      `SELECT id, type, COALESCE(config,'{}'::jsonb) AS config,
              COALESCE(position,'{"x":0,"y":0}'::jsonb) AS position
         FROM workflow_nodes
        WHERE workflow_id=$1
        ORDER BY id`,
      [id]
    );
    const nodes = nodeRows.map(r => ({
      id: String(r.id),
      type: r.type,
      position: r.position,
      data: r.config
    }));

    const { rows: edgeRows } = await pool.query(
      `SELECT id, source_node_id, target_node_id, condition
         FROM workflow_edges
        WHERE workflow_id=$1
        ORDER BY id`,
      [id]
    );
    const edges = edgeRows.map(r => ({
      id: String(r.id),
      source: String(r.source_node_id),
      target: String(r.target_node_id),
      sourceHandle: r.condition || null
    }));

    res.json({
      workflowMeta: {
        id: meta.id,
        name: meta.name,
        description: meta.description ?? null,
        version: meta.version,
        created_by: meta.created_by,
        created_at: meta.created_at
      },
      nodes,
      edges
    });
  } catch (e) {
    console.error('getWorkflow error:', e);
    res.status(500).json({ error: 'Failed to load workflow' });
  }
};

// body: { startedBy?, payload? }
exports.startWorkflow = async (req, res) => {
  const { workflowId } = req.params;
  const startedBy = req.user?.id ?? req.body.startedBy ?? null;
  const payload   = req.body?.payload || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ensure workflow exists
    const wfExists = await client.query('SELECT 1 FROM workflows WHERE id=$1', [workflowId]);
    if (wfExists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // create instance
    const { rows: [inst] } = await client.query(
      `INSERT INTO workflow_instances(workflow_id, started_by, payload)
       VALUES ($1,$2,$3)
       RETURNING id, status, started_at`,
      [workflowId, startedBy, payload]
    );
    const instanceId = inst.id;

    // find initiator node
    const { rows: [init] } = await client.query(
      `SELECT id FROM workflow_nodes
       WHERE workflow_id=$1 AND type='initiator' LIMIT 1`,
      [workflowId]
    );
    if (!init) throw new Error('Initiator node not found');

    // immediate next nodes from initiator
    const { rows: nextNodes } = await client.query(
      `SELECT n.id, n.type, n.config
       FROM workflow_edges e
       JOIN workflow_nodes n ON n.id = e.target_node_id
       WHERE e.workflow_id=$1 AND e.source_node_id=$2`,
      [workflowId, init.id]
    );

    // create tasks for actionable nodes
    const actionable = new Set(['form','approval','process','email']);
    const createdTasks = [];
    for (const n of nextNodes) {
      if (actionable.has(n.type)) {
        const assigned = n.config?.assigned_user_id ?? null;
        const { rows: [task] } = await client.query(
          `INSERT INTO workflow_tasks(instance_id, node_id, assigned_to, status, data)
           VALUES ($1,$2,$3,'Pending',$4) RETURNING id`,
          [instanceId, n.id, assigned, {}]
        );
        createdTasks.push(task.id);
      }
      // evaluate nodes will be handled by the runtime step logic (next upgrade)
    }

    await client.query('COMMIT');
    await pool.query(
    `INSERT INTO workflow_audit(workflow_id, instance_id, actor_id, event, detail)
    VALUES ($1,$2,$3,'instance.started',$4)`,
    [Number(workflowId), instanceId, startedBy, {}]
    );
    return res.json({
      ok: true,
      instanceId,
      createdTasks,
      next: nextNodes.map(n => ({ nodeId: n.id, type: n.type }))
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('startWorkflow error:', err);
    return res.status(500).json({ error: 'Failed to start workflow' });
  } finally {
    client.release();
  }
};


// controllers/workflows.js
exports.listVersionsByName = async (req, res) => {
  const { name } = req.params;
  const { rows } = await pool.query(
    `SELECT id, version, created_at, created_by
       FROM workflows WHERE name=$1 ORDER BY version DESC`, [name]
  );
  res.json(rows);
};


exports.listLaunchableWorkflows = async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT w.id, w.name, w.version,
              (SELECT n.config->>'formId'
                 FROM workflow_nodes n
                WHERE n.workflow_id = w.id AND n.type='initiator'
                LIMIT 1) AS initiator_form_id
         FROM workflows w
        ORDER BY w.name, w.version DESC`
    );
    // Filter out workflows that don't have an initiator form configured
    const out = rows.filter(r => r.initiator_form_id);
    return res.json(out);
  } catch (e) {
    console.error('listLaunchableWorkflows error:', e);
    return res.status(500).json({ error: 'Failed to list workflows' });
  } finally {
    client.release();
  }
};

exports.listInitiable = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.name, w.version,
              (n.config->>'formId')::int AS initiator_form_id
         FROM workflows w
         JOIN workflow_nodes n
           ON n.workflow_id = w.id AND n.type = 'initiator'
        WHERE (n.config->>'formId') IS NOT NULL
        ORDER BY w.created_at DESC NULLS LAST, w.id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('listInitiable error:', e);
    res.status(500).json({ error: 'Failed to load workflows' });
  }
};

exports.listWorkflows = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, version, created_by, created_at
         FROM workflows
        ORDER BY created_at DESC NULLS LAST, id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('listWorkflows error:', e);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
};



