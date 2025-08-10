// server/middleware/validation.js (example with joi or zod)
const Joi = require('joi');
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ error: 'Validation failed', details: error.details });
    req.body = value;
    next();
  };
}
module.exports = { validate };

// server/middleware/audit.js
const pool = require('../db');
async function logAudit(req, action, extra = {}) {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    await pool.query(
      `INSERT INTO audit_log (user_id, action, path, method, ip, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [userId, action, req.originalUrl, req.method, req.ip, JSON.stringify(extra)]
    );
  } catch (e) {
    console.error('Audit log error:', e);
  }
}
module.exports = { logAudit };
