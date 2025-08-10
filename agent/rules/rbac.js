// agent/rules/rbac.js
const cfg = require('./config');

module.exports = async function rbacRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');
  const isServer = /server\/server\.js$/i.test(f);

  // Scope:
  // - Always evaluate server.js (in case you mount RBAC at app.use)
  // - Otherwise, prefer cfg.scopes.rbac; fallback to routes/controllers
  const inScope =
    isServer ||
    (Array.isArray(cfg?.scopes?.rbac)
      ? cfg.scopes.rbac.some((rx) => rx.test(f))
      : /^server\/(routes|controllers)\//i.test(f));

  if (!inScope) return null;

  // Ignore obvious public endpoints (auth/activation etc.) so they don't warn
  const looksPublic =
    /\/auth\b|\/login\b|\/register\b|\/activate\b|\/forgot(-|)password\b/i.test(code);
  if (!isServer && looksPublic) {
    return { check: 'RBAC', status: 'pass', message: 'Public/auth endpoints are exempt.' };
  }

  // RBAC guard names we accept
  const RBAC_GUARDS = '(checkRole|requireRole|hasRole|checkPermissions|requirePermission|enforceRBAC)';
  const hasRBACGuard =
    new RegExp(`\\b${RBAC_GUARDS}\\s*\\(`).test(code);

  // Route detection (for routers) and global mounts (for server.js)
  const hasRoutes =
    /router\.(get|post|put|patch|delete)\s*\(/i.test(code) ||
    /app\.use\(\s*['"`]\/api/i.test(code);

  // Authentication presence (so we only nudge when auth exists)
  const hasAuth =
    /\bverifyToken\b/.test(code) ||
    /\bauthMiddleware\b/.test(code) ||
    /\brequireAuth\b/.test(code);

  // Server-level RBAC mount example: app.use('/api/admin', checkRole('admin'), adminRouter)
  const hasServerRBACMount = isServer
    ? new RegExp(`app\\.use\\(\\s*['"\`]\\/api[^)]*${RBAC_GUARDS}\\s*\\(`).test(code)
    : false;

  if (hasRBACGuard || hasServerRBACMount) {
    return { check: 'RBAC', status: 'pass' };
  }

  // If we see routes + auth but no RBAC -> warn with actions
  if (hasRoutes && hasAuth) {
    return {
      check: 'RBAC',
      status: 'warn',
      message: 'Authenticated routes found without role/permission guard.',
      actions: [
        {
          title: 'Add a simple role guard middleware',
          snippet:
`// server/middleware/rbac.js
function checkRole(requiredRole) {
  return (req, res, next) => {
    const roles = req.user?.roles || []; // e.g. ['user','admin']
    if (!Array.isArray(roles) || !roles.includes(requiredRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

function checkPermissions(...perms) {
  return (req, res, next) => {
    const userPerms = new Set(req.user?.permissions || []);
    const ok = perms.every(p => userPerms.has(p));
    if (!ok) return res.status(403).json({ error: 'Forbidden: missing permission' });
    next();
  };
}

module.exports = { checkRole, checkPermissions };`
        },
        {
          title: 'Guard a whole router by role',
          snippet:
`// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { checkRole } = require('../middleware/rbac');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(checkRole('admin')); // everything below requires admin role

router.get('/dashboard', async (req, res) => res.json({ ok: true }));
module.exports = router;`
        },
        {
          title: 'Or guard individual routes by permission',
          snippet:
`// server/routes/someRouter.js
const { verifyToken } = require('../middleware/authMiddleware');
const { checkPermissions } = require('../middleware/rbac');

router.post('/items', verifyToken, checkPermissions('items:create'), async (req, res) => {
  // handler...
  res.json({ success: true });
});`
        },
        {
          title: 'Mount RBAC at server level',
          snippet:
`// server/server.js
const { checkRole } = require('./middleware/rbac');
const adminRouter = require('./routes/admin');

app.use('/api/admin', checkRole('admin'), adminRouter);`
        }
      ]
    };
  }

  // Otherwise, neutral pass to avoid noise (e.g., utility files)
  return { check: 'RBAC', status: 'pass', message: 'No authenticated routes detected.' };
};
