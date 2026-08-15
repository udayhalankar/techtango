// routes/catalog.js
// [CHANGE NOTE] Catalog endpoints aligned to your DB schema.
// Mount in server: app.use('/api/catalog', require('./routes/catalog'));

const express = require('express');
const router = express.Router();

// quick ping to prove the router is mounted
router.get('/__ping', (req, res) => res.json({ catalog: 'ok' }));

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    base: req.baseUrl,
    endpoints: {
      ping: `${req.baseUrl}/__ping`,
      forms: `${req.baseUrl}/forms`,
    },
  });
});

// [CHANGE START: adjust this import to wherever your pg Pool is exported]
const db = require('../db'); // must expose db.query(sql, params)
// [CHANGE END]

/**
 * FORMS
 * - from form_configs: id, template_name, type, master_ref
 * - client shows Masters as `template_name` and Updates as `template_name - Update`
 */
router.get('/forms', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, template_name, type, master_ref
         FROM public.form_configs
        ORDER BY template_name, type`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /catalog/forms failed', e);
    res.status(500).json({ error: 'Failed to load forms' });
  }
});

/**
 * REPORTS
 * - from table_config: id, report_name
 */
router.get('/reports', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, report_name
         FROM public.table_config
        ORDER BY report_name`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /catalog/reports failed', e);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

/**
 * USERS
 * - your table "users" has no full_name; compute it for UI
 */
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,
              COALESCE(username, email, 'user ' || id::text) AS full_name
         FROM public.users
        ORDER BY full_name`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /catalog/users failed', e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

module.exports = router;
