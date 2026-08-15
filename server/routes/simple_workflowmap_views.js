// server/routes/simple_workflowmap_views.js
const express = require('express');
const pool = require('../db');

module.exports = function simpleWorkflowMapViewsRouter() {
  const router = express.Router();

  router.use((req, _res, next) => {
    console.log(`[SWMV] ${req.method} ${req.originalUrl}`);
    next();
  });

  async function ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.simple_workflowmap_views (
        id            BIGSERIAL PRIMARY KEY,
        workflow_id   INTEGER NOT NULL,
        map_view      JSONB   NOT NULL DEFAULT '{}'::jsonb,
        date_created  TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_modified TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by    BIGINT,
        modified_by   BIGINT
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_swmv_workflow
        ON public.simple_workflowmap_views (workflow_id);
    `);
  }

  // GET /api/simple_workflowmap_views?workflow_id=123
  router.get('/', async (req, res) => {
    try {
      await ensureTable();
      const workflowId = Number(req.query.workflow_id);
      if (!Number.isFinite(workflowId) || workflowId <= 0) {
        return res.status(400).json({ error: 'workflow_id is required' });
      }
      const { rows } = await pool.query(
        `
        SELECT id, workflow_id, map_view,
               date_created, date_modified,
               created_by, modified_by
          FROM public.simple_workflowmap_views
         WHERE workflow_id = $1
         LIMIT 1
        `,
        [workflowId]
      );
      return res.json({ view: rows[0] || null });
    } catch (e) {
      console.error('[SWMV] get error', e);
      return res.status(500).json({ error: 'Failed to load map view' });
    }
  });

  // POST /api/simple_workflowmap_views
  router.post('/', async (req, res) => {
    try {
      await ensureTable();
      const workflowId = Number(req.body?.workflow_id);
      const mapView = req.body?.map_view;
      if (!Number.isFinite(workflowId) || workflowId <= 0) {
        return res.status(400).json({ error: 'workflow_id is required' });
      }
      if (mapView === undefined) {
        return res.status(400).json({ error: 'map_view is required' });
      }

      const { rows: existing } = await pool.query(
        `SELECT id FROM public.simple_workflowmap_views WHERE workflow_id = $1 LIMIT 1`,
        [workflowId]
      );
      if (existing.length) {
        return res.status(409).json({ error: 'map view already exists' });
      }

      const userId = req.user?.id || null;
      const { rows } = await pool.query(
        `
        INSERT INTO public.simple_workflowmap_views (
          workflow_id,
          map_view,
          created_by,
          modified_by,
          date_created,
          date_modified
        ) VALUES ($1, $2::jsonb, $3, $3, now(), now())
        RETURNING id, workflow_id, map_view,
                  date_created, date_modified,
                  created_by, modified_by
        `,
        [workflowId, JSON.stringify(mapView || {}), userId]
      );
      return res.status(201).json({ view: rows[0] });
    } catch (e) {
      console.error('[SWMV] create error', e);
      return res.status(500).json({ error: 'Failed to save map view' });
    }
  });

  // PUT /api/simple_workflowmap_views/:id
  router.put('/:id(\\d+)', async (req, res) => {
    try {
      await ensureTable();
      const id = Number(req.params.id);
      const workflowId = Number(req.body?.workflow_id);
      const mapView = req.body?.map_view;
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid id' });
      }
      if (!Number.isFinite(workflowId) || workflowId <= 0) {
        return res.status(400).json({ error: 'workflow_id is required' });
      }
      if (mapView === undefined) {
        return res.status(400).json({ error: 'map_view is required' });
      }

      const userId = req.user?.id || null;
      const { rows } = await pool.query(
        `
        UPDATE public.simple_workflowmap_views
           SET workflow_id = $1,
               map_view = $2::jsonb,
               modified_by = $3,
               date_modified = now()
         WHERE id = $4
         RETURNING id, workflow_id, map_view,
                  date_created, date_modified,
                  created_by, modified_by
        `,
        [workflowId, JSON.stringify(mapView || {}), userId, id]
      );
      if (!rows.length) {
        return res.status(404).json({ error: 'map view not found' });
      }
      return res.json({ view: rows[0] });
    } catch (e) {
      console.error('[SWMV] update error', e);
      return res.status(500).json({ error: 'Failed to update map view' });
    }
  });

  return router;
};
