// routes/forms.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');


// Helper to fetch fields_json from your config table(s)
async function getFieldsJson(formId) {
  // Try form_configs first
  let r = await pool.query(`SELECT fields_json FROM form_configs WHERE id = $1`, [formId]);
  if (r.rows.length && r.rows[0].fields_json) return r.rows[0].fields_json;

  // Fallback: form_templates (if you store JSON there)
  r = await pool.query(`SELECT fields_json FROM form_templates WHERE id = $1`, [formId]);
  if (r.rows.length && r.rows[0].fields_json) return r.rows[0].fields_json;

  return null;
}

// GET list of user fields for a form
router.get('/forms/:formId/user-fields', verifyToken, async (req, res) => {
  const { formId } = req.params;
  try {
    const raw = await getFieldsJson(formId);
    let fields = [];
    try { fields = Array.isArray(raw) ? raw : JSON.parse(raw || '[]'); } catch {}

    const isUserField = (f) => {
      const t = (f?.dataType || f?.type || '').toString().toLowerCase();
      return t === 'user' || t === 'lookup:user' || /user_id$/.test(String(f?.name||f?.field||''));
    };

    const list = fields
      .filter(isUserField)
      .map((f, i) => ({
        name: f?.name || f?.field || f?.field_name || f?.columnName || `user_field_${i}`,
        label: f?.label || f?.caption || f?.title || 'User'
      }));

    res.json(list);
  } catch (e) {
    console.error('GET /forms/:formId/user-fields failed:', e);
    res.status(500).json({ error: 'Failed to load user fields' });
  }
});

// GET valid users for a user-field (return all users for now)
router.get('/forms/:formId/user-fields/:fieldName/valid-users', verifyToken, async (_req, res) => {
  try {
    const r = await pool.query(`SELECT id, full_name FROM users ORDER BY full_name`);
    res.json(r.rows);
  } catch (e) {
    console.error('GET valid-users failed:', e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// ==============================
// GET all form configs
// ==============================
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM form_configs ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching form configs:', err);
    res.status(500).json({ error: 'Failed to fetch form configs' });
  }
});

// ==============================
// POST create new form config
// ==============================
router.post('/', async (req, res) => {
  let { templateName, tableName, fields, type } = req.body;

  if (!templateName || !tableName || !fields) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: Check if this template already has a Master form
    const existingMaster = await pool.query(
      `SELECT id FROM form_configs WHERE template_name = $1 AND type = 'Master'`,
      [templateName]
    );

    // Step 2: Force type = 'Master' if no existing Master for this template
    if (existingMaster.rows.length === 0) {
      console.log(`⏱ Forcing type=Master for new template: ${templateName}`);
      type = 'Master';
    }

    // Step 3: Prevent duplicate (template_name, type)
    const duplicateCheck = await pool.query(
      `SELECT id FROM form_configs WHERE template_name = $1 AND type = $2`,
      [templateName, type]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Form with same name and view type already exists' });
    }

    // Step 4: Insert new config
    let insertedId;

    if (type === 'Master') {
      const result = await pool.query(
        `INSERT INTO form_configs (template_name, table_name, type, fields_json)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [templateName, tableName, type, JSON.stringify(fields)]
      );

      insertedId = result.rows[0].id;

      await pool.query(`UPDATE form_configs SET master_ref = $1 WHERE id = $1`, [insertedId]);

      return res.json({ success: true, id: insertedId });
    }

    if (type === 'Update') {
      const master = await pool.query(
        `SELECT id FROM form_configs WHERE template_name = $1 AND type = 'Master'`,
        [templateName]
      );

      if (master.rows.length === 0) {
        return res.status(400).json({ error: 'No Master form found for Update' });
      }

      const masterRef = master.rows[0].id;

      const result = await pool.query(
        `INSERT INTO form_configs (template_name, table_name, type, master_ref, fields_json)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [templateName, tableName, type, masterRef, JSON.stringify(fields)]
      );

      return res.json({ success: true, id: result.rows[0].id });
    }

    return res.status(400).json({ error: 'Invalid view type' });

  } catch (err) {
    console.error('❌ Error saving form config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
