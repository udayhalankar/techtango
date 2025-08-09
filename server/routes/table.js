const express = require('express');
const router = express.Router();
const pool = require('../db');
 

router.get('/list', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('pg_stat_statements') -- optional exclusion
      ORDER BY table_name
    `);

    res.json(result.rows.map(row => row.table_name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tables' });

  }

});

 

router.get('/columns/:tableName', async (req, res) => {

  const { tableName } = req.params;

  // ✅ Basic validation to avoid SQL injection

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

 

  try {

    const result = await pool.query(`

      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position

    `, [tableName]);

 

    if (result.rows.length === 0) {

      return res.status(404).json({ error: 'Table not found or has no columns' });

    }

 

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching columns:', err);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }

});

 

module.exports = router;