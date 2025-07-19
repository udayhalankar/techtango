const pool = require('../db');

const checkSubscription = (moduleName) => {
  return async (req, res, next) => {
    const userId = req.user.userId;

    try {
      const result = await pool.query(
        `
        SELECT s.*
        FROM subscriptions s
        JOIN modules m ON s.module_id = m.id
        WHERE s.user_id = $1 AND m.name = $2 AND s.status = 'active'
        `,
        [userId, moduleName]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied. You are not subscribed to this module.' });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error while checking subscription' });
    }
  };
};

module.exports = checkSubscription;
