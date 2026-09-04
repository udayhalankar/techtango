const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const EXCLUDED_TABLES = new Set([
  'tenants',
  'organizations',
  'subtenants',
  'user_tenants',
  'sequelize_meta',
  'SequelizeMeta',
  'migrations',
]);

function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    //database: process.env.DB_NAME || 'ttoct23_restore_test',
     database: process.env.DB_NAME ,
    ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true',
  };
}

async function createClient() {
  const client = new Client(getDbConfig());
  await client.connect();
  return client;
}

async function listPublicTables(client) {
  const { rows } = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
  );

  return rows
    .map((row) => row.table_name)
    .filter((tableName) => tableName && !tableName.startsWith('pg_') && !tableName.startsWith('sql_') && !EXCLUDED_TABLES.has(tableName));
}

async function getAllBackupTables(client) {
  return listPublicTables(client);
}

async function getTableColumns(client, tableName) {
  const { rows } = await client.query(
    `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName]
  );

  return rows;
}

async function getTablesMissingTenantId(client) {
  const tables = await listPublicTables(client);
  const missing = [];

  for (const tableName of tables) {
    const columns = await getTableColumns(client, tableName);
    if (!columns.some((column) => column.column_name === 'tenant_id')) {
      missing.push({ tableName, columns });
    }
  }

  return missing;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function backupTable(client, tableName, outputDir) {
  const columns = await getTableColumns(client, tableName);
  const { rows } = await client.query(`SELECT * FROM "${tableName}"`);
  const payload = {
    tableName,
    exportedAt: new Date().toISOString(),
    columns,
    rows,
  };
  await writeJson(path.join(outputDir, `${tableName}.json`), payload);
  return payload;
}

module.exports = {
  EXCLUDED_TABLES,
  backupTable,
  createClient,
  ensureDir,
  getTableColumns,
  getAllBackupTables,
  getTablesMissingTenantId,
  listPublicTables,
  writeJson,
};
