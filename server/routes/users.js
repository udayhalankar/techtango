const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require("../middleware/authMiddleware");

// GET all users (dev/debug only)
router.get('/', async (req, res) => {
  try {
    const allUsers = await pool.query('SELECT * FROM users');
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET users from the same organization
router.get("/org", verifyToken, async (req, res) => {
  const includeSelf = req.query.includeSelf === "true";
  const userId = req.user.userId;

  try {
    const query = includeSelf
      ? `
        SELECT id, firstname, lastname
        FROM users
        WHERE tenant_id = (
          SELECT tenant_id FROM users WHERE id = $1
        )
      `
      : `
        SELECT id, firstname, lastname
        FROM users
        WHERE tenant_id = (
          SELECT tenant_id FROM users WHERE id = $1
        ) AND id != $1
      `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to get org users", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;



// const express = require('express');
// const router = express.Router();
// const pool = require('../db');
// const { verifyToken } = require("../middleware/authMiddleware");

// // GET all users
// router.get('/', async (req, res) => {
//   try {
//     const allUsers = await pool.query('SELECT * FROM users');
//     res.json(allUsers.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// router.get("/org", verifyToken, async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT id, firstname, lastname FROM users WHERE organization_id = (
//         SELECT organization_id FROM users WHERE id = $1
//       ) AND id != $1`,
//       [req.user.userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Failed to get org users", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// module.exports = router;
