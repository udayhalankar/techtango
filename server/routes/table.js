// server/routes/table.js
//MERGED TABLE.JS OFF AND THIS SYSTEM

const express = require('express');
const router = express.Router();
const pool = require('../db');

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const isIdent = (x) => IDENT_RE.test(String(x || ''));

function mapPgTypeToUi(pgType) {
  const t = String(pgType).toLowerCase();
  if (/(int|numeric|decimal|real|double|money)/.test(t)) return 'number';
  if (/(date|time|timestamp)/.test(t)) return 'date';
  return 'text';
}

/** 1) List tables
 *  GET /api/tables?prefix=cust_
 *  GET /api/tables/list?prefix=cust_
 */
async function listTables(req, res) {
  try {
    const prefix = (req.query.prefix || '').trim();
    let sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('pg_stat_statements')
    `;
    const params = [];
    if (prefix) {
      sql += ` AND table_name LIKE $1`;
      params.push(`${prefix}%`);
    }
    sql += ` ORDER BY table_name`;

    const result = await pool.query(sql, params);
    res.json(result.rows.map((r) => r.table_name));
  } catch (err) {
    console.error('List tables error:', err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
}

router.get('/', listTables);
router.get('/list', listTables);

/** 2) Columns (original endpoint) */
router.get('/columns/:tableName', async (req, res) => {
  const { tableName } = req.params;
  if (!isIdent(tableName)) return res.status(400).json({ error: 'Invalid table name' });

  try {
    const result = await pool.query(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [tableName]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Table not found or has no columns' });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching columns:', err);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

/** 3) Schema for a table
 *  GET /api/tables/schema/:table
 */
router.get('/schema/:table', async (req, res) => {
  const table = req.params.table;
  if (!isIdent(table)) return res.status(400).json({ message: 'Invalid table name' });

  try {
    const colsQ = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.character_maximum_length
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position
    `;
    const cols = await pool.query(colsQ, [table]);

    const pkQ = `
      SELECT a.attname AS col
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `;
    const pk = await pool.query(pkQ, [table]);
    const primaryKey = pk.rows[0]?.col || 'id';

    const fields = cols.rows.map((r) => ({
      name: r.column_name,
      label: r.column_name.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
      type: mapPgTypeToUi(r.data_type),
      options: undefined,
      nullable: r.is_nullable === 'YES',
      maxLength: r.character_maximum_length,
    }));

    res.json({ primaryKey, fields });
  } catch (err) {
    console.error('GET /schema/:table error', err);
    res.status(500).json({ message: 'Failed to fetch schema' });
  }
});

/** 4) Data for a table (LIMIT 500)
 *  GET /api/tables/data/:table?fields=a,b,c
 */
