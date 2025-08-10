// agent/rules/performance.js
const cfg = require('./config');

module.exports = async function performanceRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.performance; otherwise only check server/server.js
  const inScope = Array.isArray(cfg?.scopes?.performance)
    ? cfg.scopes.performance.some((rx) => rx.test(f))
    : /server\/server\.js$/i.test(f);

  if (!inScope) return null;

  // Detections
  const hasCompressionImport =
    /require\(['"`]compression['"`]\)/.test(code) || /from\s+['"`]compression['"`]/.test(code);
  const hasCompressionUse = /app\.use\(\s*compression\(\s*\)\s*\)/.test(code);

  const hasRespTimeImport =
    /require\(['"`]response-time['"`]\)/.test(code) || /from\s+['"`]response-time['"`]/.test(code);
  const hasRespTimeUse = /app\.use\(\s*responseTime\(\s*\)\s*\)/.test(code);

  const setsCacheHeader = /res\.set\(\s*['"`]Cache-Control['"`]\s*,/i.test(code);
  const setsETag =
    /app\.set\(\s*['"`]etag['"`]\s*,\s*(true|['"`](weak|strong)['"`])\s*\)/i.test(code) ||
    /etag:\s*(true|['"`](weak|strong)['"`])/i.test(code);

  const usesPerfLogging =
    /\bperformance\.now\(\)/.test(code) ||
    /Date\.now\(\)\s*-\s*start/.test(code) ||
    /\bresponseTime\(/.test(code);

  const hasPerf =
    (hasCompressionImport && hasCompressionUse) ||
    (hasRespTimeImport && hasRespTimeUse) ||
    setsCacheHeader ||
    setsETag ||
    usesPerfLogging;

  if (hasPerf) {
    return { check: 'Performance', status: 'pass' };
  }

  // Otherwise -> warn with concrete actions
  return {
    check: 'Performance',
    status: 'warn',
    message:
      'No performance middleware/headers detected. Consider compression(), response-time, Cache-Control/ETag, or basic timing logs.',
    actions: [
      {
        title: 'Enable compression + response-time',
        snippet:
`// server/server.js
const compression = require('compression');
const responseTime = require('response-time');

app.use(compression());
app.use(responseTime());`
      },
      {
        title: 'Serve with ETag and basic cache headers',
        snippet:
`// server/server.js
app.set('etag', 'strong'); // or true
app.use((req, res, next) => {
  // Tune per route/static assets; example for general API responses:
  res.set('Cache-Control', 'no-store'); // or 'public, max-age=60' for cacheable endpoints
  next();
});`
      },
      {
        title: 'Add lightweight timing logs (optional)',
        snippet:
`// server/server.js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(\`\${req.method} \${req.originalUrl} -> \${res.statusCode} (\${ms}ms)\`);
  });
  next();
});`
      }
    ]
  };
};
