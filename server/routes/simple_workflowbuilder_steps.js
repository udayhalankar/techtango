// server/routes/simple_workflowbuilder_steps.js
const express = require('express');
const pool = require('../db');
const {
  resolveNextStepsForWorkflow,
  deriveUiActions,
  deriveAttachmentAccess,
  validateStepConfig,
  validateBulkCreateStep,
  validateBulkCreateSequence,
} = require('../rules/SimpleWorkflowRules');

const ATTACH_MODES = ['view_upload', 'none', 'view_only', 'upload_only'];

function coerceJsonb(value, fallback) {
  if (value == null) return JSON.stringify(fallback);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return JSON.stringify(fallback);
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_) {
      return JSON.stringify(fallback);
    }
  }
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify(fallback);
  }
}

module.exports = function simpleWorkflowbuilderStepsRouter() {
  const router = express.Router();

  // Utility: fetch steps for a workflow respecting tenant
  async function fetchSteps(client, workflowId, tenantId) {
    const args = [workflowId];
    let where = 'workflow_id = $1';
    if (tenantId) {
      args.push(tenantId);
      where += ` AND (tenant_id = $${args.length} OR tenant_id IS NULL)`;
    }
    const { rows } = await client.query(
      `
        SELECT *
          FROM public.simple_workflowbuilder_steps
         WHERE ${where}
         ORDER BY step_no ASC, id ASC
      `,
      args
    );
    return rows;
  }

  async function normalizeNextSteps(client, workflowId, tenantId) {
    const steps = await fetchSteps(client, workflowId, tenantId);
    if (!steps.length) return steps;

    const nextMap = resolveNextStepsForWorkflow(steps);
    for (const row of nextMap) {
      await client.query(
        `
          UPDATE public.simple_workflowbuilder_steps
             SET next_step_after_approve = $1::integer,
                 next_step_after_reject  = $2::integer
           WHERE id = $3::bigint
        `,
        [row.next_step_after_approve, row.next_step_after_reject, row.id]
      );
    }

    return steps;
  }

  // Basic watchdog + trace so timeouts don’t look like “hangs”
  router.use((req, res, next) => {
    res.setTimeout(15000, () => {
      if (!res.headersSent) {
        console.warn(`[SWFS] timeout ${req.method} ${req.originalUrl}`);
        res.status(504).json({ error: 'steps route timeout' });
      }
    });
    console.log(`[SWFS] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Put echo FIRST so it never hits param routes
  router.get('/__echo', (req, res) => {
    return res.json({ ok: true, at: Date.now() });
  });




// INITIATE fetch (strict: step_no must be 0)
router.get('/init/:workflowId?', async (req, res) => {
  try {
    const wid = Number(req.params.workflowId ?? req.query.workflow_id);
    if (!Number.isFinite(wid) || wid <= 0) {
      return res.status(400).json({ error: 'Invalid workflow_id' });
    }

    // header
    const hdrQ = `
      SELECT id, workflow_map_name, workflow_table_name, tenant_id, version_info
      FROM public.simple_workflowbuilder
      WHERE id = $1
    `;
    const { rows: hdrRows } = await pool.query(hdrQ, [wid]);
    if (!hdrRows.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // get ALL steps ordered
    const stpQ = `
      SELECT *
      FROM public.simple_workflowbuilder_steps
      WHERE workflow_id = $1
      ORDER BY step_no ASC, id ASC
    `;
    const { rows: steps } = await pool.query(stpQ, [wid]);
    if (!steps.length) {
      return res
        .status(404)
        .json({ error: 'INITIATE step not defined for this workflow' });
    }

    const initStep = steps.find(s => Number(s.step_no) === 0);
    if (!initStep) {
      return res
        .status(404)
        .json({ error: 'INITIATE step (step_no=0) not defined for this workflow' });
    }
    const stepType = String(initStep.step_type || '').trim().toLowerCase();
    if (stepType !== 'create') {
      return res.status(400).json({ error: 'INITIATE step must be step_type=create' });
    }
    const stepValidation = validateStepConfig(initStep);
    if (stepValidation) {
      return res.status(400).json({ error: stepValidation });
    }
    let initStepWithRules;
    try {
      initStepWithRules = {
        ...initStep,
        attachment_access: deriveAttachmentAccess(initStep.attachments_allowed),
        ui_actions: deriveUiActions(initStep),
      };
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    return res.json({ header: hdrRows[0], step: initStepWithRules });
  } catch (e) {
    console.error('[steps/init]', e);
    return res.status(500).json({ error: 'Failed to load initiate step' });
  }
});








  router.delete('/:stepId(\\d+)', async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    if (!Number.isFinite(stepId) || stepId <= 0) {
      return res.status(400).json({ error: 'Invalid step id' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load target to get workflow_id and tenant
      const { rows: tgtRows } = await client.query(
        `SELECT id, workflow_id, tenant_id, step_name FROM public.simple_workflowbuilder_steps WHERE id = $1 LIMIT 1`,
        [stepId]
      );
      if (!tgtRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Step not found' });
      }
      const tgt = tgtRows[0];
      const tenantId = tgt.tenant_id;
      const workflowId = tgt.workflow_id;
      const name = String(tgt.step_name || '').trim().toLowerCase();
      if (name === 'initiate' || name === 'terminate') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot delete INITIATE or TERMINATE' });
      }

      // Delete
      await client.query(
        `DELETE FROM public.simple_workflowbuilder_steps WHERE id = $1`,
        [stepId]
      );

      // Resequence step_no for remaining steps (order by step_no,id)
      const args = [workflowId];
      let where = 'workflow_id = $1';
      if (tenantId) {
        args.push(tenantId);
        where += ` AND (tenant_id = $${args.length} OR tenant_id IS NULL)`;
      }
      const { rows: remain } = await client.query(
        `
          SELECT *
            FROM public.simple_workflowbuilder_steps
           WHERE ${where}
           ORDER BY step_no ASC, id ASC
        `,
        args
      );

      let idx = 0;
      for (const s of remain) {
        // Preserve terminate at the end; we still resequence its number to the last index
        await client.query(
          `
            UPDATE public.simple_workflowbuilder_steps
               SET step_no = $1,
                   date_modified = now()
             WHERE id = $2
          `,
          [idx, s.id]
        );
        idx += 1;
      }

      await normalizeNextSteps(client, workflowId, tenantId);

      const { rows: updated } = await client.query(
        `SELECT * FROM public.simple_workflowbuilder_steps WHERE workflow_id = $1 ORDER BY step_no ASC, id ASC`,
        [workflowId]
      );

      await client.query('COMMIT');
      return res.json({ steps: updated });
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('swfs:delete+reseq', e);
      return res.status(500).json({ error: 'Failed to delete step' });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('swfs:delete', e.message);
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

  // LIST steps for a workflow
  // GET /api/simple_workflowbuilder/steps/:id   (numeric only)
  router.get('/:id(\\d+)', async (req, res) => {
    try {
      const workflowId = Number(req.params.id);
      const { rows } = await pool.query(
        `
        SELECT *
          FROM public.simple_workflowbuilder_steps
         WHERE workflow_id = $1
         ORDER BY step_no ASC, id ASC
        `,
        [workflowId]
      );
      return res.json(rows);
    } catch (e) {
      console.error('swfs:list', { message: e.message, code: e.code, detail: e.detail });
      return res.status(500).json({ error: 'Failed to list steps' });
    }
  });

  // INSERT a step at a specific position (renumber following steps)
  // POST /api/simple_workflowbuilder/steps/:workflowId/insert
  router.post('/:workflowId(\\d+)/insert', async (req, res) => {
    const client = await pool.connect();
    try {
      const workflowId = Number(req.params.workflowId);
      const step_name = (req.body?.step_name || '').toString().trim();
      const afterStepIdRaw = req.body?.after_step_id;
      const afterStepId = afterStepIdRaw == null ? null : Number(afterStepIdRaw);

      if (!Number.isFinite(workflowId) || workflowId <= 0) {
        return res.status(400).json({ error: 'Invalid workflow_id' });
      }
      if (!step_name) {
        return res.status(400).json({ error: 'step_name is required' });
      }

      await client.query('BEGIN');

      // fetch ordered steps
      const { rows: steps } = await client.query(
        `SELECT id, step_no, step_name FROM public.simple_workflowbuilder_steps WHERE workflow_id = $1 ORDER BY step_no ASC, id ASC`,
        [workflowId]
      );
      if (!steps.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No steps exist for this workflow' });
      }

      const term = steps.find(s => String(s.step_name || '').toUpperCase() === 'TERMINATE');
      const allowedTargets = steps.filter(s => !term || s.id !== term.id); // exclude terminate from "Add After"

      let afterStep = null;
      if (afterStepId != null) {
        afterStep = allowedTargets.find(s => Number(s.id) === afterStepId);
        if (!afterStep) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'after_step_id is invalid or refers to Terminate' });
        }
      } else {
        afterStep = allowedTargets[allowedTargets.length - 1]; // default: last non-terminate
      }

      const insertAt = (afterStep ? Number(afterStep.step_no) : -1) + 1;
      const maxStepNo = steps.reduce(
        (max, s) => (Number.isFinite(Number(s.step_no)) ? Math.max(max, Number(s.step_no)) : max),
        -1
      );
      const nextStepAfterApprove = insertAt <= maxStepNo ? insertAt + 1 : null;

      // bump step_no and next-step pointers for existing steps at/after insert position
      await client.query(
        `UPDATE public.simple_workflowbuilder_steps
            SET step_no = step_no + 1,
                next_step_after_approve = CASE WHEN next_step_after_approve >= $2 THEN next_step_after_approve + 1 ELSE next_step_after_approve END,
                next_step_after_reject  = CASE WHEN next_step_after_reject  >= $2 THEN next_step_after_reject  + 1 ELSE next_step_after_reject  END,
                date_modified = now(),
                modified_by = $3::bigint
          WHERE workflow_id = $1 AND step_no >= $2`,
        [workflowId, insertAt, req.user?.id || null]
      );
      if (afterStep) {
        await client.query(
          `UPDATE public.simple_workflowbuilder_steps
              SET next_step_after_approve = $1::integer,
                  date_modified = now(),
                  modified_by = $2::bigint
            WHERE id = $3::bigint`,
          [insertAt, req.user?.id || null, afterStep.id]
        );
      }

      const userId   = req.user?.id || null;
      const tenantId = req.user?.tenant_id || null;

      // Defaults for the new step. Reuse form configuration/version from the nearest non-terminate step (afterStep) if present.
      const templateStep = afterStep || steps.find(s => String(s.step_name || '').toUpperCase() !== 'TERMINATE');
      const templateFormCfg = templateStep?.step_form_configuration || {};
      const templateVersionInfo = templateStep?.version_info || {};

      const step_type = 'update';
      const step_action = 'approve';
      const step_performer = null;
      const attachments_allowed = 'none';
      const review_allowed = false;
      const next_step_after_approve = nextStepAfterApprove;
      const next_step_after_reject = null;
      const mail_notification_users = JSON.stringify([]);
      const step_form_configuration = JSON.stringify(templateFormCfg || {});
      const mail_content = JSON.stringify(templateStep?.mail_content || {});
      const version_info = JSON.stringify(templateVersionInfo || {});
      const step_due_in_days = 1;

      const { rows: inserted } = await client.query(
        `
        INSERT INTO public.simple_workflowbuilder_steps (
          date_created, date_modified, created_by, modified_by,
          workflow_id, step_name, step_type, step_action, step_performer,
          attachments_allowed, review_allowed,
          next_step_after_approve, next_step_after_reject,
          mail_notification_users,
          mail_content,
          step_form_configuration,
          tenant_id, version_info, step_due_in_days, step_no
        ) VALUES (
          now(), now(), $1::bigint, $1::bigint,
          $2::bigint, $3, $4, $5, $6::integer,
          $7, $8::boolean,
          $9::integer, $10::integer,
          $11::jsonb,
          $12::jsonb,
          $13::jsonb,
          $14::bigint, $15::jsonb, $16::integer, $17::integer
        )
        RETURNING *
        `,
        [
          userId,                    // $1 created_by / modified_by
          workflowId,                // $2 workflow_id
          step_name,                 // $3
          step_type,                 // $4
          step_action,               // $5
          step_performer,            // $6
          attachments_allowed,       // $7
          review_allowed,            // $8
          next_step_after_approve,   // $9
          next_step_after_reject,    // $10
          mail_notification_users,   // $11
          mail_content,              // $12
          step_form_configuration,   // $13
          tenantId,                  // $14
          version_info,              // $15
          step_due_in_days,          // $16
          insertAt                   // $17
        ]
      );

      await normalizeNextSteps(client, workflowId, tenantId);

      const { rows: updated } = await client.query(
        `SELECT * FROM public.simple_workflowbuilder_steps WHERE workflow_id = $1 ORDER BY step_no ASC, id ASC` ,
        [workflowId]
      );

      await client.query('COMMIT');
      const stepOut = updated.find((s) => s.id === inserted[0]?.id) || inserted[0];
      return res.status(201).json({ step: stepOut, steps: updated });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('swfs:insert', { message: e.message, code: e.code, detail: e.detail });
      return res.status(500).json({ error: 'Failed to insert step', detail: e.detail, code: e.code });
    } finally {
      client.release();
    }
  });

  // BULK CREATE steps
  // POST /api/simple_workflowbuilder/steps/:id/bulk   (numeric only)
  // BULK CREATE steps
// POST /api/simple_workflowbuilder/steps/:id/bulk   (numeric only)
  router.post('/:id(\\d+)/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const workflowId = Number(req.params.id);
    const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];
    if (!steps.length) {
      return res.status(400).json({ error: 'No steps' });
    }

    const seqError = validateBulkCreateSequence(steps);
    if (seqError) {
      return res.status(400).json({ error: seqError });
    }

    const userId   = req.user?.id || null;
    const tenantId = req.user?.tenant_id || null;

    await client.query('BEGIN');

    const out = [];

    for (const s of steps) {
      const bulkCheck = validateBulkCreateStep(s);
      if (bulkCheck.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: bulkCheck.error });
      }
      const v = bulkCheck.value;
      const {
        step_type,
        step_name,
        step_no,
        step_action,
        step_performer,
        attachments_allowed,
        review_allowed,
        next_step_after_approve,
        next_step_after_reject,
        approve_button_name,
        reject_button_name,
        mail_notification_users,
        mail_content,
        step_form_configuration,
        version_info,
        step_due_in_days,
      } = v;

      const stepValidation = validateStepConfig({
        step_name,
        step_action,
        approve_button_name,
        reject_button_name,
        next_step_after_approve,
        next_step_after_reject,
      });
      if (stepValidation) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: stepValidation });
      }

      const mail_notification_users_json = coerceJsonb(mail_notification_users, []);
      const mail_content_json = coerceJsonb(mail_content, {});
      const step_form_configuration_json = coerceJsonb(step_form_configuration, {});
      const version_info_json = coerceJsonb(version_info, {});

      const { rows } = await client.query(
  `
  INSERT INTO public.simple_workflowbuilder_steps (
    date_created, date_modified, created_by, modified_by,
    workflow_id, step_name, step_type, step_action, step_performer,
    attachments_allowed, review_allowed,
    next_step_after_approve, next_step_after_reject,
    approve_button_name, reject_button_name,
    mail_notification_users, mail_content,
    step_form_configuration,
    tenant_id, version_info, step_due_in_days, step_no
  ) VALUES (
    now(), now(), $1::bigint, $1::bigint,
    $2::bigint, $3, $4, $5, $6::integer,
    $7, $8::boolean,
    $9::integer, $10::integer,
    $11, $12,
    $13::jsonb, $14::jsonb,
    $15::jsonb,
    $16::bigint, $17::jsonb, $18::integer, $19::integer
  )
  RETURNING *
  `,
  [
    userId,                    // $1 created_by / modified_by
    workflowId,                // $2 workflow_id
    step_name,                 // $3
    step_type,                 // $4
    step_action,               // $5
    step_performer,            // $6
    attachments_allowed,       // $7
    review_allowed,            // $8
    next_step_after_approve,      // $9 (step_no of next step on approve)
    next_step_after_reject,       // $10 (step_no of next step on reject)
    approve_button_name,       // $11
    reject_button_name,        // $12
    mail_notification_users_json,   // $13 (jsonb)
    mail_content_json,              // $14 mail_content (jsonb)
    step_form_configuration_json,   // $15 (jsonb)
    tenantId,                  // $16
    version_info_json,         // $17 (jsonb)
    step_due_in_days,          // $18
    step_no                    // $19
  ]
);

      out.push(rows[0]);
    }

    await normalizeNextSteps(client, workflowId, tenantId);

    const { rows: updatedSteps } = await client.query(
      `SELECT * FROM public.simple_workflowbuilder_steps WHERE workflow_id = $1 ORDER BY step_no ASC, id ASC`,
      [workflowId]
    );
    const byId = new Map(updatedSteps.map((r) => [r.id, r]));

    await client.query('COMMIT');
    return res.status(201).json(out.map((r) => byId.get(r.id) || r));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('swfs:bulk', {
      message: e.message,
      code: e.code,
      constraint: e.constraint,
      detail: e.detail
    });
    return res.status(400).json({
      error: 'Failed to create steps',
      db_code: e.code,
      constraint: e.constraint,
      detail: e.detail
    });
  } finally {
    client.release();
  }
});


  // PATCH a step
  // PATCH /api/simple_workflowbuilder/steps/:stepId  (numeric only)
    router.patch('/:stepId(\\d+)', async (req, res) => {
    try {
      const id = Number(req.params.stepId);

      // clone so we don't mutate req.body
      const body = { ...(req.body || {}) };

      // strict attachments_allowed
      if (body.attachments_allowed != null) {
        const v = body.attachments_allowed.toString().toLowerCase();
        if (!ATTACH_MODES.includes(v)) {
          return res.status(400).json({ error: 'attachments_allowed must be one of: view_upload, none, view_only, upload_only' });
        }
        body.attachments_allowed = v;
      }

      // strict next-step fields: only next_step_after_* allowed
      if (body.next_step_on_approve != null || body.next_step_on_reject != null) {
        return res.status(400).json({ error: 'Use next_step_after_approve/next_step_after_reject only' });
      }

      const { rows: existingRows } = await pool.query(
        `SELECT * FROM public.simple_workflowbuilder_steps WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (!existingRows[0]) return res.status(404).json({ error: 'Not found' });

      const merged = { ...existingRows[0], ...body };
      const stepValidation = validateStepConfig(merged);
      if (stepValidation) {
        return res.status(400).json({ error: stepValidation });
      }

      const whitelist = new Map([
        ['step_name', null],
        ['step_type', null],
        ['step_action', null],
        ['step_performer', 'int'],
        ['attachments_allowed', 'text'], // TEXT ("true"/"false")
        ['review_allowed', 'bool'],
        ['next_step_after_approve', 'int'],
        ['next_step_after_reject', 'int'],
        ['approve_button_name', null],
        ['reject_button_name', null],
        ['mail_notification_users', 'jsonb'],
        ['mail_content', 'jsonb'],
        ['step_form_configuration', 'jsonb'],
        ['tenant_id', 'bigint'],
        ['version_info', 'jsonb'],
        ['step_due_in_days', 'int'],
        ['step_no', 'int'],
      ]);

      const keys = Object.keys(body).filter(k => whitelist.has(k));
      if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });

      const sets = keys.map((k, i) => {
        const t = whitelist.get(k);
        if (t === 'jsonb')  return `${k} = $${i + 1}::jsonb`;
        if (t === 'int')    return `${k} = $${i + 1}::integer`;
        if (t === 'bigint') return `${k} = $${i + 1}::bigint`;
        if (t === 'bool')   return `${k} = $${i + 1}::boolean`;
        return `${k} = $${i + 1}`; // text/default
      });

      const vals = keys.map((k) => {
        const t = whitelist.get(k);
        if (t === 'jsonb') return JSON.stringify(body[k]);
        if (t === 'text') {
          return (body[k] === true || body[k] === 'true') ? 'true'
               : (body[k] === false || body[k] === 'false') ? 'false'
               : (body[k] ?? '') + '';
        }
        return body[k];
      });

      vals.push(req.user?.id || null); // modified_by
      vals.push(id);

      const { rows } = await pool.query(
        `
        UPDATE public.simple_workflowbuilder_steps
           SET ${sets.join(', ')},
               modified_by = $${vals.length - 1}::bigint,
               date_modified = now()
         WHERE id = $${vals.length}::bigint
         RETURNING *
        `,
        vals
      );

      if (!rows[0]) return res.status(404).json({ error: 'Not found' });

      await normalizeNextSteps(pool, rows[0].workflow_id, rows[0].tenant_id);

      const { rows: refreshed } = await pool.query(
        `SELECT * FROM public.simple_workflowbuilder_steps WHERE id = $1 LIMIT 1`,
        [rows[0].id]
      );
      return res.json(refreshed[0] || rows[0]);
    } catch (e) {
      console.error('swfs:patch', { message: e.message, code: e.code, detail: e.detail });
      return res.status(500).json({ error: 'Failed to update step' });
    }
  });

  // Apply source step_form_configuration to ALL steps in the workflow (excluding TERMINATE)
  // POST /api/simple_workflowbuilder/steps/:workflowId/apply-form-config
  // body: { source_step_no }
  router.post('/:workflowId(\\d+)/apply-form-config', async (req, res) => {
    const client = await pool.connect();
    try {
      const workflowId = Number(req.params.workflowId);
      const sourceStepNo = Number(req.body?.source_step_no);
      if (!Number.isFinite(workflowId) || workflowId <= 0) {
        return res.status(400).json({ error: 'Invalid workflowId' });
      }
      if (!Number.isFinite(sourceStepNo) || sourceStepNo < 0) {
        return res.status(400).json({ error: 'Invalid source_step_no' });
      }

      const tenantId = req.user?.tenant_id || null;

      await client.query('BEGIN');

      const steps = await fetchSteps(client, workflowId, tenantId);
      if (!steps.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No steps found for this workflow' });
      }

      const src = steps.find((s) => Number(s.step_no) === sourceStepNo);
      if (!src) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Source step_no not found in this workflow' });
      }
      const srcCfg = src.step_form_configuration || {};
      const srcVer = src.version_info || {};

      const nonTerminate = steps.filter(
        (s) => String(s.step_name || '').trim().toLowerCase() !== 'terminate'
      );

      for (const step of nonTerminate) {
        await client.query(
          `
            UPDATE public.simple_workflowbuilder_steps
               SET step_form_configuration = $1,
                   version_info = $2,
                   date_modified = now()
             WHERE id = $3
          `,
          [JSON.stringify(srcCfg || {}), JSON.stringify(srcVer || {}), step.id]
        );
      }

      await client.query('COMMIT');
      return res.json({ ok: true, applied_to: nonTerminate.map((s) => s.step_no) });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[SWFS] apply-form-config error', e);
      return res.status(500).json({ error: 'Failed to apply form config to all steps' });
    } finally {
      client.release();
    }
  });

  return router;
};
