// agent/rules/index.js

// Aggregate rule modules. Each module must export a function like (code, filePath) => result|null
// Do NOT put any per-file logic in this index; the scanner will call each rule with args.

const rules = {
  // Core rules
  auth:            require('./auth'),
  subscription:    require('./subscription'),
  audit:           require('./audit'),
  errorLogging:    require('./errorLogging'),
  validation:      require('./validation'),
  rateLimit:       require('./rateLimit'),

  // Extras you added
  securityHeaders: require('./securityHeaders'),   // helmet()
  corsSafety:      require('./corsSafety'),        // avoid wildcard CORS
  transactions:    require('./transactions'),      // DB writes transactional
  rbac:            require('./rbac'),              // role checks
  sessionTimeout:  require('./sessionTimeout'),    // idle/logout on frontend
  performance:     require('./performance'),       // compression/response-time, etc.
};

// Optional: expose as array if your scanner prefers iterating a list
const asList = Object.entries(rules).map(([name, check]) => ({ name, check }));

module.exports = {
  ...rules,
  asList,
};
