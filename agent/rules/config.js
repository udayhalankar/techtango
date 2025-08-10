// agent/rules/config.js
module.exports = {
  scopes: {
    auth: [/^server[\\/](routes|controllers)[\\/].+\.jsx?$/i],
    subscription: [/^server[\\/](routes|controllers)[\\/].+\.jsx?$/i],
    audit: [/^server[\\/](routes|controllers)[\\/].+\.jsx?$/i],
    validation: [/^server[\\/](routes|controllers)[\\/].+\.jsx?$/i],
    cors: [/^server[\\/].+server\.js$/i],
    helmet: [/^server[\\/].+server\.js$/i],
    rateLimit: [/^server[\\/].+server\.js$/i],
    perf: [/^server[\\/].+server\.js$/i],
    // etc.
  },
  exclude: [
    /node_modules/, /agent[\\/]results\.json/,
    /^server[\\/]db\.js$/i,
    /^server[\\/]middleware[\\/]/i,
  ],
  // treat a single global auth gate as satisfying all routes
  globalAuthPatterns: [
    /app\.use\(\s*['"`]\/api['"`]\s*,\s*verifyToken\s*\)/,
    /router\.use\(\s*verifyToken\s*\)/,
  ],
};
