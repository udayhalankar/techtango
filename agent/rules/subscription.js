// agent/rules/subscription.js
const cfg = require('./config');

module.exports = async function subscriptionRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');
  const isServer = /server\/server\.js$/i.test(f);

  // Scope:
  // - Always evaluate server.js (global mounts live there)
  // - For other files, use cfg.scopes.subscription if present; otherwise default to routes/controllers
  const inScope =
    isServer ||
    (Array.isArray(cfg?.scopes?.subscription)
      ? cfg.scopes.subscription.some((rx) => rx.test(f))
      : /^server\/(routes|controllers)\//i.test(f));

  if (!inScope) return null;

  // Support either checkSubscription(...) or requireSubscription(...)
  const GUARD = '(checkSubscription|requireSubscription)';
  const MODULE_ARG = `\\(\\s*['"\`][\\w-]+['"\`]\\s*\\)`;

  // Server-level mount:
  // app.use('/api/xxx', checkSubscription('ModuleKey'), router)
  const hasServerMount = new RegExp(
    `app\\.use\\(\\s*['"\`]\\/api[^)]*${GUARD}\\s*${MODULE_ARG}`
  ).test(code);

  // Router-level guard:
  // router.use(checkSubscription('ModuleKey'))
  const hasRouterUse = new RegExp(
    `router\\.use\\(\\s*${GUARD}\\s*${MODULE_ARG}\\s*\\)`
  ).test(code);

  // Inline per-route guard:
  // router.get('/x', checkSubscription('ModuleKey'), handler)
  const hasInlineGuard = new RegExp(
    `router\\.(get|post|put|patch|delete)\\s*\\([^)]*${GUARD}\\s*${MODULE_ARG}`
  ).test(code);

  const protectedBySubscription = hasServerMount || hasRouterUse || hasInlineGuard;

  if (protectedBySubscription) {
    return { check: 'Subscription', status: 'pass' };
  }

  // If server.js or a router lacks subscription guard → fail with actions
  return {
    check: 'Subscription',
    status: 'fail',
    message: isServer
      ? 'No per-module subscription guard detected on API mounts.'
      : 'Missing subscription guard (checkSubscription(moduleKey)) in this router.',
    actions: isServer
      ? [
          {
            title: 'Enforce subscription at mount (server.js)',
            snippet:
`// server/server.js
const { checkSubscription } = require('./middleware/subscription');
const enquiriesRoute = require('./routes/enquiries');

app.use('/api/enquiries', checkSubscription('Enquiries'), enquiriesRoute);
// Repeat for each module:
// app.use('/api/approvals', checkSubscription('Approvals'), approvalsRoutes);
// app.use('/api/workflows', checkSubscription('Workflows'), workflowsRoute);`
          },
          {
            title: 'Subscription middleware implementation',
            snippet:
`// server/middleware/subscription.js
const pool = require('../db');

function checkSubscription(moduleKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const { rows } = await pool.query(
        'SELECT 1 FROM subscriptions WHERE user_id = $1 AND module = $2 AND active = true LIMIT 1',
        [userId, moduleKey]
      );
      if (!rows.length) return res.status(403).json({ error: \`No active subscription for \${moduleKey}\` });
      next();
    } catch (e) {
      console.error('Subscription check error:', e);
      res.status(500).json({ error: 'Subscription check failed' });
    }
  };
}

module.exports = { checkSubscription };`
          }
        ]
      : [
          {
            title: 'Guard the whole router',
            snippet:
`// server/routes/someRouter.js
const express = require('express');
const router = express.Router();
const { checkSubscription } = require('../middleware/subscription');

router.use(checkSubscription('ModuleKey')); // applies to all routes below

// router.get('/items', ...)
module.exports = router;`
          },
          {
            title: 'Or guard a single route inline',
            snippet:
`// server/routes/someRouter.js
const { checkSubscription } = require('../middleware/subscription');

router.post('/items', checkSubscription('ModuleKey'), async (req, res) => {
  // handler...
});`
          }
        ]
  };
};
