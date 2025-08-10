// agent/rules/auth.js
const cfg = require('./config');

module.exports = async function authRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');
  const isServer = /server\/server\.js$/i.test(f);

  // Determine scope:
  // - Always evaluate server.js (we want to catch a global gate there)
  // - For other files, only run if they match the auth scope or default to routes/controllers
  const inScope =
    isServer ||
    (Array.isArray(cfg?.scopes?.auth)
      ? cfg.scopes.auth.some((rx) => rx.test(f))
      : /^server\/(routes|controllers)\//i.test(f));

  if (!inScope) return null;

  // Common guard names you might use
  const GUARDS = '(verifyToken|authMiddleware|requireAuth)';

  // --- Global gate patterns (server.js) ---
  // app.use('/api', verifyToken)
  // app.use('/api', someGuard)
  // Optionally allow simple exception blocks (auth/templates)
  const hasGlobalDirect =
    /app\.use\(\s*['"`]\/api['"`]\s*,\s*verifyToken\s*\)/.test(code);

  const hasGlobalGeneric =
    new RegExp(`app\\.use\\(\\s*['"\`]\\/api['"\`]\\s*,\\s*${GUARDS}\\s*\\)`).test(code);

  // Pattern for a "wrapper" global gate:
  // app.use('/api', (req,res,next)=>{ if (req.path.startsWith('/auth')) return next(); return verifyToken(req,res,next); })
  const hasGlobalWrapper =
    new RegExp(`app\\.use\\(\\s*['"\`]\\/api['"\`]\\s*,\\s*\\(\\s*req\\s*,\\s*res\\s*,\\s*next\\s*\\)\\s*=>[\\s\\S]*?${GUARDS}\\s*\\(`).test(code);

  const hasGlobal = hasGlobalDirect || hasGlobalGeneric || hasGlobalWrapper;

  // --- Per-router patterns (routes/controllers) ---
  // router.use(verifyToken)
  const hasRouterUse =
    new RegExp(`router\\.use\\(\\s*${GUARDS}\\s*\\)`).test(code);

  // router.get('/x', verifyToken, handler)  OR post/put/patch/delete
  const hasInlineGuard =
    new RegExp(`router\\.(get|post|put|patch|delete)\\s*\\([\\s\\S]*?${GUARDS}`).test(code);

  const hasLocal = hasRouterUse || hasInlineGuard;

  // Decide pass/fail:
  if (isServer && hasGlobal) {
    return { check: 'Authentication', status: 'pass' };
  }
  if (!isServer && hasLocal) {
    return { check: 'Authentication', status: 'pass' };
  }

  // If server.js lacks a global gate and the route/controller lacks a local guard → fail with actions.
  return {
    check: 'Authentication',
    status: 'fail',
    message: isServer
      ? 'Global API auth gate not found in server.js.'
      : 'Missing auth guard (verifyToken/authMiddleware) in this router.',
    actions: isServer
      ? [
          {
            title: 'Add a global auth gate (keep public exceptions first)',
            snippet:
`// server/server.js
const { verifyToken } = require('./middleware/authMiddleware');

app.use('/api', (req, res, next) => {
  // Public exceptions (adjust as needed)
  if (req.path.startsWith('/auth') || req.path.startsWith('/templates') || req.path.startsWith('/template')) {
    return next();
  }
  return verifyToken(req, res, next);
});`
          },
          {
            title: 'Simple global mount (no wrapper)',
            snippet:
`// server/server.js
const { verifyToken } = require('./middleware/authMiddleware');
app.use('/api', verifyToken); // Ensure true public routes are mounted BEFORE this line`
          }
        ]
      : [
          {
            title: 'Guard the whole router',
            snippet:
`// routes/someRouter.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken); // applies to all routes in this router

// router.get('/items', handler)
// router.post('/items', handler)

module.exports = router;`
          },
          {
            title: 'Or guard a single route inline',
            snippet:
`// routes/someRouter.js
router.post('/items', verifyToken, async (req, res) => {
  // handler
});`
          }
        ]
  };
};
