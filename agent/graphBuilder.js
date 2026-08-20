// agent/graphBuilder.js
// Build a project dependency graph (server + client) for the Chowkidar dashboard.

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/** Canonicalize a path to a unix-style project-relative id */
function canon(root, p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

/** Guess a file “kind” for the legend */
function guessKind(relPath) {
  const p = relPath.toLowerCase();
  if (p.includes('/routes/')) return 'route';
  if (p.includes('/controllers/') || p.includes('/controller')) return 'controller';
  if (p.includes('/middleware/')) return 'middleware';
  if (p.includes('/helpers/') || p.includes('/helper')) return 'helper';
  if (p.includes('/components/')) return 'component';
  if (p.includes('/pages/')) return 'page';
  if (p.includes('/utils/') || p.includes('/lib/')) return 'util';
  return 'file';
}

/** Try to resolve a local import to a real file on disk */
function resolveLocal(fromFile, request) {
  if (!request || !request.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), request);

  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];

  for (const c of candidates) {
    try {
      const st = fs.statSync(c);
      if (st.isFile()) return c;
    } catch (_) { /* ignore */ }
  }
  return null;
}

/** Parse a file safely */
function parse(code, filename) {
  return parser.parse(code, {
    sourceType: 'unambiguous',
    sourceFilename: filename,
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'dynamicImport',
      'decorators-legacy',
      'objectRestSpread',
      'optionalChaining',
      'nullishCoalescingOperator',
      'topLevelAwait',
    ],
  });
}

/** Main builder */
async function buildGraph(projectRoot) {
  const root = projectRoot || path.resolve(__dirname, '..');
  const nodes = [];
  const nodeSet = new Set(); // ids
  const edges = [];
  const edgeSet = new Set(); // `${source}|${target}|${type}`

  // 1) Collect files
  const patterns = [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/coverage/**',
  ];
  const files = await fg(patterns, { cwd: root, absolute: true });

  // 2) Add nodes first
  for (const abs of files) {
    const id = canon(root, abs);
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodes.push({ id, label: id, kind: guessKind(id) });
    }
  }

  // 3) Scan each file and add edges (import/require/route mount)
  for (const abs of files) {
    const srcId = canon(root, abs);
    let code = '';
    try {
      code = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    let ast;
    try {
      ast = parse(code, abs);
    } catch {
      // Non-parseable file, skip gracefully
      continue;
    }

    traverse(ast, {
      // ES Module: import x from './y'
      ImportDeclaration(pathNode) {
        const req = pathNode.node.source && pathNode.node.source.value;
        const resolved = resolveLocal(abs, req);
        if (resolved) {
          const tgtId = canon(root, resolved);
          // Ensure target node exists (avoid Cytoscape “nonexistent target”)
          if (!nodeSet.has(tgtId)) {
            nodeSet.add(tgtId);
            nodes.push({ id: tgtId, label: tgtId, kind: guessKind(tgtId) });
          }
          const key = `${srcId}|${tgtId}|import`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: srcId, target: tgtId, type: 'import' });
          }
        }
      },

      // CommonJS: const x = require('./y')
      CallExpression(pathNode) {
        const callee = pathNode.node.callee;
        // require('./x')
        if (
          callee &&
          ((callee.name === 'require') ||
            (callee.type === 'Identifier' && callee.name === 'require'))
        ) {
          const arg = pathNode.node.arguments[0];
          if (arg && arg.type === 'StringLiteral') {
            const resolved = resolveLocal(abs, arg.value);
            if (resolved) {
              const tgtId = canon(root, resolved);
              if (!nodeSet.has(tgtId)) {
                nodeSet.add(tgtId);
                nodes.push({ id: tgtId, label: tgtId, kind: guessKind(tgtId) });
              }
              const key = `${srcId}|${tgtId}|require`;
              if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push({ source: srcId, target: tgtId, type: 'require' });
              }
            }
          }
        }

        // Rough express mount detection: app.use('/x', require('./routes/x'))
        // Creates an edge from this file to the required router file
        if (
          callee &&
          callee.type === 'MemberExpression' &&
          callee.property &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'use' ||
            callee.property.name === 'get' ||
            callee.property.name === 'post' ||
            callee.property.name === 'put' ||
            callee.property.name === 'delete' ||
            callee.property.name === 'patch')
        ) {
          const args = pathNode.node.arguments || [];
          for (const a of args) {
            if (
              a.type === 'CallExpression' &&
              a.callee.type === 'Identifier' &&
              a.callee.name === 'require'
            ) {
              const lit = a.arguments[0];
              if (lit && lit.type === 'StringLiteral') {
                const resolved = resolveLocal(abs, lit.value);
                if (resolved) {
                  const tgtId = canon(root, resolved);
                  if (!nodeSet.has(tgtId)) {
                    nodeSet.add(tgtId);
                    nodes.push({ id: tgtId, label: tgtId, kind: guessKind(tgtId) });
                  }
                  const key = `${srcId}|${tgtId}|route`;
                  if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    edges.push({ source: srcId, target: tgtId, type: 'route' });
                  }
                }
              }
            }
          }
        }
      },
    });
  }

  return { nodes, edges };
}

module.exports = { buildGraph };
