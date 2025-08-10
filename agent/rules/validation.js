// agent/rules/validation.js
const cfg = require('./config');

module.exports = async function validationRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.validation; else only check server/routes|controllers
  const inScope = Array.isArray(cfg?.scopes?.validation)
    ? cfg.scopes.validation.some((rx) => rx.test(f))
    : /^server\/(routes|controllers)\//i.test(f);

  if (!inScope) return null;

  // Treat as "mutation" if the file defines mutating routes or SQL writes
  const mutating =
    /(router\.(post|put|patch|delete)\s*\()|(\b(INSERT|UPDATE|DELETE)\b)/i.test(code);

  if (!mutating) {
    return { check: 'Input Validation', status: 'pass', message: 'No mutations.' };
  }

  // Look for common validation stacks/patterns
  const hasValidation =
    /(Joi\.)/i.test(code) ||
    /\bzod\b/i.test(code) ||
    /\byup\b/i.test(code) ||
    /\bexpress-validator\b/i.test(code) ||
    /\bcheck\(|\bbody\(|\bparam\(/i.test(code) || // express-validator usage
    /\bcelebrate\(|\bjoiCelebrate\b/i.test(code) || // celebrate wrapper
    /\bvalidate\(\s*[A-Za-z]/.test(code); // custom validate(schema) middleware

  if (hasValidation) {
    return { check: 'Input Validation', status: 'pass' };
  }

  // No validation found on a mutating file → warn with actions
  return {
    check: 'Input Validation',
    status: 'warn',
    message: 'Mutations detected without a validation layer.',
    actions: [
      {
        title: 'Add a Joi validation middleware',
        snippet:
`// server/middleware/validation.js
const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const src = req.method === 'GET' ? req.query : req.body; // adjust if you validate params too
    const { error, value } = schema.validate(src, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({ message: d.message, path: d.path })),
      });
    }
    if (req.method === 'GET') req.query = value; else req.body = value;
    next();
  };
}

module.exports = { validate };`
      },
      {
        title: 'Use it on mutating routes',
        snippet:
`// server/routes/someRouter.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { validate } = require('../middleware/validation');

const createSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  count: Joi.number().integer().min(0).default(0),
});

router.post('/create', validate(createSchema), async (req, res) => {
  // safe, validated req.body here
  res.json({ success: true });
});

module.exports = router;`
      },
      {
        title: 'Alternative: express-validator example',
        snippet:
`// server/routes/someRouter.js
const { body, validationResult } = require('express-validator');

router.post('/create',
  [
    body('name').isString().isLength({ min: 2, max: 120 }),
    body('email').isEmail(),
    body('count').optional().isInt({ min: 0 }),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    next();
  },
  async (req, res) => {
    res.json({ success: true });
  }
);`
      }
    ]
  };
};
