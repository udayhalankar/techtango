// server/middleware/audit.js
const pool = require('../db');

// Usage: await logAudit(req, 'APPROVAL_CREATE', { approvalId });
async function logAudit(req, action, meta = {}) {
  try {
    const userId =
      req.user?.id ?? req.user?.userId ?? null; // support both shapes
    await pool.query(
      `INSERT INTO audit_log (user_id, action, path, method, ip, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        userId,
        action,
        req.originalUrl || null,
        req.method || null,
        req.ip || req.headers['x-forwarded-for'] || null,
        JSON.stringify(meta),
      ]
    );
  } catch (e) {
    console.error('Audit log error:', e);
    // do not throw—never break main flow due to audit
  }
}

module.exports = { logAudit };
