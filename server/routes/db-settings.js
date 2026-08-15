//SERVER/ROUTES/db-setting,js

const express = require('express');
const router = express.Router();
router.use(express.json()); // ensures body parsing even if app order slips

const { effectiveConfig, testConnection, applyRaw, loadRaw } = require('../config/dbManager');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware'); // ✅ destructure

// GET current (safe) settings
router.get('/', verifyToken, /*authorizeRole('admin'),*/ (req, res) => {
  const cfg = effectiveConfig();
  res.json({
    DB_HOST: cfg.host,
    DB_PORT: cfg.port,
    DB_NAME: cfg.database,
    DB_USER: cfg.user,
    DB_SSL: !!cfg.ssl,
    // never return password
  });
});

// POST test settings (no save)
// router.post('/test', verifyToken, /*authorizeRole('admin'),*/ async (req, res) => {
//   const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL } = req.body || {};

router.post('/test', verifyToken, /*authorizeRole('admin'),*/ async (req, res) => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL } = req.body || {};
  // [CHANGE START: fall back to saved password if blank/omitted]
  const current = loadRaw(); // requires loadRaw imported from dbManager (already in your file)
  const savedPwd = current.DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const pwd = (DB_PASSWORD === undefined || DB_PASSWORD === null || DB_PASSWORD === '')
    ? String(savedPwd)
    : String(DB_PASSWORD);
  // [CHANGE END]
  
  // 🔎 ADD THESE LINES — right here - START
  const pwdType = typeof DB_PASSWORD;
  console.log('[db-settings/test] body types:',
    { DB_HOST: typeof DB_HOST, DB_PORT: typeof DB_PORT, DB_NAME: typeof DB_NAME, DB_USER: typeof DB_USER, DB_PASSWORD: pwdType, DB_SSL: typeof DB_SSL }
  );
  console.log('[db-settings/test] password preview:',
    pwdType === 'string' ? `len=${DB_PASSWORD.length}` : DB_PASSWORD
  );
  // 🔎 ADD THESE LINES — right here - END

  //const pwd = (DB_PASSWORD === undefined || DB_PASSWORD === null) ? '' : String(DB_PASSWORD);
  const cfg = {
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    //password: DB_PASSWORD,
    password: pwd,
    ssl: DB_SSL ? { rejectUnauthorized: false } : false,
    max: 2,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  };
  try {
    await testConnection(cfg);
    res.json({ ok: true, message: 'Connection OK' });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

// POST save & apply (hot-swap pool)
router.post('/', verifyToken, /*authorizeRole('admin'),*/ async (req, res) => {
  try {
    const raw = req.body || {};
    ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'].forEach(k => {
      if (!raw[k]) throw new Error(`Missing ${k}`);
    });

    // ✅ Keep existing password if left blank
    const current = loadRaw(); // may be {}
    const toSave = { ...current, ...raw };
    if (!raw.DB_PASSWORD && current.DB_PASSWORD) {
      toSave.DB_PASSWORD = current.DB_PASSWORD;
    }

    await applyRaw(toSave);
    res.json({ ok: true, message: 'Saved & applied. New queries use the updated DB.' });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

module.exports = router;
