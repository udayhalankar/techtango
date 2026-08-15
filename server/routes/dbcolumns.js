// server/routes/dbcolumns.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

/**
 * GET /api/db/columns?table=<name>&schema=public
 * GET /api/db/columns/:table  (defaults schema=public)
 * Returns: { schema, table, columns: [{column_name, data_type, udt_name, ordinal_position}] }
 */

async function fetchColumns(schema, table) {
  const { rows } = await pool.query(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
    `,
    [schema, table]
  );
  return rows;
}

router.get('/columns', async (req, res) => {
  try {
    const table = String(req.query.table || '').trim();
    const schema = String(req.query.schema || 'public').trim() || 'public';
    if (!table) return res.status(400).json({ error: 'Missing ?table=' });

    const columns = await fetchColumns(schema, table);
    return res.json({ schema, table, columns });
  } catch (e) {
    console.error('[dbcolumns] /columns', e);
    return res.status(500).json({ error: 'Failed to load columns' });
  }
});

router.get('/columns/:table', async (req, res) => {
  try {
    const table = String(req.params.table || '').trim();
    const schema = String(req.query.schema || 'public').trim() || 'public';
    if (!table) return res.status(400).json({ error: 'Bad table' });

    const columns = await fetchColumns(schema, table);
    return res.json({ schema, table, columns });
  } catch (e) {
    console.error('[dbcolumns] /columns/:table', e);
    return res.status(500).json({ error: 'Failed to load columns' });
  }
});

module.exports = router;
