const express = require('express');
const router = express.Router();
//const { effectiveConfig, getPool } = require('../config/dbManager');

router.get('/diag', async (_req, res) => {
  try {
    const cfg = effectiveConfig();
    const pool = getPool();
    const { rows } = await pool.query('select current_user, current_database()');
    res.json({
      ok: true,
      cfg: {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
        ssl: !!cfg.ssl,
        hasPassword: typeof cfg.password === 'string'
      },
      whoami: rows[0]
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
