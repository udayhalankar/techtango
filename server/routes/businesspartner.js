const express = require('express');
const router = express.Router();
const pool = require('../db'); // adjust path to your PostgreSQL pool config
const { verifyToken } = require('../middleware/authMiddleware');
// GET all business partners (clients)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, type, phone, address 
      FROM businesspartner 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching business partners:', err);
    res.status(500).json({ error: 'Failed to fetch business partners' });
  }
});

module.exports = router;
