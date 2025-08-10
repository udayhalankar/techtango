// agent/rules/transactions.js
const cfg = require('./config');

module.exports = async function transactionsRule(code, filePath) {
  const f = String(filePath || '').replace(/\\/g, '/');

  // Scope: prefer cfg.scopes.transactions; otherwise check server routes/controllers by default
  const inScope = Array.isArray(cfg?.scopes?.transactions)
    ? cfg.scopes.transactions.some((rx) => rx.test(f))
    : /^server\/(routes|controllers|services)\//i.test(f);

  if (!inScope) return null;

  // Heuristics for "write" operations
  const WRITE_RX = /\b(INSERT|UPDATE|DELETE)\b/i;
  const MUTATING_ROUTE_RX = /router\.(post|put|patch|delete)\s*\(/i;

  const hasWriteSQL = WRITE_RX.test(code);
  const mutatingRoute = MUTATING_ROUTE_RX.test(code);

  // If no writes and no mutating routes, nothing to enforce here
  if (!hasWriteSQL && !mutatingRoute) {
    return { check: 'DB Transactions', status: 'pass', message: 'No writes detected.' };
  }

  // Look for transaction patterns
  const hasBegin = /\bBEGIN\b/i.test(code);
  const hasCommit = /\bCOMMIT\b/i.test(code);
  const hasRollback = /\bROLLBACK\b/i.test(code);

  const usesPgClient =
    /pool\.connect\(/i.test(code) ||
    /client\.query\(/i.test(code);

  const usesHelper =
    /\bwithTx\s*\(/i.test(code); // custom helper wrapper

  const usesORMTxn =
    /\bsequelize\.transaction\s*\(/i.test(code) ||
    /\bknex\.transaction\s*\(/i.test(code) ||
    /\btypeorm\b/i.test(code) && /manager\.transaction\s*\(/i.test(code);

  // Multi-write detection: two+ SQL writes or explicit hints (audit + write etc.)
  const writeCount = (code.match(/\b(INSERT|UPDATE|DELETE)\b/gi) || []).length;
  const multiWrite = writeCount >= 2;

  // If any proper transaction mechanism is present, pass
  const hasTransaction =
    usesHelper ||
    usesORMTxn ||
    (usesPgClient && hasBegin && (hasCommit || hasRollback));

  if (hasTransaction) {
    return { check: 'DB Transactions', status: 'pass' };
  }

  // If only a single write and no clear need for atomicity → soft warn or pass?
  // We keep a conservative WARN to encourage consistency.
  const status = multiWrite ? 'fail' : 'warn';
  const msg = multiWrite
    ? 'Multiple write operations detected without a transaction. Wrap in BEGIN/COMMIT with rollback.'
    : 'Write detected without a transaction. Consider wrapping in a transaction for consistency.';

  return {
    check: 'DB Transactions',
    status,
    message: msg,
    actions: [
      {
        title: 'Use a reusable transaction helper (recommended)',
        snippet:
`// server/middleware/withTx.js
const pool = require('../db');

function withTx(handler) {
  return async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(req, res, client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      return next(e);
    } finally {
      client.release();
    }
  };
}
module.exports = { withTx };`
      },
      {
        title: 'Wrap a route using withTx',
        snippet:
`// server/routes/someRouter.js
const { withTx } = require('../middleware/withTx');

router.post('/create', withTx(async (req, res, db) => {
  const ins = await db.query('INSERT INTO items(name) VALUES($1) RETURNING id', [req.body.name]);
  const id = ins.rows[0].id;
  await db.query('INSERT INTO audit_log(action, meta) VALUES($1,$2)', ['ITEM_CREATE', JSON.stringify({ id })]);
  res.json({ success: true, id });
}));`
      },
      {
        title: 'Plain pg transaction (without helper)',
        snippet:
`// inside your handler
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple INSERT/UPDATE/DELETE
  await client.query('COMMIT');
  res.json({ success: true });
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}`
      },
      {
        title: 'Sequelize/Knex example',
        snippet:
`// Sequelize
await sequelize.transaction(async (t) => {
  await Model.create(data, { transaction: t });
  await Audit.create({ action: 'CREATE' }, { transaction: t });
});

// Knex
await knex.transaction(async (trx) => {
  await trx('items').insert(data);
  await trx('audit_log').insert({ action: 'CREATE' });
});`
      }
    ]
  };
};
