module.exports = async function checkAuth(code, filePath) {
  // Look for common auth middleware or guards
  const hits = ['verifyToken', 'authMiddleware', 'requireAuth'].some(k => code.includes(k));
  return hits
    ? { check: 'Authentication', status: 'pass' }
    : { check: 'Authentication', status: 'fail', message: 'Missing auth guard (verifyToken/authMiddleware)' };
};
