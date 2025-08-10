// agent/rules/db-transactions.js
module.exports = async function dbTxRule(code, file) {
  const f = file.replace(/\\/g, '/');
  if (!/^server\/(routes|controllers)\//i.test(f)) return null;

  const multiWrite = /\b(INSERT|UPDATE|DELETE)\b[\s\S]+?\b(INSERT|UPDATE|DELETE)\b/i.test(code);
  const hasTx = /BEGIN|COMMIT|ROLLBACK|withTx\(/i.test(code);

  if (!multiWrite) return { check: 'DB Transactions', status: 'pass', message: 'Single write.' };
  return hasTx
    ? { check: 'DB Transactions', status: 'pass' }
    : { check: 'DB Transactions', status: 'warn',
        actions: [{ title: 'Wrap in transaction', snippet: `const client = await pool.connect();\ntry { await client.query('BEGIN');\n  // writes...\n  await client.query('COMMIT');\n} catch(e){ await client.query('ROLLBACK'); throw e; } finally { client.release(); }` }] };
};
