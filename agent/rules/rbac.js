// agent/rules/rbac.js
module.exports = async function rbac(code, filePath) {
  if (!filePath.includes('server')) return null;

  // Ignore obvious public endpoints
  const isPublicish = /\/login|\/register|\/auth|\/activate/i.test(code);
  if (isPublicish) return { check: 'RBAC', status: 'pass' };

  const hasRBAC =
    code.includes('checkRole(') ||
    code.includes('requireRole(') ||
    code.includes('checkPermissions(') ||
    code.includes('hasRole(') ||
    code.includes('requirePermission(');

  if (hasRBAC) {
    return { check: 'RBAC', status: 'pass' };
  }
  // If we see route definitions and auth but no RBAC, nudge
  const looksLikeRoute = /router\.(get|post|put|patch|delete)\(/.test(code) || code.includes('app.use(');
  const hasAuth = code.includes('verifyToken') || code.includes('requireAuth') || code.includes('authMiddleware');
  if (looksLikeRoute && hasAuth) {
    return { check: 'RBAC', status: 'warn', message: 'No role/permission guard found. Add checkRole()/checkPermissions().' };
  }
  return { check: 'RBAC', status: 'pass' };
};
