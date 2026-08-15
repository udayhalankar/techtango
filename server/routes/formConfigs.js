// server/routes/formConfigs.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/; // guard against bad table names

/* ----------------------------- LISTS ------------------------------ */

// ONLY Master forms, de-duped by template_name (latest id wins)
router.get('/masters', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (template_name)
             id, template_name
      FROM form_configs
      WHERE type = 'Master'
      ORDER BY template_name, id DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error('GET /form-configs/masters error', e);
    res.status(500).json({ message: 'Failed to fetch masters' });
  }
});

// Generic list (supports ?type=Master)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT id, template_name FROM form_configs';
    const params = [];
    if (type) { sql += ' WHERE type = $1'; params.push(type); }
    sql += ' ORDER BY template_name;';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('form-configs list error', e);
    res.status(500).json({ message: 'Failed to fetch form configs' });
  }
});

/* --------------------------- SINGLE ITEMS ------------------------- */

// One config by id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'id must be an integer' });
    }
    const { rows } = await pool.query(
      `SELECT id, template_name, table_name, type, fields_json
         FROM form_configs
        WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('form-configs/:id error', e);
    res.status(500).json({ message: 'Failed to fetch form config' });
  }
});

// Sample data for a Master form (first row or ?id=<rowId>)
router.get('/:id/data', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'id must be an integer' });
    }

    // Enforce Master type as requested
    const fc = await pool.query(
      `SELECT table_name
         FROM form_configs
        WHERE id = $1 AND type = 'Master'`,
      [id]
    );
    if (!fc.rows.length) {
      return res.status(404).json({ message: 'Master form not found for this id' });
    }

    const table = fc.rows[0].table_name;
    if (!IDENT_RE.test(table)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    const entryId = req.query.id ? Number(req.query.id) : null;
    const sql = entryId
      ? `SELECT * FROM "${table}" WHERE id = $1 LIMIT 1`
      : `SELECT * FROM "${table}" ORDER BY 1 LIMIT 1`;

    const { rows } = await pool.query(sql, entryId ? [entryId] : []);
    res.json({ row: rows[0] || null });
  } catch (e) {
    console.error('form-configs/:id/data error', e);
    res.status(500).json({ message: 'Failed to fetch data', error: e.message });
  }
});

module.exports = router;
