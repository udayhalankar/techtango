// agent/rules/helmet.js
module.exports = async function helmetRule(code, file) {
  if (!/server\/server\.js$/i.test(file.replace(/\\/g, '/'))) return null;
  const hasHelmet = /app\.use\(\s*helmet\(\)\s*\)/.test(code);
  return hasHelmet
    ? { check: 'Security Headers (Helmet)', status: 'pass' }
    : { check: 'Security Headers (Helmet)', status: 'fail',
        actions: [{ title: 'Enable Helmet', snippet: `const helmet = require('helmet');\napp.use(helmet());` }] };
};
