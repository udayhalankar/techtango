module.exports = async function checkAudit(code, filePath) {
  const hits = ['logAudit', 'auditLogger', 'logAuditEvent'].some(k => code.includes(k));
  return hits
    ? { check: 'Audit Logging', status: 'pass' }
    : { check: 'Audit Logging', status: 'warn', message: 'Audit not found (logAudit)' };
};
