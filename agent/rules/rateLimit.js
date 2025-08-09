module.exports = async function checkRateLimit(code, filePath) {
  const hits = ['express-rate-limit', 'rateLimit', 'slowDown'].some(k => code.includes(k));
  return hits
    ? { check: 'Rate Limiting', status: 'pass' }
    : { check: 'Rate Limiting', status: 'warn', message: 'No rate limiting detected' };
};
