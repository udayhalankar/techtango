// server/scripts/reset-pg-pass.js
const { Client } = require('pg');
(async () => {
  const client = new Client({ host:'localhost', port:5432, user:'postgres', password:'currentPassword', database:'postgres' });
  await client.connect();
  await client.query(`ALTER USER postgres WITH PASSWORD 'Test1234'`);
  await client.end();
  console.log('done');
})();
