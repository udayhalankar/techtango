// server/scripts/env-dump.js
require('dotenv').config();
console.log({
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PORT: process.env.DB_PORT,
  DB_PASSWORD_len: (process.env.DB_PASSWORD || '').length, // don't print the password
});
