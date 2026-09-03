// server/db.js
const { Pool } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,        // e.g., "Test1234?"
  database: process.env.DB_NAME || 'ttoct23_restore_test',
  ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true',
};

console.log('[pg-config]', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  pw_len: (cfg.password || '').length,
  ssl: cfg.ssl,
});

console.log('[pg-config b64]', Buffer.from(cfg.password || '').toString('base64'));

module.exports = new Pool(cfg);







