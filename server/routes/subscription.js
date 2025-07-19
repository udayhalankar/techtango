// routes/subscription.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

// ✅ Existing: subscribe to a module
router.post('/subscribe', verifyToken, async (req, res) => {
  const { moduleId } = req.body;
  const userId = req.user.userId;

  try {
    const check = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 AND module_id = $2 AND status = $3',
      [userId, moduleId, 'active']
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'Already subscribed.' });
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, module_id, start_date, status)
       VALUES ($1, $2, CURRENT_DATE, $3) RETURNING *`,
      [userId, moduleId, 'active']
    );

    res.json({ subscription: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ NEW: Get all active modules
router.get('/modules', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, status, created_at FROM modules WHERE status = $1',
      ['active']
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ NEW: Get current user's subscriptions
router.get('/subscriptions', verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `
      SELECT 
        s.id AS subscription_id,
        s.module_id,
        m.name AS module_name,
        m.description AS description,         -- ✅ Add this line to get the description
        m.routeinfo AS route,         -- ✅ Add this line to get the description
        s.start_date,
        s.end_date,
        s.status
      FROM subscriptions s
      JOIN modules m ON s.module_id = m.id
      WHERE s.user_id = $1 AND s.status = $2
      `,
      [userId, 'active']
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET all subscriptions - admin only


router.get('/all-subscriptions', verifyToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        s.id AS subscription_id,
        u.email,
        m.name AS module_name,
        s.start_date,
        s.end_date,
        s.status
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN modules m ON s.module_id = m.id
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ NEW: get details for ONE module, only if subscribed
router.get('/module/:id', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const moduleId = req.params.id;

  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id = $1 AND module_id = $2 AND status = $3',
    [userId, moduleId, 'active']
  );

  if (result.rows.length === 0) {
    return res.status(403).json({ message: 'Access denied. Not subscribed.' });
  }

  // Get module info
  const moduleInfo = await pool.query(
    'SELECT * FROM modules WHERE id = $1',
    [moduleId]
  );

  res.json(moduleInfo.rows[0]);
});



// ✅ Protected BPM module data
router.get('/bpm/data', verifyToken, async (req, res) => {
  const userId = req.user.userId;

  const check = await pool.query(
    `
    SELECT * FROM subscriptions
    WHERE user_id = $1
    AND status = 'active'
    AND module_id = (
      SELECT id FROM modules WHERE name = 'BPM'
    )
    `,
    [userId]
  );

  if (check.rows.length === 0) {
    return res.status(403).json({ message: 'Access denied. Not subscribed to BPM.' });
  }

  // ✅ Sample protected response
  res.json({ message: 'Welcome to BPM module data' });
});


module.exports = router;
