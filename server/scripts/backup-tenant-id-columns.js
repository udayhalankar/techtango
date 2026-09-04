const path = require('path');
const {
  getAllBackupTables,
  backupTable,
  createClient,
  ensureDir,
  writeJson,
} = require('./tenant-id-migration-utils');

(async () => {
  let client;
  try {
    client = await createClient();
    const tables = await getAllBackupTables(client);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.resolve(__dirname, '../../backups/tenant-id-migration', stamp);
    await ensureDir(outputDir);

    const manifest = {
      generatedAt: new Date().toISOString(),
      //database: process.env.DB_NAME || 'ttoct23_restore_test',
      database: process.env.DB_NAME,
      outputDir,
      tableCount: tables.length,
      tables: [],
    };

    for (const tableName of tables) {
      const payload = await backupTable(client, tableName, outputDir);
      manifest.tables.push({
        tableName,
        columnCount: payload.columns.length,
      });
      console.log(`[backup] ${tableName}`);
    }

    await writeJson(path.join(outputDir, 'manifest.json'), manifest);
    console.log(`Backup written to ${outputDir}`);
  } catch (error) {
    console.error('[backup] failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
})();
