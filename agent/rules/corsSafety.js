// agent/rules/corsSafety.js
module.exports = async function corsSafety(code, filePath) {
  if (!filePath.includes('server')) return null;

  const usesCors = code.includes("require('cors')") || code.includes('cors(') || code.includes('app.use(cors');
  if (!usesCors) return { check: 'CORS Safety', status: 'warn', message: 'CORS not configured. Prefer an allowlist.' };

  const wildcard = /origin\s*:\s*['"`]\*['"`]/.test(code) || /app\.use\(\s*cors\(\s*\)\s*\)/.test(code);
  if (wildcard) {
    return {
      check: 'CORS Safety',
      status: 'fail',
      message: 'CORS is wide open (origin "*"). Use an allowlist and credentials rules.'
    };
  }
  return { check: 'CORS Safety', status: 'pass' };
};
