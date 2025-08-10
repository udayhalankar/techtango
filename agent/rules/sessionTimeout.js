// agent/rules/sessionTimeout.js
const cfg = require('./config');

module.exports = async function sessionTimeoutRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // ------- Scope rules -------
  // If you configured scopes, honor them; otherwise check:
  // - server auth area (middleware/routes/controllers/server.js)
  // - client app shell (src/App or top-level pages)
  const inScope =
    (Array.isArray(cfg?.scopes?.sessionTimeout) &&
      cfg.scopes.sessionTimeout.some((rx) => rx.test(f))) ||
    /^server\/(middleware|routes|controllers)\//i.test(f) ||
    /server\/server\.js$/i.test(f) ||
    /^client\/src\/(App|pages|components)\//i.test(f) ||
    /^client\/src\/.*\.(jsx?|tsx?)$/i.test(f);

  if (!inScope) return null;

  // ------- Heuristics -------
  const isServer = /^(server\/|server\/server\.js$)/i.test(f);
  const isClient = /^client\/src\//i.test(f);

  // Common keywords
  const touchesAuth =
    /\bverifyToken\b/.test(code) ||
    /\bauthMiddleware\b/.test(code) ||
    /\brequireAuth\b/.test(code);

  // Frontend inactivity patterns
  const FE_hasLastActivity = /\blastActivity\b/.test(code);
  const FE_updatesActivity =
    /addEventListener\(['"`](mousemove|keydown|click)['"`]/.test(code) ||
    /document\.addEventListener\(/.test(code) ||
    /window\.addEventListener\(/.test(code);
  const FE_timerCheck =
    /setInterval\(/.test(code) || /setTimeout\(/.test(code);
  const FE_navigateLogout =
    /navigate\(\s*['"`]\/login['"`]\s*\)/.test(code) ||
    /window\.location\s*=\s*['"`]\/login['"`]/.test(code) ||
    /localStorage\.removeItem\(['"`]token['"`]\)/.test(code);

  // Backend expiry/idle patterns
  const BE_checksIdleHeader =
    /\b[Xx]-Last-Activity\b/.test(code) || /\blastActivity\b/.test(code);
  const BE_enforcesIdle =
    /\bexpiresIn\b/.test(code) || /\bmaxAge\b/.test(code) || /\bidleTimeout\b/.test(code) ||
    /Date\.now\(\)\s*-\s*last/i.test(code);
  const BE_jwtExpiry =
    /\bjwt\.sign\(/i.test(code) && /\bexpiresIn\b/i.test(code);

  // ------- Decision tree -------
  if (isClient) {
    // Client passes if it updates lastActivity, checks it on an interval, and logs out/navigates.
    if (FE_hasLastActivity && FE_updatesActivity && FE_timerCheck && FE_navigateLogout) {
      return { check: 'Session Timeout', status: 'pass' };
    }
    // Otherwise warn with how to add it
    return {
      check: 'Session Timeout',
      status: 'warn',
      message: 'Frontend inactivity logout not fully configured.',
      actions: [
        {
          title: 'Track activity & auto-logout (React)',
          snippet:
`// src/App.jsx (inside a useEffect)
useEffect(() => {
  const update = () => localStorage.setItem('lastActivity', String(Date.now()));
  const check = setInterval(() => {
    const last = Number(localStorage.getItem('lastActivity') || 0);
    if (Date.now() - last > 15 * 60 * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('lastActivity');
      navigate('/login');
    }
  }, 60 * 1000);

  window.addEventListener('mousemove', update);
  window.addEventListener('keydown', update);
  window.addEventListener('click', update);
  update();

  return () => {
    clearInterval(check);
    window.removeEventListener('mousemove', update);
    window.removeEventListener('keydown', update);
    window.removeEventListener('click', update);
  };
}, [navigate]);`
        },
        {
          title: 'Send last activity header with requests (optional)',
          snippet:
`// axios instance / fetch wrapper
instance.interceptors.request.use((config) => {
  const last = localStorage.getItem('lastActivity');
  if (last) config.headers['X-Last-Activity'] = last;
  return config;
});`
        }
      ]
    };
  }

  if (isServer && touchesAuth) {
    // Server passes if either JWT expiry or explicit idle enforcement is visible.
    if (BE_jwtExpiry || (BE_checksIdleHeader && BE_enforcesIdle)) {
      return { check: 'Session Timeout', status: 'pass' };
    }
    // Otherwise warn with concrete actions
    return {
      check: 'Session Timeout',
      status: 'warn',
      message: 'Auth middleware found but no clear idle/expiry handling.',
      actions: [
        {
          title: 'Add JWT expiry when issuing tokens',
          snippet:
`// server/middleware/auth.js (token issue)
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });`
        },
        {
          title: 'Enforce idle timeout in verifyToken',
          snippet:
`// server/middleware/authMiddleware.js
function verifyToken(req, res, next) {
  // ... your existing JWT verification first
  const hdr = req.get('X-Last-Activity');
  const last = Number(hdr || 0);
  const MAX_IDLE_MS = 15 * 60 * 1000;

  if (!Number.isNaN(last) && last > 0) {
    if (Date.now() - last > MAX_IDLE_MS) {
      return res.status(401).json({ error: 'Session expired (idle timeout)' });
    }
  }
  return next();
}
module.exports = { verifyToken };`
        },
        {
          title: 'Cookie/session alternative (if using sessions)',
          snippet:
`// when creating session cookie
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 15 * 60 * 1000 }, // 15 minutes idle
  rolling: true, // refresh expiry on activity
  resave: false,
  saveUninitialized: false,
}));`
        }
      ]
    };
  }

  // If it’s not clearly client or server auth file, keep noise low.
  return { check: 'Session Timeout', status: 'pass', message: 'Out of session scope.' };
};
