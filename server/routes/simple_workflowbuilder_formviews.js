//routes/simple_workflowbuilder_formviews.js
const express = require('express');
const pool = require('../db');

module.exports = function simpleWorkflowbuilderFormViewsRouter() {
  const router = express.Router();

  // Optional: small watchdog + logging
  router.use((req, res, next) => {
    console.log(`[SWFV] ${req.method} ${req.originalUrl}`);
    res.setTimeout(15000, () => {
      if (!res.headersSent) {
        console.warn(`[SWFV] timeout ${req.method} ${req.originalUrl}`);
        res.status(504).json({ error: 'formviews route timeout' });
      }
    });
    next();
  });

  // ---------------------------------------------------------------------------
  // Ensure table exists (DDL)
  // ---------------------------------------------------------------------------
  async function ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.simple_workflowbuilder_formviews (
        id              BIGSERIAL PRIMARY KEY,
        workflow_map_id BIGINT NOT NULL,
        step_no         BIGINT NOT NULL,
        view_key        TEXT   NOT NULL,
        view_name       TEXT,
        description     TEXT,
        is_default      BOOLEAN NOT NULL DEFAULT FALSE,
        layout_def      JSONB   NOT NULL DEFAULT '{}'::jsonb,
        tenant_id       BIGINT,
        date_created    TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_modified   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Uniqueness per (tenant, workflow, step, view_key)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_swfv_unique_view
        ON public.simple_workflowbuilder_formviews
        (COALESCE(tenant_id,0), workflow_map_id, step_no, view_key);
    `);
  }

  // Simple ping
  router.get('/__echo', async (req, res) => {
    await ensureTable();
    return res.json({ ok: true, at: Date.now() });
  });

  // ---------------------------------------------------------------------------
  // 1) LIST views for a step
  // GET /api/simple_workflowbuilder_formviews?workflow_map_id=123&step_no=5
  // ---------------------------------------------------------------------------
  router.get('/', async (req, res) => {
    try {
      await ensureTable();

      const tenantId = req.user?.tenant_id || null;
      const wid = Number(req.query.workflow_map_id);
      const stepNo = Number(req.query.step_no);

      if (!Number.isFinite(wid) || !Number.isFinite(stepNo)) {
        return res.status(400).json({
          error: 'workflow_map_id and step_no are required numeric query params',
        });
      }

      const args = [wid, stepNo];
      let where = 'workflow_map_id = $1 AND step_no = $2';

      if (tenantId) {
        args.push(tenantId);
        where += ` AND (tenant_id = $${args.length} OR tenant_id IS NULL)`;
      }

      const { rows } = await pool.query(
        `
        SELECT id, workflow_map_id, step_no,
               view_key, view_name, description,
               is_default, layout_def,
               tenant_id, date_created, date_modified
          FROM public.simple_workflowbuilder_formviews
         WHERE ${where}
         ORDER BY is_default DESC, id ASC
        `,
        args
      );

      // Wrap in { views: [...] } to match the DTO spec
      return res.json({ views: rows });
    } catch (e) {
      console.error('[SWFV] list error', e);
      return res.status(500).json({ error: 'Failed to list views' });
    }
  });

  // ---------------------------------------------------------------------------
  // Helper to normalise payload -> DB row
  // ---------------------------------------------------------------------------
  function normalisePayload(body, options = {}) {
    const {
      workflow_map_id,
      step_no,
      view_key,
      view_name = null,
      description = null,
      is_default = false,
      layout_def = {},
    } = body || {};

    const wid = Number(workflow_map_id);
    const sno = Number(step_no);

    if (!Number.isFinite(wid) || wid <= 0) {
      throw new Error('workflow_map_id is required and must be numeric');
    }
    if (!Number.isFinite(sno) || sno < 0) {
      throw new Error('step_no is required and must be numeric');
    }
    if (!view_key || typeof view_key !== 'string') {
      throw new Error('view_key is required');
    }

    const trimmedKey = view_key.trim();
    if (!trimmedKey) {
      throw new Error('view_key cannot be empty');
    }

    const row = {
      workflow_map_id: wid,
      step_no: sno,
      view_key: trimmedKey,
      view_name: view_name || null,
      description: description || null,
      is_default: !!is_default,
      layout_def: layout_def || {},
    };

    if (options.allowPartial) {
      return row;
    }

    return row;
  }

  // ---------------------------------------------------------------------------
  // 2) CREATE / UPSERT a view
  // POST /api/simple_workflowbuilder_formviews
  // body: { workflow_map_id, step_no, view_key, view_name, description, is_default, layout_def }
  //
  // Upsert logic:
//   - if any view exists for (tenant_id, workflow_map_id, step_no) -> UPDATE first and delete others
//   - else INSERT
// ---------------------------------------------------------------------------
  router.post('/', async (req, res) => {
    let client;
    try {
      await ensureTable();
      client = await pool.connect();

      const tenantId = req.user?.tenant_id || null;
      const userId = req.user?.id || null;

      const payload = normalisePayload(req.body);
      const {
        workflow_map_id,
        step_no,
        view_key,
        view_name,
        description,
        is_default,
        layout_def,
      } = payload;

      await client.query('BEGIN');

      // Check if any view exists for this step (one view per step)
      const findArgs = [workflow_map_id, step_no];
      let findWhere = 'workflow_map_id = $1 AND step_no = $2';
      if (tenantId) {
        findArgs.push(tenantId);
        findWhere += ` AND (tenant_id = $${findArgs.length} OR tenant_id IS NULL)`;
      }

      const { rows: existingRows } = await client.query(
        `
        SELECT *
          FROM public.simple_workflowbuilder_formviews
         WHERE ${findWhere}
         ORDER BY id ASC
        `,
        findArgs
      );

      let viewRow;

      // If is_default = true, clear other defaults for same (tenant, workflow, step)
      async function clearOtherDefaults(targetId) {
        const args = [workflow_map_id, step_no];
        let where = 'workflow_map_id = $1 AND step_no = $2';
        if (tenantId) {
          args.push(tenantId);
          where += ` AND tenant_id = $${args.length}`;
        }
        if (targetId) {
          args.push(targetId);
          where += ` AND id <> $${args.length}`;
        }
        await client.query(
          `
          UPDATE public.simple_workflowbuilder_formviews
             SET is_default = FALSE,
                 date_modified = NOW()
           WHERE ${where}
          `,
          args
        );
      }

      if (existingRows.length) {
        // UPDATE the first existing row for this step and remove any duplicates
        const target = existingRows[0];

        if (is_default) {
          await clearOtherDefaults(target.id);
        }

        const { rows: updated } = await client.query(
          `
          UPDATE public.simple_workflowbuilder_formviews
             SET view_key    = $1,
                 view_name   = $2,
                 description = $3,
                 is_default  = $4,
                 layout_def  = $5::jsonb,
                 tenant_id   = COALESCE($6, tenant_id),
                 date_modified = NOW()
           WHERE id = $7
           RETURNING
             id, workflow_map_id, step_no,
             view_key, view_name, description,
             is_default, layout_def,
             tenant_id, date_created, date_modified
          `,
          [
            view_key,
            view_name,
            description,
            is_default,
            JSON.stringify(layout_def || {}),
            tenantId,
            target.id,
          ]
        );
        viewRow = updated[0];

        // delete any other rows for this (workflow, step)
        const delArgs = [workflow_map_id, step_no, viewRow.id];
        let delWhere = 'workflow_map_id = $1 AND step_no = $2 AND id <> $3';
        if (tenantId) {
          delArgs.push(tenantId);
          delWhere += ` AND (tenant_id = $${delArgs.length} OR tenant_id IS NULL)`;
        }
        await client.query(`DELETE FROM public.simple_workflowbuilder_formviews WHERE ${delWhere}`, delArgs);
      } else {
        // INSERT new (no existing view for this step)
        if (is_default) {
          await clearOtherDefaults(null);
        }

        // Safety: delete any stray rows for this step before insert
        const delArgs = [workflow_map_id, step_no];
        let delWhere = 'workflow_map_id = $1 AND step_no = $2';
        if (tenantId) {
          delArgs.push(tenantId);
          delWhere += ` AND (tenant_id = $${delArgs.length} OR tenant_id IS NULL)`;
        }
        await client.query(`DELETE FROM public.simple_workflowbuilder_formviews WHERE ${delWhere}`, delArgs);

        const { rows: inserted } = await client.query(
          `
          INSERT INTO public.simple_workflowbuilder_formviews (
            workflow_map_id,
            step_no,
            view_key,
            view_name,
            description,
            is_default,
            layout_def,
            tenant_id,
            date_created,
            date_modified
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7::jsonb,
            $8, NOW(), NOW()
          )
          RETURNING
            id, workflow_map_id, step_no,
            view_key, view_name, description,
            is_default, layout_def,
            tenant_id, date_created, date_modified
          `,
          [
            workflow_map_id,
            step_no,
            view_key,
            view_name,
            description,
            is_default,
            JSON.stringify(layout_def || {}),
            tenantId,
          ]
        );
        viewRow = inserted[0];
      }

      await client.query('COMMIT');
      return res.status(201).json({ view: viewRow });
    } catch (e) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.error('[SWFV] upsert error', e);
      return res.status(500).json({ error: 'Failed to save view' });
    } finally {
      if (client) client.release();
    }
  });

  // ---------------------------------------------------------------------------
  // 3) UPDATE a view by id
  // PUT /api/simple_workflowbuilder_formviews/:id
  // body: same shape as POST (we ignore workflow_map_id/step_no/view_key if you want)
  // ---------------------------------------------------------------------------
  router.put('/:id(\\d+)', async (req, res) => {
    let client;
    try {
      await ensureTable();
      client = await pool.connect();

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      const tenantId = req.user?.tenant_id || null;

      // Load existing
      const { rows: existingRows } = await client.query(
        `
        SELECT *
          FROM public.simple_workflowbuilder_formviews
         WHERE id = $1
         LIMIT 1
        `,
        [id]
      );
      if (!existingRows.length) {
        return res.status(404).json({ error: 'View not found' });
      }
      const existing = existingRows[0];

      // We allow partial body here
      const body = req.body || {};
      const mergedPayload = {
        workflow_map_id: body.workflow_map_id ?? existing.workflow_map_id,
        step_no: body.step_no ?? existing.step_no,
        view_key: body.view_key ?? existing.view_key,
        view_name: body.view_name ?? existing.view_name,
        description: body.description ?? existing.description,
        is_default:
          body.is_default !== undefined ? !!body.is_default : !!existing.is_default,
        layout_def: body.layout_def ?? existing.layout_def ?? {},
      };

      const payload = normalisePayload(mergedPayload);
      const {
        workflow_map_id,
        step_no,
        view_key,
        view_name,
        description,
        is_default,
        layout_def,
      } = payload;

      await client.query('BEGIN');

      // If is_default = true, clear other defaults
      if (is_default) {
        const args = [workflow_map_id, step_no, id];
        let where = 'workflow_map_id = $1 AND step_no = $2 AND id <> $3';
        if (tenantId) {
          args.push(tenantId);
          where += ` AND tenant_id = $${args.length}`;
        }
        await client.query(
          `
          UPDATE public.simple_workflowbuilder_formviews
             SET is_default = FALSE,
                 date_modified = NOW()
           WHERE ${where}
          `,
          args
        );
      }

      const { rows: updated } = await client.query(
        `
        UPDATE public.simple_workflowbuilder_formviews
           SET workflow_map_id = $1,
               step_no         = $2,
               view_key        = $3,
               view_name       = $4,
               description     = $5,
               is_default      = $6,
               layout_def      = $7::jsonb,
               tenant_id       = COALESCE($8, tenant_id),
               date_modified   = NOW()
         WHERE id = $9
         RETURNING
           id, workflow_map_id, step_no,
           view_key, view_name, description,
           is_default, layout_def,
           tenant_id, date_created, date_modified
        `,
        [
          workflow_map_id,
          step_no,
          view_key,
          view_name,
          description,
          is_default,
          JSON.stringify(layout_def || {}),
          tenantId,
          id,
        ]
      );

      // Enforce single view per step: delete any other rows for this step
      const delArgs = [workflow_map_id, step_no, id];
      let delWhere = 'workflow_map_id = $1 AND step_no = $2 AND id <> $3';
      if (tenantId) {
        delArgs.push(tenantId);
        delWhere += ` AND (tenant_id = $${delArgs.length} OR tenant_id IS NULL)`;
      }
      await client.query(`DELETE FROM public.simple_workflowbuilder_formviews WHERE ${delWhere}`, delArgs);

      await client.query('COMMIT');
      return res.json({ view: updated[0] });
    } catch (e) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.error('[SWFV] update error', e);
      return res.status(500).json({ error: 'Failed to update view' });
    } finally {
      if (client) client.release();
    }
  });

  // ---------------------------------------------------------------------------
  // 4) Set default view
  // POST /api/simple_workflowbuilder_formviews/:id/set-default
  // ---------------------------------------------------------------------------
  router.post('/:id(\\d+)/set-default', async (req, res) => {
    let client;
    try {
      await ensureTable();
      client = await pool.connect();

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      const tenantId = req.user?.tenant_id || null;

      await client.query('BEGIN');

      // Load target row
      const { rows: existingRows } = await client.query(
        `
        SELECT *
          FROM public.simple_workflowbuilder_formviews
         WHERE id = $1
         LIMIT 1
        `,
        [id]
      );
      if (!existingRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'View not found' });
      }
      const existing = existingRows[0];

      // Clear other defaults
      const args = [existing.workflow_map_id, existing.step_no, id];
      let where = 'workflow_map_id = $1 AND step_no = $2 AND id <> $3';
      if (tenantId) {
        args.push(tenantId);
        where += ` AND tenant_id = $${args.length}`;
      }

      await client.query(
        `
        UPDATE public.simple_workflowbuilder_formviews
           SET is_default = FALSE,
               date_modified = NOW()
         WHERE ${where}
        `,
        args
      );

      // Set this one as default
      const { rows: updated } = await client.query(
        `
        UPDATE public.simple_workflowbuilder_formviews
           SET is_default = TRUE,
               date_modified = NOW()
         WHERE id = $1
         RETURNING
           id, workflow_map_id, step_no,
           view_key, view_name, description,
           is_default, layout_def,
           tenant_id, date_created, date_modified
        `,
        [id]
      );

      // Enforce single view per step: delete any other rows for this step
      const delArgs = [existing.workflow_map_id, existing.step_no, id];
      let delWhere = 'workflow_map_id = $1 AND step_no = $2 AND id <> $3';
      if (tenantId) {
        delArgs.push(tenantId);
        delWhere += ` AND (tenant_id = $${delArgs.length} OR tenant_id IS NULL)`;
      }
      await client.query(`DELETE FROM public.simple_workflowbuilder_formviews WHERE ${delWhere}`, delArgs);

      await client.query('COMMIT');
      return res.json({ view: updated[0] });
    } catch (e) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.error('[SWFV] set-default error', e);
      return res.status(500).json({ error: 'Failed to set default view' });
    } finally {
      if (client) client.release();
    }
  });

  // ---------------------------------------------------------------------------
  // 5) Apply a source view/layout to ALL steps in the workflow (excluding TERMINATE)
  // POST /api/simple_workflowbuilder_formviews/apply-all
  // body:
  //   {
  //     workflow_map_id: number,
  //     source_step_no: number,
  //     view_key: string,           // required
  //     layout_def?: object,        // if omitted, we pull from source_step_no/view_key
  //     view_name?: string
  //   }
  //
  // Security: uses tenant from req.user; only copies within the same workflow/tenant.
  // Atomic: single transaction; rolls back on any failure.
  // ---------------------------------------------------------------------------
  router.post('/apply-all', async (req, res) => {
    let client;
    try {
      await ensureTable();
      client = await pool.connect();

      const tenantId = req.user?.tenant_id || null;
      const wid = Number(req.body?.workflow_map_id);
      const sourceStepNo = Number(req.body?.source_step_no);
      const viewKey = String(req.body?.view_key || '').trim();
      const bodyLayout = req.body?.layout_def;
      const bodyViewName = req.body?.view_name || null;

      if (!Number.isFinite(wid) || wid <= 0) {
        return res.status(400).json({ error: 'workflow_map_id is required and must be numeric' });
      }
      if (!Number.isFinite(sourceStepNo) || sourceStepNo < 0) {
        return res.status(400).json({ error: 'source_step_no is required and must be numeric' });
      }
      if (!viewKey) {
        return res.status(400).json({ error: 'view_key is required' });
      }

      await client.query('BEGIN');

      // Resolve layout_def to use: prefer payload, otherwise pull from source view
      let layoutDefToApply = bodyLayout || null;
      let viewName = bodyViewName || null;

      if (!layoutDefToApply) {
        const findArgs = [wid, sourceStepNo, viewKey];
        let where = 'workflow_map_id = $1 AND step_no = $2 AND view_key = $3';
        if (tenantId) {
          findArgs.push(tenantId);
          where += ` AND (tenant_id = $${findArgs.length} OR tenant_id IS NULL)`;
        }

        const { rows: srcRows } = await client.query(
          `
            SELECT layout_def, view_name
              FROM public.simple_workflowbuilder_formviews
             WHERE ${where}
             ORDER BY id DESC
             LIMIT 1
          `,
          findArgs
        );
        if (!srcRows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Source view not found for source_step_no/view_key' });
        }
        layoutDefToApply = srcRows[0].layout_def || {};
        viewName = viewName || srcRows[0].view_name || viewKey;
      }

      // Fetch all steps for the workflow (excluding TERMINATE)
      const stepArgs = [wid];
      let stepWhere = 'workflow_id = $1';
      if (tenantId) {
        stepArgs.push(tenantId);
        stepWhere += ` AND (tenant_id = $${stepArgs.length} OR tenant_id IS NULL)`;
      }
      const { rows: steps } = await client.query(
        `
          SELECT id, step_no, step_name
            FROM public.simple_workflowbuilder_steps
           WHERE ${stepWhere}
           ORDER BY step_no ASC, id ASC
        `,
        stepArgs
      );

      if (!steps.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No steps found for this workflow' });
      }

      const nonTerminate = steps.filter(
        (s) => String(s.step_name || '').trim().toLowerCase() !== 'terminate'
      );

      // Enforce one view per step: keep first row per step_no, delete duplicates
      const existingArgs = [wid];
      let existingWhere = 'workflow_map_id = $1';
      if (tenantId) {
        existingArgs.push(tenantId);
        existingWhere += ` AND (tenant_id = $${existingArgs.length} OR tenant_id IS NULL)`;
      }
      const { rows: existingViews } = await client.query(
        `
          SELECT id, step_no
            FROM public.simple_workflowbuilder_formviews
           WHERE ${existingWhere}
           ORDER BY id ASC
        `,
        existingArgs
      );

      const existingMap = new Map();
      const extraIds = [];
      for (const row of existingViews) {
        const sno = Number(row.step_no);
        if (existingMap.has(sno)) {
          extraIds.push(row.id);
        } else {
          existingMap.set(sno, row.id);
        }
      }
      if (extraIds.length) {
        await client.query(
          `DELETE FROM public.simple_workflowbuilder_formviews WHERE id = ANY($1::int[])`,
          [extraIds]
        );
      }

      // Upsert for each step (update existing by step_no, otherwise insert)
      for (const step of nonTerminate) {
        const existingId = existingMap.get(Number(step.step_no)) || null;
        if (existingId) {
          await client.query(
            `
              UPDATE public.simple_workflowbuilder_formviews
                 SET view_key = $1,
                     view_name = $2,
                     is_default = false,
                     layout_def = $3::jsonb,
                     tenant_id = COALESCE($4, tenant_id),
                     date_modified = now()
               WHERE id = $5
            `,
            [
              viewKey,
              viewName,
              JSON.stringify(layoutDefToApply || {}),
              tenantId,
              existingId,
            ]
          );
        } else {
          await client.query(
            `
              INSERT INTO public.simple_workflowbuilder_formviews
                (workflow_map_id, step_no, view_key, view_name, is_default, layout_def, tenant_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
              wid,
              step.step_no,
              viewKey,
              viewName,
              false,
              JSON.stringify(layoutDefToApply || {}),
              tenantId,
            ]
          );
        }
      }

      await client.query('COMMIT');
      return res.json({ ok: true, applied_to: nonTerminate.map((s) => s.step_no) });
    } catch (e) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.error('[SWFV] apply-all error', e);
      return res.status(500).json({ error: 'Failed to apply view to all steps' });
    } finally {
      if (client) client.release();
    }
  });

  return router;
};

