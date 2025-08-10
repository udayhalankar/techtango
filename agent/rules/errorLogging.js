// agent/rules/errorLogging.js
const cfg = require('./config');

module.exports = async function errorLoggingRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.errorLogging if provided; otherwise only check server/server.js
  const inScope = Array.isArray(cfg?.scopes?.errorLogging)
    ? cfg.scopes.errorLogging.some((rx) => rx.test(f))
    : /server\/server\.js$/i.test(f);

  if (!inScope) return null;

  // Detect a centralized Express error handler (must have 4 args)
  const hasCentralHandler =
    /app\.use\(\s*\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)\s*=>/m.test(code) ||
    /app\.use\(\s*function\s*\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)/m.test(code);

  // Detect some form of logger usage (winston/pino/custom)
  const usesLogger =
    /\blogger\.error\b/.test(code) ||
    /\bwinston\b/.test(code) ||
    /\bpino\b/.test(code);

  if (hasCentralHandler) {
    // If there is a handler, consider it pass (logger is recommended but optional)
    return { check: 'Error Logging', status: 'pass' };
  }

  // No centralized handler → warn and provide actions
  return {
    check: 'Error Logging',
    status: 'warn',
    message: 'No centralized error handler detected in server.js.',
    actions: [
      {
        title: 'Add a centralized error handler (place AFTER all routes)',
        snippet:
`// server/server.js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});`
      },
      {
        title: 'Optional: send errors to Winston (recommended for prod)',
        snippet:
`// server/logger.js
const { createLogger, transports, format } = require('winston');
const logger = createLogger({
  level: 'error',
  format: format.combine(format.timestamp(), format.json()),
  transports: [ new transports.Console() ],
});
module.exports = logger;

// server/server.js
const logger = require('./logger');
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id || req.user?.userId || null
  });
  res.status(500).json({ error: 'Internal server error' });
});`
      },
      {
        title: 'Harden process-level error reporting',
        snippet:
`// server/server.js (top-level once)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});`
      }
    ]
  };
};
