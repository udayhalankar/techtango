// server/utils/auditLogger.js
const pool = require('../db');

const logAudit = async ({ userId, action, tableName = null, recordId = null, details = null }) => {
  if (!action) {
    console.warn('⚠️ Audit skipped: action missing');
    return;
  }

  await pool.query(
    `INSERT INTO audit_log (table_name, action, modified_by, record_id, details, modified_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [tableName, action, userId, recordId, details ? JSON.stringify(details) : null]
  );
};

module.exports = { logAudit };


// // utils/auditLogger.js
// const pool = require('../db');

// async function logAudit({ userId, action, tableName = null, recordId = null, details = null }) {
//   if (!action) {
//     console.warn('🚫 Audit log skipped: action is required');
//     return;
//   }

//   try {
//     await pool.query(
//       `INSERT INTO audit_log (table_name, action, modified_by, record_id, details)
//        VALUES ($1, $2, $3, $4, $5)`,
//       [
//         tableName,
//         action,
//         userId || null, // allow null for failed logins etc.
//         recordId || null,
//         details ? JSON.stringify(details) : null,
//       ]
//     );
//   } catch (err) {
//     console.warn('⚠️ Failed to log audit event:', err.message);
//   }
// }

// module.exports = logAudit;
