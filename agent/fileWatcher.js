// agent/fileWatcher.js
const chokidar = require('chokidar');
const path = require('path');
const { scanAll } = require('./scanner');

const WATCH_PATHS = [
  'server/**/*.{js,jsx,ts,tsx}',
  'client/src/**/*.{js,jsx,ts,tsx}',
  '*.js',
];


const watcher = chokidar.watch([
  'server/**/*.{js,jsx,ts,tsx}',
  'client/src/**/*.{js,jsx,ts,tsx}',
  '*.js',
], {
  ignored: [
    /node_modules/i,
    /build/i,
    /dist/i,
    /agent[\\\/]results\.json/i,

    // 🔒 hard exclude formviews
    /formviews\.jsx?$/i,
    /routes[\\\/]formviews\.jsx?$/i,
    /server[\\\/]routes[\\\/]formviews\.jsx?$/i,
  ],
  ignoreInitial: false,
  persistent: true,
  awaitWriteFinish: true,
});

['add','change','unlink','addDir','unlinkDir'].forEach(evt => {
  watcher.on(evt, (file) => {
    const p = file.replace(/\\/g, '/');
    if (/formviews\.jsx?$/i.test(p)) return; // extra guard
    debounceScan();
  });
});


let timer;
function debounceScan() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    console.log('🔎 Re-scanning after changes…');
    await scanAll();
  }, 400);
}

console.log('👀 Chowkidar watching:\n - ' + WATCH_PATHS.join('\n - '));


['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach((evt) => {
  watcher.on(evt, (file) => {
    console.log(`📄 ${evt}: ${path.relative(process.cwd(), file)}`);
    debounceScan();
  });
});

module.exports = watcher;
