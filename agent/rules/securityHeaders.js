// agent/rules/securityHeaders.js
module.exports = async function securityHeaders(code, filePath) {
  if (!filePath.includes('server')) return null; // server-only rule
  const hasHelmet = code.includes('helmet(') || code.includes("require('helmet')") || code.includes('app.use(helmet(');
  if (hasHelmet) {
    return { check: 'Security Headers (Helmet)', status: 'pass' };
  }
  return {
    check: 'Security Headers (Helmet)',
    status: 'warn',
    message: 'helmet() not detected. Add: const helmet = require("helmet"); app.use(helmet());'
  };
};
