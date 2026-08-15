// server/routes/dbmeta.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
//const verifyToken = require('../middleware/verifyToken'); // if you have it
// const verifyToken = require('../middleware/authMiddleware.js'); // if you have it
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

// List tables (filter to your schema if you want)
// router.get('/tables', verifyToken, async (req, res) => {
//    router.get('/tables', async (req, res) => {

router.get('/meta/tables', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' ORDER BY table_name
  `);
  res.json(rows.map(r => r.table_name));
});


router.get('/tables', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    res.json(rows.map(r => r.table_name));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list tables' });
  }
});

// List columns with data types for a given table
// router.get('/columns', verifyToken, async (req, res) => {
    // router.get('/columns', async (req, res) => {
router.get('/columns', verifyToken, async (req, res) => {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: 'Missing table' });

  try {
    const { rows } = await pool.query(
      `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [table]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list columns' });
  }
});

// Quick preview data (safe-ish: select whitelisted columns, limit)
// router.get('/preview', verifyToken, async (req, res) => {
    // router.get('/preview',  async (req, res) => {
router.get('/preview', verifyToken,  async (req, res) => {
  const { table, columns, limit = 50 } = req.query;
  if (!table || !columns) return res.status(400).json({ error: 'Missing table or columns' });

  // VERY IMPORTANT: sanitize identifiers!
  // Minimal guard: allow only letters, numbers, underscore.
  const safeIdent = s => /^[a-zA-Z0-9_]+$/.test(s);
  if (!safeIdent(table)) return res.status(400).json({ error: 'Bad table' });

  // const cols = columns.split(',').filter(safeIdent);
  // if (!cols.length) return res.status(400).json({ error: 'Bad columns' });

  const requestedCols = columns.split(',').filter(safeIdent);
  if (!requestedCols.length) return res.status(400).json({ error: 'Bad columns' });

  // const colList = cols.map(c => `"${c}"`).join(', ');
  // const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const lim = Math.min(parseInt(limit, 10) || 50, 200);

  try {
    // const { rows } = await pool.query(`SELECT ${colList} FROM "${table}" LIMIT ${lim}`);
    // res.json(rows);

       // Ensure requested columns actually belong to the table
    const { rows: validColRows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      `,
      [table]
    );
    const validCols = new Set(validColRows.map(r => r.column_name));
    const cols = requestedCols.filter(c => validCols.has(c)).slice(0, 50); // clamp number of columns
    if (!cols.length) return res.status(400).json({ error: 'No valid columns for preview' });

    const colList = cols.map(c => `"${c}"`).join(', ');
    const sql = `SELECT ${colList} FROM "${table}" ORDER BY 1 LIMIT ${lim}`;
    const { rows } = await pool.query(sql);
    res.json(rows);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Preview failed' });
  }
});

module.exports = router;