router.get('/data/:table', async (req, res) => {
  const table = req.params.table;
  if (!isIdent(table)) return res.status(400).json({ message: 'Invalid table name' });

  const fieldList = (req.query.fields || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    let cols = '*';
    if (fieldList.length) {
      for (const f of fieldList) {
        if (!isIdent(f)) return res.status(400).json({ message: `Invalid column: ${f}` });
      }
      cols = fieldList.map((f) => `"${f}"`).join(', ');
    }

    const sql = `SELECT ${cols} FROM "${table}" ORDER BY 1 ASC LIMIT 500`;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('GET /data/:table error', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

/** 5) Update one row
 *  PUT /api/tables/data/:table/:id  body: { changes }
 */
// routes/table.js
// routes/table.js
router.put('/data/:table/:id', async (req, res, next) => {
  try {
    const { table, id } = req.params;
    const changes = req.body?.changes;

    if (!isIdent(table)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    if (
      !changes ||
      typeof changes !== 'object' ||
      !Object.keys(changes).length
    ) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    // Get primary key column for this table
    const pkQ = `
      SELECT a.attname AS col
      FROM pg_index i
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
        AND i.indisprimary;
    `;
    const pkRes = await pool.query(pkQ, [table]);
    const primaryKey = pkRes.rows[0]?.col || 'id';

    // Get list of columns for allow-listing
    const colsQ = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `;
    const colsRes = await pool.query(colsQ, [table]);
    const allowedCols = new Set(colsRes.rows.map((r) => r.column_name));

    // Filter out protected fields and invalid identifiers
    const PROTECTED = new Set([primaryKey, 'created_at', 'created_by']);
    const entries = Object.entries(changes).filter(
      ([k]) => isIdent(k) && allowedCols.has(k) && !PROTECTED.has(k)
    );

    if (!entries.length) {
      return res
        .status(400)
        .json({ message: 'No valid columns to update' });
    }

    // Build update statement
    const setParts = [];
    const values = [];
    entries.forEach(([k, v], i) => {
      setParts.push(`"${k}" = $${i + 1}`);
      values.push(v);
    });

    // WHERE PK = $n
    values.push(id);
    const whereParamIndex = entries.length + 1;

    const sql = `
      UPDATE "${table}"
      SET ${setParts.join(', ')}
      WHERE "${primaryKey}" = $${whereParamIndex}
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, values);
    const updated = rows[0];
    if (!updated) {
      return res.status(404).json({ message: 'Row not found' });
    }

    

    return res.json({ updated });
  } catch (err) {
    console.error('PUT /data/:table/:id error', err);
    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to update row',
        details: String(err?.message || err),
      });
    }
    return next(err);
  }
});








/** 6) Saved reports CRUD
 *  Requires table:
 *  CREATE TABLE IF NOT EXISTS table_config (
 *    id SERIAL PRIMARY KEY,
 *    report_name TEXT NOT NULL,
 *    table_name  TEXT NOT NULL,
 *    config      JSONB NOT NULL,
 *    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *  );
 */

router.get('/reports', async (req, res) => {
  try {
    const { table } = req.query;
    const sql = table
      ? `SELECT id, report_name, table_name, created_at, updated_at FROM table_config WHERE table_name = $1 ORDER BY created_at DESC`
      : `SELECT id, report_name, table_name, created_at, updated_at FROM table_config ORDER BY created_at DESC`;
    const params = table ? [table] : [];
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /reports error', err);
    res.status(500).json({ message: 'Failed to list reports' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { name: report_name, table: table_name, config } = req.body || {};
    if (!report_name || !table_name || !config) {
      return res.status(400).json({ message: 'name, table, and config are required' });
    }
    const sql = `
      INSERT INTO table_config (report_name, table_name, config)
      VALUES ($1, $2, $3)
      RETURNING id, report_name, table_name, created_at, updated_at
    `;
    const { rows } = await pool.query(sql, [report_name, table_name, config]);
    res.json({ reportId: rows[0].id, report: rows[0] });
  } catch (err) {
    console.error('POST /reports error', err);
    res.status(500).json({ message: 'Failed to save report' });
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, report_name, table_name, config, created_at, updated_at
       FROM table_config WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /reports/:id error', err);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

router.put('/reports/:id', async (req, res) => {
  try {
    const { name: report_name, table: table_name, config } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE table_config
         SET report_name = COALESCE($1, report_name),
             table_name  = COALESCE($2, table_name),
             config      = COALESCE($3, config),
             updated_at  = NOW()
       WHERE id = $4
       RETURNING id, report_name, table_name, config, created_at, updated_at`,
      [report_name ?? null, table_name ?? null, config ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /reports/:id error', err);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM table_config WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /reports/:id error', err);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});




// 3b) Get one row for a workflow instance
// GET /api/tables/dataByWorkflow/:table/:workflowId
router.get('/dataByWorkflow/:table/:workflowId', async (req, res) => {
  try {
    const { table, workflowId } = req.params;
    if (!isIdent(table)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    const sql = `
      SELECT *
      FROM "${table}"
      WHERE "workflow_id" = $1
      ORDER BY 1 ASC
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, [String(workflowId)]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Row not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /dataByWorkflow error', err);
    return res.status(500).json({
      message: 'Failed to fetch row',
      details: String(err?.message || err),
    });
  }
});

module.exports = router; // 👈 IMPORTANT
//MERGED TABLE.JS OFF AND THIS SYSTEM


