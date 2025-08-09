// agent/scanner.js
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

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

  // 🔒 hard exclude formviews
  '**/formviews.js',
  '**/formviews.jsx',
  '**/routes/formviews.js',
  '**/routes/formviews.jsx',
  'server/routes/formviews.js',
  'server/routes/formviews.jsx',
];

const files = Array.from(new Set(
  GLOBS.flatMap((pattern) =>
    globSync(pattern, { ignore: IGNORE, windowsPathsNoEscape: true })
  )
)).filter(f => !/formviews\.jsx?$/i.test(f.replace(/\\/g, '/'))); // extra belt-and-suspenders

const RESULTS_FILE = path.join(__dirname, 'results.json');

function loadRules() {
  const rulesDir = path.join(__dirname, 'rules');
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.js'));

  return files.map(file => {
    const mod = require(path.join(rulesDir, file));
    const base = path.basename(file, '.js');

    // Support: function export, { check }, or default export
    let run =
      (typeof mod === 'function' && mod) ||
      (mod && typeof mod.check === 'function' && mod.check) ||
      (mod && typeof mod.default === 'function' && mod.default);

    if (!run) {
      // Last resort: if default is object with .check
      if (mod && mod.default && typeof mod.default.check === 'function') {
        run = mod.default.check;
      }
    }

    if (!run) {
      console.warn(`⚠️  Rule "${file}" has no callable check(). Skipping.`);
      return null;
    }

    // id to use in summary
    const id =
      (mod && mod.meta && mod.meta.id) ||
      (mod && mod.id) ||
      base;

    // human-friendly label for the card if rule doesn't set "check"
    const label =
      (mod && mod.meta && mod.meta.label) ||
      (mod && mod.label) ||
      base;

    return { id, label, run };
  }).filter(Boolean);
}

function bump(summary, checkKey, status) {
  if (!summary.byCheck[checkKey]) summary.byCheck[checkKey] = { pass: 0, warn: 0, fail: 0 };
  summary.byCheck[checkKey][status] += 1;
  summary.totals[status] += 1;
}

async function scanAll() {
  const rules = loadRules();

  const files = Array.from(new Set(
    GLOBS.flatMap(pattern =>
      globSync(pattern, {
        ignore: [
          '**/node_modules/**',
          '**/build/**',
          '**/dist/**',
          'agent/results.json',
          '**/formviews.js',         // excluded as requested
          '**/formviews.jsx',
          '**/routes/formviews.js',
        ],
        windowsPathsNoEscape: true,
      })
    )
  ));

  console.log(`🧭 Chowkidar scanning ${files.length} files…`);

  const results = {};
  const summary = { totals: { pass: 0, warn: 0, fail: 0 }, byCheck: {} };

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    const code = fs.readFileSync(file, 'utf8');
    results[relPath] = [];

    for (const rule of rules) {
      try {
        const out = await rule.run(code, relPath);
        if (!out) continue;

        // normalize
        const status = ['pass', 'warn', 'fail'].includes(out.status) ? out.status : 'pass';
        const checkKey = out.check || rule.label || rule.id;

        results[relPath].push({ check: checkKey, status, message: out.message });
        bump(summary, checkKey, status);
      } catch (e) {
        const checkKey = rule.label || rule.id;
        results[relPath].push({ check: checkKey, status: 'fail', message: `Rule crashed: ${e.message}` });
        bump(summary, checkKey, 'fail');
      }
    }
  }

  fs.writeFileSync(
    RESULTS_FILE,
    JSON.stringify({ scannedAt: new Date().toISOString(), results, summary }, null, 2)
  );

  console.log(`✅ Scan finished. ${Object.keys(results).length} files → agent/results.json`);
  return { results, summary };
}

module.exports = { scanAll };
