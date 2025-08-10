// server/middleware/checksubscription.js
const pool = require('../db');

/**
 * Enforces that the authenticated user has an ACTIVE subscription
 * to the given module (by module name from the `modules` table).
 *
 * Usage:
 *   const { checkSubscription } = require('./middleware/subscriptions');
 *   app.use('/api/enquiries', checkSubscription('Enquiries'), enquiriesRoute);
 */
function checkSubscription(moduleName) {
  return async (req, res, next) => {
    try {
      // must be authenticated first (verifyToken should run before this)
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      // Optional: admin bypass. Remove if you want admins checked too.
      if ((req.user.role || req.user.userRole) === 'admin') {
        return next();
      }

      // Case-insensitive match on module name; expects schema:
      // subscriptions(user_id, module_id, status)
      // modules(id, name)
      const { rows } = await pool.query(
        `
        SELECT 1
        FROM subscriptions s
        JOIN modules m ON m.id = s.module_id
        WHERE s.user_id = $1
          AND LOWER(m.name) = LOWER($2)
          AND (s.status = 'active' OR s.status = 'ACTIVE' OR s.status = 'Active')
        LIMIT 1
        `,
        [userId, moduleName]
      );

      if (!rows.length) {
        return res
          .status(403)
          .json({ error: `No active subscription for ${moduleName}` });
      }

      return next();
    } catch (err) {
      console.error('Subscription check error:', err);
      return res.status(500).json({ error: 'Subscription check failed' });
    }
  };
}

module.exports = { checkSubscription };



// const pool = require('../db');

// const checkSubscription = (moduleName) => {
//   return async (req, res, next) => {
//     const userId = req.user.userId;

//     try {
//       const result = await pool.query(
//         `
//         SELECT s.*
//         FROM subscriptions s
//         JOIN modules m ON s.module_id = m.id
//         WHERE s.user_id = $1 AND m.name = $2 AND s.status = 'active'
//         `,
//         [userId, moduleName]
//       );

//       if (result.rows.length === 0) {
//         return res.status(403).json({ message: 'Access denied. You are not subscribed to this module.' });
//       }

//       next();
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json({ message: 'Server error while checking subscription' });
//     }
//   };
// };

// module.exports = checkSubscription;
