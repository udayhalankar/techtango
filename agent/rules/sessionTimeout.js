// agent/rules/sessionTimeout.js
module.exports = async function sessionTimeout(code, filePath) {
  if (!filePath.includes('server')) return null;

  const patterns = [
    'x-last-activity', 'X-Last-Activity', 'lastActivity',
    'idleTimeout', 'inactivity', 'expiresIn'
  ];
  const hasAny = patterns.some(p => code.includes(p));
  const touchesVerifyToken = code.includes('verifyToken') || code.includes('authMiddleware');

  if (touchesVerifyToken && !hasAny) {
    return {
      check: 'Session Timeout',
      status: 'warn',
      message: 'Auth middleware found but no idle/expiry handling (x-last-activity / expiresIn).'
    };
  }
  return { check: 'Session Timeout', status: 'pass' };
};
