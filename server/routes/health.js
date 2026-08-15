// routes/health.js
const router = require('express').Router();
const pool = require('../db'); // per your project convention

const startedAt = new Date();

/** Lightweight liveness probe — no DB calls */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'techtango-saas',
    env: process.env.NODE_ENV || 'development',
    uptime_sec: process.uptime(),
    started_at: startedAt.toISOString(),
    now: new Date().toISOString(),
  });
});

/** Simple ping */
router.get('/ping', (req, res) => {
  res.send('pong');
});

/** Readiness: quick DB check with small timeout */
router.get('/ready', async (req, res) => {
  try {
    // Abort if DB is slow/hung
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('DB readiness timeout')), 1500)
    );
    const probe = pool.query('SELECT 1 AS ok');
    await Promise.race([probe, timeout]);
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

/** Deep DB probe: version, current_database, now() */
router.get('/db', async (req, res) => {
  try {
    const [{ rows: vrows }, { rows: irows }] = await Promise.all([
      pool.query('SELECT version(), now()'),
      pool.query(`
        SELECT current_database() AS db, current_user AS "user"
      `),
    ]);

    // Optional: check a key table exists (skip if you don’t want schema checks)
    let schema = { table_checks: [] };
    try {
      const checks = await pool.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('form_templates','workflows','enquiries')
        ORDER BY table_name
      `);
      schema.table_checks = checks.rows;
    } catch {
      // ignore schema errors for portability
    }

    res.json({
      status: 'ok',
      version: vrows[0].version,
      now: vrows[0].now,
      db: irows[0].db,
      user: irows[0].user,
      ...schema,
    });
  } catch (err) {
    res.status(500).json({ status: 'db_error', error: err.message });
  }
});

module.exports = router;
