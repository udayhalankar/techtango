// server/routes/tableConfig.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, table_name FROM table_config ORDER BY table_name;'
    );
    res.json(rows);
  } catch (e) {
    console.error('table-configs error', e);
    res.status(500).json({ message: 'Failed to fetch table configs' });
  }
});


// ...existing code...
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      'SELECT id, report_name, table_name, config FROM table_config WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('table-configs/:id error', e);
    res.status(500).json({ message: 'Failed to fetch table config' });
  }
});


// DETAIL (if you don't have it already)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    'SELECT id, report_name, table_name, config FROM table_config WHERE id = $1',
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
});

// DATA rows for a table_config (safe whitelist via table_config)
router.get('/:id/data', async (req, res) => {
  const id = Number(req.params.id);
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
  const search = (req.query.search || '').trim();

  // 1) read config & whitelisted table/columns
  const { rows: [cfg] } = await pool.query(
    'SELECT table_name, config FROM table_config WHERE id = $1',
    [id]
  );
  if (!cfg) return res.status(404).json({ message: 'Config not found' });

  const tableName = cfg.table_name;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return res.status(400).json({ message: 'Bad table name' });
  }

  const json = cfg.config || {};
  const colList = Object.entries(json)
    .filter(([, v]) => v && (v.show === true || v.visible === true))
    .map(([k]) => k);

  const safeIdent = (s) => `"${s.replace(/"/g, '""')}"`;
  const selectCols = (colList.length ? colList : ['*']).map(c => colList.length ? safeIdent(c) : c).join(', ');

  // 2) build optional search across first N columns
  let where = '';
  const params = [];
  if (search && colList.length) {
    const searchCols = colList.slice(0, 6).map(c => `(${safeIdent(c)})::text ILIKE $${params.length + 1}`).join(' OR ');
    params.push(`%${search}%`);
    where = `WHERE ${searchCols}`;
  }

  // 3) count + page
  const off = (page - 1) * pageSize;
  const totalSql = `SELECT COUNT(*)::int AS cnt FROM ${safeIdent(tableName)} ${where}`;
  const dataSql  = `
    SELECT ${selectCols}
    FROM ${safeIdent(tableName)}
    ${where}
    ORDER BY 1
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [{ rows: [{ cnt }] }, { rows }] = await Promise.all([
    pool.query(totalSql, params),
    pool.query(dataSql, [...params, pageSize, off]),
  ]);

  res.json({ columns: colList, rows, page, pageSize, total: cnt });
});


module.exports = router;
