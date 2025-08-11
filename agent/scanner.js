// agent/scanner.js
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = process.cwd();
const RULES_DIR = path.join(__dirname, 'rules');
const RESULTS_FILE = path.join(__dirname, 'results.json');

const GLOBS = [
  'server/**/*.js',
  'client/src/**/*.{js,jsx,ts,tsx}',
  '*.js',
];

const IGNORE = [
  '**/node_modules/**',
  '**/build/**',
  '**/dist/**',
  'agent/results.json',

  // 🔒 hard exclude formviews (per your request)
  '**/formviews.js',
  '**/formviews.jsx',
  '**/routes/formviews.js',
  '**/routes/formviews.jsx',
  'server/routes/formviews.js',
  'server/routes/formviews.jsx',
];

// ---------- helper: load rules (index.js preferred) ----------
function loadRuleEntries() {
  const indexPath = path.join(RULES_DIR, 'index.js');

  if (fs.existsSync(indexPath)) {
    // Prefer centralized rule index
    const ruleIndex = require(indexPath);
    const entries =
      ruleIndex.asList ||
      Object.entries(ruleIndex).map(([name, check]) => ({ name, check }));

    // Filter out anything not callable
    const cleaned = entries
      .filter(Boolean)
      .map(({ name, check }) => ({ name, check }))
      .filter(({ name, check }) => {
        const ok = typeof check === 'function';
        if (!ok) console.warn(`⚠️  Rule "${name}" has no callable check(). Skipping.`);
        return ok;
      });

    return cleaned;
  }

  // Fallback: scan rules directory for .js files (ignore config/index helpers)
  const files = fs
    .readdirSync(RULES_DIR)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => !/^config\.js$/i.test(f)) // don't treat config as rule
    .filter((f) => !/^index\.js$/i.test(f)); // don't loop index

  const entries = files.map((file) => {
    const mod = require(path.join(RULES_DIR, file));
    const base = path.basename(file, '.js');

    const checkFn =
      (typeof mod === 'function' && mod) ||
      (mod && typeof mod.check === 'function' && mod.check) ||
      (mod && typeof mod.default === 'function' && mod.default) ||
      (mod && mod.default && typeof mod.default.check === 'function' && mod.default.check);

    if (!checkFn) {
      console.warn(`⚠️  Rule "${file}" has no callable check(). Skipping.`);
      return null;
    }
    return { name: base, check: checkFn };
  });

  return entries.filter(Boolean);
}

// ---------- helper: counters ----------
function bump(summary, checkKey, status) {
  if (!summary.byCheck[checkKey]) summary.byCheck[checkKey] = { pass: 0, warn: 0, fail: 0 };
  summary.byCheck[checkKey][status] += 1;
  summary.totals[status] += 1;
}

// ---------- main scan ----------
async function scanAll() {
  const ruleEntries = loadRuleEntries();

  const files = Array.from(
    new Set(
      GLOBS.flatMap((pattern) =>
        globSync(pattern, { ignore: IGNORE, windowsPathsNoEscape: true })
      )
    )
  ).filter((f) => !/formviews\.jsx?$/i.test(f.replace(/\\/g, '/'))); // extra guard

  console.log(`🛡️  Chowkidar 1.0: starting full scan…`);
  console.log(`🧭 Scanning ${files.length} files with ${ruleEntries.length} rules…`);

  const results = {};
  const summary = { totals: { pass: 0, warn: 0, fail: 0 }, byCheck: {} };

  for (const abs of files) {
    const relPath = path.relative(ROOT, abs).replace(/\\/g, '/');

    let code = '';
    try {
      code = fs.readFileSync(abs, 'utf8');
    } catch (e) {
      console.error(`❌ Unable to read ${relPath}: ${e.message}`);
      continue;
    }

    const checksForFile = [];
    for (const { name, check } of ruleEntries) {
      try {
        const out = await check(code, relPath);

        // Rule can return null/undefined to skip
        if (!out) continue;

        // Normalize shape
        const status = ['pass', 'warn', 'fail'].includes(out.status) ? out.status : 'pass';
        const checkKey = out.check || name;

        const item = {
          check: checkKey,
          status,
          message: out.message || '',
        };

        // pass through actions if provided (for the dashboard modal)
        if (out.actions && Array.isArray(out.actions) && out.actions.length) {
          item.actions = out.actions;
        }

        checksForFile.push(item);
        bump(summary, checkKey, status);
      } catch (e) {
        const checkKey = name;
        checksForFile.push({
          check: checkKey,
          status: 'fail',
          message: `Rule crashed: ${e.message}`,
        });
        bump(summary, checkKey, 'fail');
      }
    }

    // Only include files that produced any rule output (optional; comment out if you want empty arrays)
    if (checksForFile.length > 0) {
      results[relPath] = checksForFile;
    }
  }

  const payload = {
    scannedAt: new Date().toISOString(),
    results,
    summary,
  };

  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(payload, null, 2));
    console.log(`✅ Scan complete. Output: ${path.relative(ROOT, RESULTS_FILE)}`);
  } catch (e) {
    console.error(`❌ Failed to write results: ${e.message}`);
  }

  return payload;
}

module.exports = { scanAll };