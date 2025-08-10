// agent/chowkidar.js
const { scanAll } = require('./scanner');

// helper near the top of the file (once)
function normalizeRuleResult(ruleName, ret) {
  if (!ret) return null;

  // If rule returns a string like "pass" | "warn" | "fail"
  if (typeof ret === 'string') {
    return { displayName: ruleName, status: ret };
  }

  // If rule returns boolean
  if (typeof ret === 'boolean') {
    return { displayName: ruleName, status: ret ? 'pass' : 'fail' };
  }

  // If rule returns an array of issues
  if (Array.isArray(ret)) {
    const status = ret.length ? 'fail' : 'pass';
    return { displayName: ruleName, status, details: ret };
  }

  // Object shape (common): { status, check?, message?, issues? }
  if (typeof ret === 'object') {
    const displayName = ret.check || ruleName; // prefer friendly label
    let status = ret.status || ret.result || ret.outcome;

    if (!status) {
      // derive from issues/messages if present
      if (Array.isArray(ret.issues) && ret.issues.length) status = 'fail';
      else if (ret.message) status = 'warn';
      else status = 'pass';
    }

    return {
      displayName,
      status: String(status).toLowerCase(),
      details: ret.issues || ret.message || undefined
    };
  }

  return null;
}


(async () => {
  console.log('🛡️  Chowkidar 1.0: starting full scan…');
  await scanAll();
  console.log('✅ Scan complete. Output: agent/results.json');
})();
