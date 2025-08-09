// agent/chowkidar.js
const { scanAll } = require('./scanner');

(async () => {
  console.log('🛡️  Chowkidar 1.0: starting full scan…');
  await scanAll();
  console.log('✅ Scan complete. Output: agent/results.json');
})();
