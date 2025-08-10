// agent/rules/rateLimit.js
const cfg = require('./config');

module.exports = async function rateLimitRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.rateLimit; otherwise only check server/server.js
  const inScope = Array.isArray(cfg?.scopes?.rateLimit)
    ? cfg.scopes.rateLimit.some((rx) => rx.test(f))
    : /server\/server\.js$/i.test(f);

  if (!inScope) return null;

  // Detect import/require of express-rate-limit or express-slow-down
  const hasLimiterImport =
    /require\(['"`]express-rate-limit['"`]\)/.test(code) ||
    /from\s+['"`]express-rate-limit['"`]/.test(code) ||
    /require\(['"`]express-slow-down['"`]\)/.test(code) ||
    /from\s+['"`]express-slow-down['"`]/.test(code);

  // Detect creation/usage
  const usesRateLimitFn =
    /\brateLimit\s*\(/.test(code) || // express-rate-limit
    /\bslowDown\s*\(/.test(code);    // express-slow-down

  // Detect mounting of a limiter middleware (apiLimiter, limiter, rateLimiter, etc.)
  const mountsLimiter =
    /app\.use\(\s*['"`]\/api['"`]\s*,\s*[A-Za-z_$][\w$]*\s*\)/.test(code) ||
    /app\.use\(\s*[A-Za-z_$][\w$]*\s*\)/.test(code); // looser fallback

  const hasRateLimiting = (hasLimiterImport && (usesRateLimitFn || mountsLimiter)) || usesRateLimitFn;

  if (hasRateLimiting) {
    return { check: 'Rate Limiting', status: 'pass' };
  }

  // No limiter detected → warn with concrete actions
  return {
    check: 'Rate Limiting',
    status: 'warn',
    message: 'No API rate limiting detected in server.js.',
    actions: [
      {
        title: 'Add an API rate limiter (express-rate-limit)',
        snippet:
`// server/server.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 1000,                  // adjust per your traffic
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all /api routes
app.use('/api', apiLimiter);`
      },
      {
        title: 'Optionally layer slow down (express-slow-down)',
        snippet:
`// server/server.js
const slowDown = require('express-slow-down');

const apiSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 300,        // allow 300 requests per 15 minutes, then...
  delayMs: 250            // add 250ms delay per request above limit
});

app.use('/api', apiSpeedLimiter);`
      },
      {
        title: 'Per-route limiter example',
        snippet:
`// server/routes/someRouter.js
const rateLimit = require('express-rate-limit');
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

router.post('/create', createLimiter, async (req, res) => {
  // handler
});`
      }
    ]
  };
};
