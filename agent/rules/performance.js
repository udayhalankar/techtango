// agent/rules/performance.js
module.exports = async function performance(code, filePath) {
  if (!filePath.includes('server')) return null;

  const hasCompression = code.includes("require('compression')") || code.includes('app.use(compression(');
  const hasRespTime   = code.includes("require('response-time')") || code.includes('app.use(responseTime(');
  const setsCache     = /res\.set\(\s*['"`]Cache-Control['"`]/.test(code) || code.includes('etag: true') || code.includes('app.set("etag",');
  const perfLogs      = code.includes('performance.now(') || /Date\.now\(\).*-\s*start/.test(code) || code.includes('responseTime');

  if (hasCompression || hasRespTime || setsCache || perfLogs) {
    return { check: 'Performance', status: 'pass' };
  }
  return {
    check: 'Performance',
    status: 'warn',
    message: 'No perf middlewares/headers detected. Consider compression(), response-time, Cache-Control/ETag, or timing logs.'
  };
};
