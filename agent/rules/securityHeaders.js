// agent/rules/securityHeaders.js
const cfg = require('./config');

module.exports = async function securityHeadersRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.securityHeaders; otherwise only check server/server.js
  const inScope = Array.isArray(cfg?.scopes?.securityHeaders)
    ? cfg.scopes.securityHeaders.some((rx) => rx.test(f))
    : /server\/server\.js$/i.test(f);

  if (!inScope) return null;

  // Detect helmet usage (import + app.use(helmet()))
  const hasHelmetImport =
    /require\(['"`]helmet['"`]\)/.test(code) || /from\s+['"`]helmet['"`]/.test(code);
  const hasHelmetUse = /app\.use\(\s*helmet\(\s*\)\s*\)/.test(code);

  if (hasHelmetImport && hasHelmetUse) {
    return { check: 'Security Headers (Helmet)', status: 'pass' };
  }

  // If only partial detection (import or use), still prompt to finish setup
  if (hasHelmetImport || hasHelmetUse) {
    return {
      check: 'Security Headers (Helmet)',
      status: 'warn',
      message: 'Helmet detected partially. Ensure both import and app.use(helmet()) are present.',
      actions: [
        {
          title: 'Ensure import and mount',
          snippet:
`// server/server.js
const helmet = require('helmet');
app.use(helmet());`
        }
      ]
    };
  }

  // No helmet detected → warn with actions
  return {
    check: 'Security Headers (Helmet)',
    status: 'warn',
    message: 'helmet() not detected. Add Helmet to set secure HTTP headers.',
    actions: [
      {
        title: 'Install & enable Helmet',
        snippet:
`// server/server.js
const helmet = require('helmet');
app.use(helmet());`
      },
      {
        title: 'Optional: tighten CSP (example)',
        snippet:
`// server/server.js
const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "img-src": ["'self'", "data:", "https:"],
  },
}));`
      }
    ]
  };
};
