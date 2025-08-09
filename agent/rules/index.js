// agent/rules/index.js
module.exports = {
  auth: require('./auth'),
  subscription: require('./subscription'),
  audit: require('./audit'),
  errorLogging: require('./errorLogging'),
  validation: require('./validation'),
  rateLimit: require('./rateLimit'),
  // TODO: add more rules to reach your 24 concerns

    // NEW RULES
  securityHeaders: require('./securityHeaders'),   // helmet()
  corsSafety: require('./corsSafety'),             // no wildcard CORS
  transactions: require('./transactions'),         // DB writes must be transactional
  rbac: require('./rbac'),                         // role/permission guards
  sessionTimeout: require('./sessionTimeout'),     // idle session enforcement
  performance: require('./performance'),           // perf middlewares / caching

};
