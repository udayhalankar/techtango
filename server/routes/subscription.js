// routes/subscription.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { logAudit } = require('../utils/auditLogger'); // ✅ Import audit util

// 🔍 Sanity check
router.get('/', async (req, res) => {
  console.log('▶▶ HIT /api/subscriptions');
  try {
    const { rows } = await pool.query('SELECT * FROM subscriptions');
    return res.json(rows);
  } catch (err) {
    console.error('Subscriptions error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Subscribe to a module
router.post('/subscribe', verifyToken, async (req, res) => {
  const { moduleId } = req.body;
  const userId = req.user.id;

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

    const subscriptionId = result.rows[0].id;

    // ✅ Audit log
    await logAudit({
      userId,
      action: 'module_subscribe',
      tableName: 'subscriptions',
      recordId: subscriptionId,
      details: { module_id: moduleId },
    });

    res.json({ subscription: result.rows[0] });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get all active modules
router.get('/modules', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, status, routeinfo FROM modules WHERE status = $1',
      ['active']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch modules error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get current user's subscriptions
router.get('/subscriptions', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        s.id AS subscription_id,
        s.module_id,
        m.name AS module_name,
        m.description,
        m.routeinfo AS route,
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
    console.error('User subscriptions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




// 🗑️ Unsubscribe (soft delete): mark as inactive and set end_date
router.delete('/subscriptions/:moduleId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const moduleId = Number(req.params.moduleId);

  try {
    const { rows } = await pool.query(
      `
      UPDATE subscriptions
         SET status = 'inactive',
             end_date = CURRENT_DATE
       WHERE user_id = $1
         AND module_id = $2
         AND status = 'active'
       RETURNING *
      `,
      [userId, moduleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No active subscription found.' });
    }

    // ✅ Audit log
    try {
      await logAudit({
        userId,
        action: 'module_unsubscribe',
        tableName: 'subscriptions',
        recordId: rows[0].id,
        details: { module_id: moduleId },
      });
    } catch (e) {
      // do not fail request if audit write fails
      console.warn('audit log failed:', e?.message || e);
    }

    return res.json({ ok: true, subscription: rows[0] });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});










// ✅ Admin: Get all subscriptions
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
    console.error('All subscriptions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get one module (if subscribed)
router.get('/module/:id', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const moduleId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 AND module_id = $2 AND status = $3',
      [userId, moduleId, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. Not subscribed.' });
    }

    const moduleInfo = await pool.query('SELECT * FROM modules WHERE id = $1', [moduleId]);
    res.json(moduleInfo.rows[0]);
  } catch (err) {
    console.error('Module access error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ BPM Protected Data Route
router.get('/bpm/data', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
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

    res.json({ message: 'Welcome to BPM module data' });
  } catch (err) {
    console.error('BPM access error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;













// // routes/subscription.js

// const express = require('express');
// const router = express.Router();
// const pool = require('../db');
// const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');


// // sanity‐check log
// router.get('/', async (req, res) => {
//   console.log('▶▶ HIT /api/subscriptions');
//   try {
//     const { rows } = await pool.query('SELECT * FROM subscriptions');
//     return res.json(rows);
//   } catch (err) {
//     console.error('Subscriptions error:', err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Existing: subscribe to a module
// router.post('/subscribe', verifyToken, async (req, res) => {
//   const { moduleId } = req.body;
//   const userId = req.user.userId;

//   try {
//     const check = await pool.query(
//       'SELECT * FROM subscriptions WHERE user_id = $1 AND module_id = $2 AND status = $3',
//       [userId, moduleId, 'active']
//     );

//     if (check.rows.length > 0) {
//       return res.status(400).json({ message: 'Already subscribed.' });
//     }

//     const result = await pool.query(
//       `INSERT INTO subscriptions (user_id, module_id, start_date, status)
//        VALUES ($1, $2, CURRENT_DATE, $3) RETURNING *`,
//       [userId, moduleId, 'active']
//     );



// const subscriptionId = result.rows[0].id;

// await logAudit({
//   userId: req.user.id,
//   action: 'module_subscribe',
//   tableName: 'subscriptions',
//   recordId: subscriptionId,
//   details: { module_id }
// });



//     res.json({ subscription: result.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ✅ NEW: Get all active modules
// router.get('/modules', async (req, res) => {
//   try {
//     const result = await pool.query(
//       'SELECT id, name, description, status, created_at FROM modules WHERE status = $1',
//       ['active']
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ✅ NEW: Get current user's subscriptions
// router.get('/subscriptions', verifyToken, async (req, res) => {
//   const userId = req.user.userId;

//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         s.id AS subscription_id,
//         s.module_id,
//         m.name AS module_name,
//         m.description AS description,         -- ✅ Add this line to get the description
//         m.routeinfo AS route,         -- ✅ Add this line to get the description
//         s.start_date,
//         s.end_date,
//         s.status
//       FROM subscriptions s
//       JOIN modules m ON s.module_id = m.id
//       WHERE s.user_id = $1 AND s.status = $2
//       `,
//       [userId, 'active']
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// // GET all subscriptions - admin only


// router.get('/all-subscriptions', verifyToken, authorizeRole('admin'), async (req, res) => {
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         s.id AS subscription_id,
//         u.email,
//         m.name AS module_name,
//         s.start_date,
//         s.end_date,
//         s.status
//       FROM subscriptions s
//       JOIN users u ON s.user_id = u.id
//       JOIN modules m ON s.module_id = m.id
//       `
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// // ✅ NEW: get details for ONE module, only if subscribed
// router.get('/module/:id', verifyToken, async (req, res) => {
//   const userId = req.user.userId;
//   const moduleId = req.params.id;

//   const result = await pool.query(
//     'SELECT * FROM subscriptions WHERE user_id = $1 AND module_id = $2 AND status = $3',
//     [userId, moduleId, 'active']
//   );

//   if (result.rows.length === 0) {
//     return res.status(403).json({ message: 'Access denied. Not subscribed.' });
//   }

//   // Get module info
//   const moduleInfo = await pool.query(
//     'SELECT * FROM modules WHERE id = $1',
//     [moduleId]
//   );

//   res.json(moduleInfo.rows[0]);
// });



// // ✅ Protected BPM module data
// router.get('/bpm/data', verifyToken, async (req, res) => {
//   const userId = req.user.userId;

//   const check = await pool.query(
//     `
//     SELECT * FROM subscriptions
//     WHERE user_id = $1
//     AND status = 'active'
//     AND module_id = (
//       SELECT id FROM modules WHERE name = 'BPM'
//     )
//     `,
//     [userId]
//   );

//   if (check.rows.length === 0) {
//     return res.status(403).json({ message: 'Access denied. Not subscribed to BPM.' });
//   }

//   // ✅ Sample protected response
//   res.json({ message: 'Welcome to BPM module data' });
// });


// module.exports = router;
