// server/routes/formdata.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// --- helpers ----------------------------------------------------
const getConfig = async (viewId) => {
  const { rows } = await pool.query(
    `SELECT id, template_name, table_name, type, fields_json FROM form_configs WHERE id = $1`,
    [viewId]
  );
  if (!rows.length) return null;
  const cfg = rows[0];
  cfg.fields_json = typeof cfg.fields_json === 'string'
    ? JSON.parse(cfg.fields_json)
    : cfg.fields_json;
  return cfg;
};

const getPk = async (table) => {
  // table should be validated before this call
  const { rows } = await pool.query(
    `SELECT a.attname AS pk
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary = true
     LIMIT 1`,
    [table]
  );
  return rows[0]?.pk || 'id';
};

const qid = (ident) => `"${ident.replace(/"/g, '""')}"`; // quote identifier

// --- routes -----------------------------------------------------

// GET ids list
router.get('/:viewId/ids', async (req, res) => {
  try {
    const viewId = Number(req.params.viewId);
    const cfg = await getConfig(viewId);
    if (!cfg) return res.status(404).json({ error: 'Form config not found' });

    if (!IDENT_RE.test(cfg.table_name)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const pk = await getPk(cfg.table_name);
    const sql = `SELECT ${qid(pk)} AS id FROM ${qid(cfg.table_name)} ORDER BY 1 DESC LIMIT 100`;
    const { rows } = await pool.query(sql);
    res.json(rows.map(r => r.id));
  } catch (err) {
    console.error('IDs error:', err);
    res.status(500).json({ error: 'Failed to fetch record IDs' });
  }
});

// GET one row
router.get('/:viewId/:entryId', async (req, res) => {
  try {
    const viewId = Number(req.params.viewId);
    const entryId = Number(req.params.entryId);
    const cfg = await getConfig(viewId);
    if (!cfg) return res.status(404).json({ error: 'Form config not found' });

    if (!IDENT_RE.test(cfg.table_name)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const pk = await getPk(cfg.table_name);
    const sql = `SELECT * FROM ${qid(cfg.table_name)} WHERE ${qid(pk)} = $1 LIMIT 1`;
    const { rows } = await pool.query(sql, [entryId]);
    if (!rows.length) return res.status(404).json({ error: 'Record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch record data' });
  }
});

// INSERT
router.post('/insert', async (req, res) => {               // <-- fixed leading slash
  try {
    // Accept either shape
    const viewId = req.body.viewId ?? req.body.configId;
    const data   = req.body.data   ?? req.body.formData;

    if (!Number.isInteger(Number(viewId))) {
      return res.status(400).json({ error: 'viewId/configId is required' });
    }
    const cfg = await getConfig(Number(viewId));
    if (!cfg) return res.status(404).json({ error: `Form config not found for viewId ${viewId}` });

    if (!IDENT_RE.test(cfg.table_name)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // only fields marked dataEntry and not primary key
    const fields = (cfg.fields_json || []).filter(f => f?.dataEntry && f?.columnName);
    const cols = fields.map(f => f.columnName);

    if (!cols.length) return res.status(400).json({ error: 'No insertable columns in config' });

    // validate identifiers and collect values
    for (const c of cols) if (!IDENT_RE.test(c)) {
      return res.status(400).json({ error: `Invalid column: ${c}` });
    }
    const vals = cols.map(c => (data?.[c] ?? null));
    if (vals.every(v => v === null)) {
      return res.status(400).json({ error: 'No valid data provided for insert' });
    }

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const pk = await getPk(cfg.table_name);
    const sql = `INSERT INTO ${qid(cfg.table_name)} (${cols.map(qid).join(',')})
                 VALUES (${placeholders})
                 RETURNING ${qid(pk)} AS id`;
    console.log('INSERT:', sql, vals);

    const { rows } = await pool.query(sql, vals);
    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: 'Insert failed', details: err.message });
  }
});

// UPDATE
router.post('/update', async (req, res) => {
  try {
    const viewId = req.body.viewId ?? req.body.configId;
    const id     = req.body.id ?? req.body.entryId;
    const data   = req.body.data ?? req.body.formData;

    const cfg = await getConfig(Number(viewId));
    if (!cfg) return res.status(404).json({ error: 'Form config not found' });

    if (!IDENT_RE.test(cfg.table_name)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const fields = (cfg.fields_json || []).filter(f => f?.dataEntry && !f?.readOnly && f?.columnName);
    const cols = fields.map(f => f.columnName);

    for (const c of cols) if (!IDENT_RE.test(c)) {
      return res.status(400).json({ error: `Invalid column: ${c}` });
    }

    const sets = cols.map((c, i) => `${qid(c)} = $${i + 1}`).join(', ');
    const vals = cols.map(c => (data?.[c] ?? null));

    const pk = await getPk(cfg.table_name);
    const sql = `UPDATE ${qid(cfg.table_name)} SET ${sets} WHERE ${qid(pk)} = $${cols.length + 1}`;
    vals.push(id);

    console.log('UPDATE:', sql, vals);
    await pool.query(sql, vals);
    res.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

module.exports = router;



// const express = require('express');

// const router = express.Router();

// const pool = require('../db');

 

// // Helper: Get form config from DB and parse fields_json

// const getConfig = async (viewId) => {

//   const result = await pool.query(`SELECT * FROM form_configs WHERE id = $1`, [viewId]);

//   if (!result.rows.length) return null;

 

//   const config = result.rows[0];

//   config.fields_json = typeof config.fields_json === 'string'

//     ? JSON.parse(config.fields_json)

//     : config.fields_json;

 

//   return config;

// };

 

// // 📌 GET all record IDs for a view

// router.get('/:viewId/ids', async (req, res) => {

//   const { viewId } = req.params;

//   try {

//     const config = await getConfig(viewId);

//     const result = await pool.query(`SELECT id FROM ${config.table_name}`);

//     res.json(result.rows.map(r => r.id));

//   } catch (err) {

//     console.error('Error fetching IDs:', err);

//     res.status(500).json({ error: 'Failed to fetch record IDs' });

//   }

// });

 

// // 📌 GET a specific record by viewId and entryId

// router.get('/:viewId/:entryId', async (req, res) => {

//   const { viewId, entryId } = req.params;

//   try {

//     const config = await getConfig(viewId);

//     const result = await pool.query(`SELECT * FROM ${config.table_name} WHERE id = $1`, [entryId]);

//     if (result.rows.length === 0) {

//       return res.status(404).json({ error: 'Record not found' });

//     }

//     res.json(result.rows[0]);

//   } catch (err) {

//     console.error('Error fetching record:', err);

//     res.status(500).json({ error: 'Failed to fetch record data' });

//   }

// });

 

// // ✅ INSERT new data into form table

// router.post('insert', async (req, res) => {

//   const { viewId, data } = req.body;

//   try {

//     const config = await getConfig(viewId);

   

//     if (!config) {

//       return res.status(404).json({ error: 'Form config not found for viewId ' + viewId });

//     }

 

//     // Only include fields that allow data entry and are not auto-increment PKs

//     const fields = config.fields_json.filter(f => f.dataEntry && f.columnName !== 'id');

//     const columns = fields.map(f => f.columnName);

//     const values = columns.map(col => data[col]  ?? null);

 

//     console.log("🧩 Insertable Columns:", columns);

// console.log("📦 Corresponding Values:", values);

 

//     if (!columns.length || !values.length) {

//       return res.status(400).json({ error: 'No valid data provided for insert' });

//     }

 

//     const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

//     const query = `INSERT INTO ${config.table_name} (${columns.join(',')}) VALUES (${placeholders}) RETURNING id`;

 

//     console.log('🟢 INSERT QUERY:', query);

//     console.log('🟢 INSERT VALUES:', values);

 

//     const result = await pool.query(query, values);

//     res.json({ success: true, id: result.rows[0].id });

//   } catch (err) {

//     console.error('❌ Insert error:', err);

//     res.status(500).json({ error: 'Insert failed', details: err.message });

//   }

// });

 

// // ✅ UPDATE existing record

// router.post('/update', async (req, res) => {

//   const { viewId, id, data } = req.body;

//   try {

//     const config = await getConfig(viewId);

//     const fields = config.fields_json.filter(f => f.dataEntry && !f.readOnly);

//     const columns = fields.map(f => f.columnName);

 

//     const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

//     const values = columns.map(col => data[col]  ?? null);

 

//     console.log("🧩 Insertable Columns:", columns);

// console.log("📦 Corresponding Values:", values);

 

//     const query = `UPDATE ${config.table_name} SET ${setClause} WHERE id = $${columns.length + 1}`;

//     values.push(id);

 

//     console.log('🟡 UPDATE QUERY:', query);

//     console.log('🟡 UPDATE VALUES:', values);

 

//     await pool.query(query, values);

//     res.json({ success: true });

//   } catch (err) {

//     console.error('❌ Update error:', err);

//     res.status(500).json({ error: 'Update failed', details: err.message });

//   }

// });

 

// module.exports = router;