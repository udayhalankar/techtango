// agent/rules/corsSafety.js
const cfg = require('./config');

module.exports = async function corsSafetyRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.cors if provided; otherwise only check server/server.js
  const inScope = Array.isArray(cfg?.scopes?.cors)
    ? cfg.scopes.cors.some((rx) => rx.test(f))
    : /server\/server\.js$/i.test(f);

  if (!inScope) return null;

  // Detect any cors usage
  const usesCors =
    /require\(['"`]cors['"`]\)/.test(code) ||
    /app\.use\(\s*cors\(/.test(code);

  // If no CORS at all → warn with actions
  if (!usesCors) {
    return {
      check: 'CORS Safety',
      status: 'warn',
      message: 'CORS not configured. Prefer a strict allowlist.',
      actions: [
        {
          title: 'Install & import CORS',
          snippet: `// server/server.js
const cors = require('cors');`
        },
        {
          title: 'Enable allowlist + credentials',
          snippet: `// server/server.js
const ALLOW_ORIGINS = ['http://localhost:3000']; // add more as needed
app.use(cors({ origin: ALLOW_ORIGINS, credentials: true }));`
        }
      ]
    };
  }

  // Open/wildcard patterns (bad):
  // - app.use(cors()) with no options
  // - origin: '*'
  const wildcard =
    /app\.use\(\s*cors\(\s*\)\s*\)/.test(code) ||
    /origin\s*:\s*['"`]\*['"`]/.test(code);

  if (wildcard) {
    return {
      check: 'CORS Safety',
      status: 'fail',
      message: 'CORS is wide open. Use an allowlist and enable credentials if needed.',
      actions: [
        {
          title: 'Replace wildcard with allowlist',
          snippet: `// server/server.js
const ALLOW_ORIGINS = ['http://localhost:3000']; // add approved origins
app.use(cors({ origin: ALLOW_ORIGINS, credentials: true }));`
        },
        {
          title: 'Optional: derive allowlist from ENV',
          snippet: `// server/server.js
const ALLOW_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());
app.use(cors({ origin: ALLOW_ORIGINS, credentials: true }));`
        }
      ]
    };
  }

  // Strict/allowlist pattern (good):
  const allowlistWithCreds =
    /cors\(\s*\{\s*origin\s*:\s*\[[\s\S]*?\]\s*,\s*credentials\s*:\s*true\s*\}\s*\)/m.test(code);

  if (allowlistWithCreds) {
    return { check: 'CORS Safety', status: 'pass' };
  }

  // If cors is present but we didn't detect the safe pattern, nudge to use allowlist+credentials
  return {
    check: 'CORS Safety',
    status: 'warn',
    message: 'CORS present but not clearly restricted. Prefer allowlist + credentials.',
    actions: [
      {
        title: 'Harden CORS',
        snippet: `// server/server.js
const ALLOW_ORIGINS = ['http://localhost:3000']; // approved origins only
app.use(cors({ origin: ALLOW_ORIGINS, credentials: true }));`
      }
    ]
  };
};
