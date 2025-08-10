// agent/rules/audit.js
const cfg = require('./config');

module.exports = async function auditRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Determine scope: prefer cfg.scopes.audit if provided; otherwise default to server/routes|controllers
  const inScope = Array.isArray(cfg?.scopes?.audit)
    ? cfg.scopes.audit.some((rx) => rx.test(f))
    : /^server\/(routes|controllers)\//i.test(f);

  // If not in scope, skip this file
  if (!inScope) return null;

  // Consider it a "write" if the file defines mutating routes or contains SQL writes
  const writesDetected = /(router\.(post|put|patch|delete)\s*\(|\b(INSERT|UPDATE|DELETE)\b)/i.test(code);

  // If no writes, we're okay even without audit
  if (!writesDetected) {
    return { check: 'Audit Logging', status: 'pass', message: 'No writes detected.' };
  }

  // Accept any of these audit call patterns
  const hasAuditCall =
    /\blogAudit\s*\(/.test(code) ||
    /\bauditLogger\s*\(/.test(code) ||
    /\blogAuditEvent\s*\(/.test(code);

  if (hasAuditCall) {
    return { check: 'Audit Logging', status: 'pass' };
  }

  // Otherwise, warn and provide concrete actions for the dashboard
  return {
    check: 'Audit Logging',
    status: 'warn',
    message: 'Writes detected but no logAudit() call found.',
    actions: [
      {
        title: 'Add audit helper (server/middleware/audit.js)',
        snippet:
`const pool = require('../db');

async function logAudit(req, action, meta = {}) {
  try {
    const uid = req.user?.id || req.user?.userId || null;
    await pool.query(
      \`INSERT INTO audit_log (user_id, action, path, method, ip, meta, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())\`,
      [uid, action, req.originalUrl, req.method, req.ip, JSON.stringify(meta)]
    );
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

module.exports = { logAudit };`
      },
      {
        title: 'Call it after successful writes',
        snippet:
`// inside your POST/PUT/PATCH/DELETE handler, after COMMIT/success
await logAudit(req, 'ENTITY_CREATE', { id: newId });`
      },
      {
        title: 'Tip: wrap multi-write routes in a transaction',
        snippet:
`const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... your INSERT/UPDATE/DELETE calls
  await client.query('COMMIT');
  await logAudit(req, 'ENTITY_UPDATE', { id });
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}`
      }
    ]
  };
};
