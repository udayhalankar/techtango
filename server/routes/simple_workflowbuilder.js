// server/routes/simple_workflowbuilder.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.simple_workflowbuilder (
      id BIGSERIAL PRIMARY KEY,
      workflow_map_name TEXT NOT NULL,
      workflow_table_name TEXT NOT NULL,
      date_created TIMESTAMPTZ DEFAULT now(),
      date_modified TIMESTAMPTZ DEFAULT now(),
      created_by BIGINT,
      modified_by BIGINT,
      step_performer TEXT,
      step_name TEXT,
      wf_status TEXT,
      review_requestor TEXT,
      reviewer TEXT,
      initiator BIGINT,
      audit_trail JSONB DEFAULT '[]'::jsonb,
      table_type TEXT DEFAULT 'Workflow',
      step_comments TEXT,
      tenant_id BIGINT,
      no_of_steps INT DEFAULT 1,
      user_access JSONB DEFAULT '{}'::jsonb,
      version_info JSONB DEFAULT '{}'::jsonb
    );
  `);

  // Add publish-related columns if missing (use unquoted lower-case identifiers)
  await pool.query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS ispublished BOOLEAN NOT NULL DEFAULT FALSE;
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS datepublished TIMESTAMPTZ;
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS publishedby BIGINT;
      EXCEPTION WHEN others THEN NULL; END;
    END$$;
  `);

  // Also add camelCase columns if the schema historically used them
  await pool.query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN;
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS "datePublished" TIMESTAMPTZ;
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        ALTER TABLE public.simple_workflowbuilder ADD COLUMN IF NOT EXISTS "PublishedBy" BIGINT;
      EXCEPTION WHEN others THEN NULL; END;
    END$$;
  `);
}

// LIST headers (tenant-scoped if available)
router.get('/', async (req, res) => {
  console.time('swb.list');
  try {
    await ensureTables();
    const tenant = req.user?.tenant_id || null;
    const publishedOnly = (() => {
      const v = String(req.query.published ?? req.query.isPublished ?? '').toLowerCase();
      return v === 'true' || v === '1' || v === 'yes' || v === 'y';
    })();

    const args = [tenant];
    let where = `($1::bigint IS NULL OR swb.tenant_id = $1)`;
    if (publishedOnly) {
      where += ` AND (
        COALESCE(swb.ispublished, FALSE)
        OR COALESCE((swb."isPublished")::text, '') ~* '^(true|t|1|y(es)?)$'
      )`;
    }

    async function runQuery(currentWhere) {
      const { rows } = await pool.query(
        `
        SELECT 
          swb.id,
          swb.workflow_map_name,
          swb.workflow_table_name,
          swb.date_created,
          swb.date_modified,
          swb.created_by,
          swb.modified_by,
          swb.step_performer,
          swb.step_name,
          swb.wf_status,
          swb.review_requestor,
          swb.reviewer,
          swb.initiator,
          swb.audit_trail,
          swb.table_type,
          swb.step_comments,
          swb.tenant_id,
          swb.no_of_steps,
          swb.user_access,
          swb.version_info,
          (
            COALESCE(swb.ispublished, FALSE)
            OR COALESCE((swb."isPublished")::text, '') ~* '^(true|t|1|y(es)?)$'
          ) AS "isPublished",
          swb.datepublished AS "datePublished",
          swb.publishedby   AS "PublishedBy",
          (u.firstname || ' ' || COALESCE(u.lastname,'')) AS created_by_name
        FROM public.simple_workflowbuilder swb
        LEFT JOIN public.users u ON u.id = swb.created_by
        WHERE ${currentWhere}
        ORDER BY swb.id DESC
        `,
        args
      );
      return rows;
    }

    let rows;
    try {
      rows = await runQuery(where);
    } catch (e) {
      // Fallback: remove published filter at SQL level, filter in JS
      const baseWhere = `($1::bigint IS NULL OR swb.tenant_id = $1)`;
      const allRows = await runQuery(baseWhere);
      if (publishedOnly) {
        const norm = (r) => {
          const v = r.isPublished;
          if (typeof v === 'boolean') return v;
          const s = String(v ?? '').trim().toLowerCase();
          return s === 'true' || s === '1' || s.startsWith('y');
        };
        rows = allRows.filter(norm);
      } else {
        rows = allRows;
      }
    }

    return res.json(rows);
  } catch (e) {
    console.error('swb:list', e);
    return res.status(500).json({ error: 'Failed to list workflows' });
  } finally {
    console.timeEnd('swb.list');
  }
});

// GET one header
router.get('/:id', async (req, res) => {
  console.time('swb.get');
  try {
    await ensureTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad id' });

    const { rows } = await pool.query(
      `
      SELECT 
        swb.*,
        (
          COALESCE(swb.ispublished, FALSE)
          OR COALESCE((swb."isPublished")::text, '') ~* '^(true|t|1|y(es)?)$'
        ) AS "isPublished",
        swb.datepublished AS "datePublished",
        swb.publishedby   AS "PublishedBy"
      FROM public.simple_workflowbuilder swb
      WHERE swb.id = $1
      `,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('swb:get', e);
    return res.status(500).json({ error: 'Failed to fetch workflow' });
  } finally {
    console.timeEnd('swb.get');
  }
});

// Validate publish constraints: at least Initiate, Terminate and one more step; and each step has a saved view
async function canPublishWorkflow(workflowId) {
  // Steps
  const { rows: steps } = await pool.query(
    `SELECT id, step_name, step_no, step_type FROM public.simple_workflowbuilder_steps WHERE workflow_id = $1`,
    [workflowId]
  );
  if (!steps || steps.length < 3) return { ok: false, reason: 'Workflow must have at least 3 steps.' };
  // Be tolerant in detecting Initiate
  const hasInit = steps.some(s =>
    Number(s.step_no) === 0 ||
    String(s.step_type || '').toLowerCase() === 'create' ||
    String(s.step_name || '').trim().toUpperCase() === 'INITIATE'
  );
  const hasTerm = steps.some(s => String(s.step_name || '').trim().toUpperCase() === 'TERMINATE');
  if (!hasInit || !hasTerm) {
    return { ok: false, reason: 'Workflow must include Initiate (step_no=0 or type=create) and Terminate steps.' };
  }

  // Ensure each step has at least one saved view (EXCEPT Terminate)
  // Create formviews table if missing
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.simple_workflowbuilder_formviews (
      id BIGSERIAL PRIMARY KEY,
      workflow_map_id BIGINT NOT NULL,
      step_no BIGINT NOT NULL,
      view_key TEXT NOT NULL,
      view_name TEXT,
      description TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      layout_def JSONB NOT NULL DEFAULT '{}'::jsonb,
      tenant_id BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      date_modified TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows: viewCounts } = await pool.query(
    `
    SELECT step_no, COUNT(*) AS cnt
    FROM public.simple_workflowbuilder_formviews
    WHERE workflow_map_id = $1
    GROUP BY step_no
    `,
    [workflowId]
  );
  const countByStep = new Map(viewCounts.map(r => [Number(r.step_no), Number(r.cnt)]));
  // Treat the last (highest step_no) as terminal as well
  const maxStepNo = Math.max(...steps.map(s => Number(s.step_no) || 0));
  for (const s of steps) {
    const nameU = String(s.step_name || '').trim().toUpperCase();
    const isLast = Number(s.step_no) === maxStepNo;
    if (nameU === 'TERMINATE' || isLast) continue; // terminal step has no form
    if (!countByStep.get(Number(s.step_no))) {
      return { ok: false, reason: `Step "${s.step_name}" does not have a saved view.` };
    }
  }
  return { ok: true };
}

// Publish a workflow
router.patch('/:id/publish', async (req, res) => {
  try {
    await ensureTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad id' });

    const check = await canPublishWorkflow(id);
    if (!check.ok) return res.status(400).json({ error: check.reason });

    const userId = req.user?.id || null;
    const { rows } = await pool.query(
      `
      UPDATE public.simple_workflowbuilder
         SET ispublished = TRUE,
             datepublished = now(),
             publishedby = COALESCE($2, publishedby),
             "isPublished" = TRUE,
             "datePublished" = now(),
             "PublishedBy" = COALESCE($2, "PublishedBy"),
             date_modified = now()
       WHERE id = $1
       RETURNING *, ispublished AS "isPublished", datepublished AS "datePublished", publishedby AS "PublishedBy"
      `,
      [id, userId]
    );
    return res.json(rows[0]);
  } catch (e) {
    console.error('swb:publish', e);
    return res.status(500).json({ error: 'Failed to publish workflow' });
  }
});

// Unpublish a workflow
router.patch('/:id/unpublish', async (req, res) => {
  try {
    await ensureTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad id' });

    const { rows } = await pool.query(
      `
      UPDATE public.simple_workflowbuilder
         SET ispublished = FALSE,
             datepublished = NULL,
             publishedby = NULL,
             "isPublished" = FALSE,
             "datePublished" = NULL,
             "PublishedBy" = NULL,
             date_modified = now()
       WHERE id = $1
       RETURNING *, ispublished AS "isPublished", datepublished AS "datePublished", publishedby AS "PublishedBy"
      `,
      [id]
    );
    return res.json(rows[0]);
  } catch (e) {
    console.error('swb:unpublish', e);
    return res.status(500).json({ error: 'Failed to unpublish workflow' });
  }
});

// // CREATE header
// router.post('/', async (req, res) => {
//   console.time('swb.create');
//   try {
//     await ensureTables();

//     const p = req.body || {};
//     const userId   = req.user?.id || null;
//     const tenantId = req.user?.tenant_id || null;

//     const workflow_map_name   = (p.workflow_map_name || '').trim();
//     const workflow_table_name = (p.workflow_table_name || '').trim();
//     if (!workflow_map_name || !workflow_table_name) {
//       return res.status(400).json({ error: 'workflow_map_name and workflow_table_name are required' });
//     }

//     const { rows } = await pool.query(
//       `INSERT INTO public.simple_workflowbuilder (
//          workflow_map_name, workflow_table_name,
//          date_created, date_modified,
//          created_by, modified_by,
//          step_performer, step_name, wf_status,
//          review_requestor, reviewer, initiator,
//          audit_trail, table_type, step_comments,
//          tenant_id, no_of_steps, user_access, version_info
//        ) VALUES (
//          $1, $2,
//          now(), now(),
//          $3, $3,
//          NULL, NULL, NULL,
//          NULL, NULL, $3,
//          COALESCE($4::jsonb, '[]'::jsonb), 'Workflow', NULL,
//          $5, COALESCE($6, 1), COALESCE($7::jsonb, '{}'::jsonb), COALESCE($8::jsonb, '{}'::jsonb)
//        )
//        RETURNING *`,
//       [
//         workflow_map_name,
//         workflow_table_name,
//         userId,
//         p.audit_trail ? JSON.stringify(p.audit_trail) : '[]',
//         tenantId,
//         p.no_of_steps ?? 1,
//         p.user_access ? JSON.stringify(p.user_access) : '{}',
//         p.version_info ? JSON.stringify(p.version_info) : '{}',
//       ]
//     );

//     return res.status(201).json(rows[0]);
//   } catch (e) {
//     console.error('swb:create', e);
//     return res.status(500).json({ error: 'Failed to create workflow' });
//   } finally {
//     console.timeEnd('swb.create');
//   }
// });

// CREATE (POST /api/simple_workflowbuilder)
router.post('/', async (req, res) => {
  try {
    // 1) Discover live table columns to avoid mismatches
    const { rows: cols } = await pool.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='simple_workflowbuilder'`
    );
    const have = new Set(cols.map(c => c.column_name));

    // 2) Validate input
    const p = req.body || {};
    const workflow_map_name   = (p.workflow_map_name || '').trim();
    const workflow_table_name = (p.workflow_table_name || '').trim();
    const no_of_steps =
      Number.isFinite(+p.no_of_steps) && +p.no_of_steps > 0 ? +p.no_of_steps : 1;

    if (!workflow_map_name || !workflow_table_name) {
      return res.status(400).json({ error: 'workflow_map_name and workflow_table_name are required' });
    }

    // 3) Build a minimal, schema-aware insert payload
    const userId   = req.user?.id || null;
    const tenantId = req.user?.tenant_id || null;

    const candidate = {
      workflow_map_name,
      workflow_table_name,
      // let DB defaults handle dates if they exist
      created_by: userId,
      modified_by: userId,
      tenant_id: tenantId,
      no_of_steps: no_of_steps,
      table_type: p.table_type || 'Workflow',
      audit_trail: JSON.stringify(p.audit_trail ?? []),  // jsonb safe
      user_access: JSON.stringify(p.user_access ?? {}),  // jsonb safe
      version_info: JSON.stringify(p.version_info ?? {}),// jsonb safe
      initiator: userId, // only used if column exists
      step_performer: null,
      step_name: null,
      wf_status: null,
      review_requestor: null,
      reviewer: null,
      step_comments: null,
    };

    // keep only keys that exist in the live table
    const fields = Object.keys(candidate).filter(k => have.has(k));
    if (fields.length < 2) {
      return res.status(500).json({ error: 'Table simple_workflowbuilder has an unexpected schema' });
    }

    // 4) Build INSERT dynamically
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(k => candidate[k]);

    const sql = `
      INSERT INTO public.simple_workflowbuilder (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);
    return res.status(201).json(rows[0]);
  } catch (e) {
    // Log detail so we can see the real DB error in the server console
    console.error('swb:create', e.message, e.detail || '', e.stack || '');
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
});


// DELETE header
router.delete('/:id', async (req, res) => {
  console.time('swb.delete');
  try {
    await ensureTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad id' });

    await pool.query(`DELETE FROM public.simple_workflowbuilder WHERE id = $1`, [id]);
    return res.status(204).end();
  } catch (e) {
    console.error('swb:delete', e);
    return res.status(500).json({ error: 'Failed to delete workflow' });
  } finally {
    console.timeEnd('swb.delete');
  }
});

module.exports = router;
