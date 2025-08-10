// server/middleware/withTx.js
const pool = require('../db');
async function withTx(handler) {
  return async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await handler(req, res, client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };
}
module.exports = { withTx };
