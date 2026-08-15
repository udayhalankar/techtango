// server/routes/chartConfigs.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
//const verifyToken = require('../middleware/verifyToken'); // if used

// List
// router.get('/', verifyToken, async (req, res) => {
    router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, chart_name, chart_description, chart_config_json, created_by, created_at, modified_by, modified_at FROM chart_configs ORDER BY id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Get one
// router.get('/:id', verifyToken, async (req, res) => {
    router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM chart_configs WHERE id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Create
// router.post('/', verifyToken, async (req, res) => {
router.post('/', async (req, res) => {
  const { chart_name, chart_description, chart_config_json } = req.body;
  if (!chart_name || !chart_config_json) {
    return res.status(400).json({ error: 'chart_name and chart_config_json required' });
  }
  const userId = req.user?.id || null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO chart_configs (chart_name, chart_description, chart_config_json, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [chart_name, chart_description || null, chart_config_json, userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Create failed' });
  }
});

// Update
// router.put('/:id', verifyToken, async (req, res) => {
    router.put('/:id', async (req, res) => {
  const { chart_name, chart_description, chart_config_json } = req.body;
  const userId = req.user?.id || null;

  try {
    const { rows } = await pool.query(
      `UPDATE chart_configs
       SET chart_name = COALESCE($1, chart_name),
           chart_description = COALESCE($2, chart_description),
           chart_config_json = COALESCE($3, chart_config_json),
           modified_by = $4
       WHERE id=$5
       RETURNING *`,
      [chart_name || null, chart_description || null, chart_config_json || null, userId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete (optional)
// router.delete('/:id', verifyToken, async (req, res) => {
    router.delete('/:id',  async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM chart_configs WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
