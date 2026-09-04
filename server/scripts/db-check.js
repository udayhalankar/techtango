// server/scripts/db-check.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,           // must be "Test1234?" per your .env
 // database: process.env.DB_NAME || 'ttoct23_restore_test',
  database: process.env.DB_NAME, 
 ssl: false,
});

(async () => {
  try {
    console.log('[DB-CHECK] connecting...');
    const r = await pool.query('select 1 as ok');
    console.log('[DB-CHECK] success:', r.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('[DB-CHECK] FAILED:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
