const express = require('express');

const router = express.Router();

const pool = require('../config/db');

 

// Helper: Get form config from DB and parse fields_json

const getConfig = async (viewId) => {

  const result = await pool.query(`SELECT * FROM form_configs WHERE id = $1`, [viewId]);

  if (!result.rows.length) return null;

 

  const config = result.rows[0];

  config.fields_json = typeof config.fields_json === 'string'

    ? JSON.parse(config.fields_json)

    : config.fields_json;

 

  return config;

};

 

// 📌 GET all record IDs for a view

router.get('/:viewId/ids', async (req, res) => {

  const { viewId } = req.params;

  try {

    const config = await getConfig(viewId);

    const result = await pool.query(`SELECT id FROM ${config.table_name}`);

    res.json(result.rows.map(r => r.id));

  } catch (err) {

    console.error('Error fetching IDs:', err);

    res.status(500).json({ error: 'Failed to fetch record IDs' });

  }

});

 

// 📌 GET a specific record by viewId and entryId

router.get('/:viewId/:entryId', async (req, res) => {

  const { viewId, entryId } = req.params;

  try {

    const config = await getConfig(viewId);

    const result = await pool.query(`SELECT * FROM ${config.table_name} WHERE id = $1`, [entryId]);

    if (result.rows.length === 0) {

      return res.status(404).json({ error: 'Record not found' });

    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error('Error fetching record:', err);

    res.status(500).json({ error: 'Failed to fetch record data' });

  }

});

 

// ✅ INSERT new data into form table

router.post('/insert', async (req, res) => {

  const { viewId, data } = req.body;

  try {

    const config = await getConfig(viewId);

   

    if (!config) {

      return res.status(404).json({ error: 'Form config not found for viewId ' + viewId });

    }

 

    // Only include fields that allow data entry and are not auto-increment PKs

    const fields = config.fields_json.filter(f => f.dataEntry && f.columnName !== 'id');

    const columns = fields.map(f => f.columnName);

    const values = columns.map(col => data[col]  ?? null);

 

    console.log("🧩 Insertable Columns:", columns);

console.log("📦 Corresponding Values:", values);

 

    if (!columns.length || !values.length) {

      return res.status(400).json({ error: 'No valid data provided for insert' });

    }

 

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

    const query = `INSERT INTO ${config.table_name} (${columns.join(',')}) VALUES (${placeholders}) RETURNING id`;

 

    console.log('🟢 INSERT QUERY:', query);

    console.log('🟢 INSERT VALUES:', values);

 

    const result = await pool.query(query, values);

    res.json({ success: true, id: result.rows[0].id });

  } catch (err) {

    console.error('❌ Insert error:', err);

    res.status(500).json({ error: 'Insert failed', details: err.message });

  }

});

 

// ✅ UPDATE existing record

router.post('/update', async (req, res) => {

  const { viewId, id, data } = req.body;

  try {

    const config = await getConfig(viewId);

    const fields = config.fields_json.filter(f => f.dataEntry && !f.readOnly);

    const columns = fields.map(f => f.columnName);

 

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const values = columns.map(col => data[col]  ?? null);

 

    console.log("🧩 Insertable Columns:", columns);

console.log("📦 Corresponding Values:", values);

 

    const query = `UPDATE ${config.table_name} SET ${setClause} WHERE id = $${columns.length + 1}`;

    values.push(id);

 

    console.log('🟡 UPDATE QUERY:', query);

    console.log('🟡 UPDATE VALUES:', values);

 

    await pool.query(query, values);

    res.json({ success: true });

  } catch (err) {

    console.error('❌ Update error:', err);

    res.status(500).json({ error: 'Update failed', details: err.message });

  }

});

 

module.exports = router;