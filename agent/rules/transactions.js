// agent/rules/transactions.js
module.exports = async function transactions(code, filePath) {
  if (!filePath.includes('server')) return null;

  const writes = /(INSERT|UPDATE|DELETE)\s+/i.test(code);
  if (!writes) return { check: 'DB Transactions', status: 'pass' }; // read-only

  const hasPgTxn =
    code.includes("client.query('BEGIN'") ||
    code.includes('client.query("BEGIN"') ||
    code.includes("await client.query('BEGIN'") ||
    code.includes('pool.connect(') && (code.includes('COMMIT') || code.includes('ROLLBACK')) ||
    code.includes('sequelize.transaction(') || // in case of ORM
    code.includes('knex.transaction(');

  if (hasPgTxn) return { check: 'DB Transactions', status: 'pass' };

  return {
    check: 'DB Transactions',
    status: 'warn',
    message: 'Write queries detected without a transaction (BEGIN/COMMIT/ROLLBACK). Wrap in a transaction.'
  };
};
