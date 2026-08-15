const {
  createClient,
  getTablesMissingTenantId,
} = require('./tenant-id-migration-utils');

const APPLY = process.argv.includes('--apply');

(async () => {
  let client;
  try {
    client = await createClient();
    const tables = await getTablesMissingTenantId(client);

    if (!tables.length) {
      console.log('No tables are missing tenant_id.');
      return;
    }

    console.log('Tables missing tenant_id:');
    tables.forEach(({ tableName }) => console.log(`- ${tableName}`));

    if (!APPLY) {
      console.log('');
      console.log('Dry run only. Re-run with --apply to add tenant_id columns.');
      return;
    }

    await client.query('BEGIN');
    for (const { tableName } of tables) {
      await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS tenant_id BIGINT`);
      console.log(`[altered] ${tableName}`);
    }
    await client.query('COMMIT');
    console.log(`Added tenant_id to ${tables.length} tables.`);
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('[migrate] failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
})();
