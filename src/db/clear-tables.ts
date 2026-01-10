import { createClient } from '@clickhouse/client';
import { validateAndGetClickHouseEnvVars, getClickHouseConfig } from '../env';

/**
 * Clear all tables in the ClickHouse database
 */
async function clearTables(): Promise<void> {
  const envVars = validateAndGetClickHouseEnvVars();
  const config = getClickHouseConfig(envVars);

  const client = createClient({
    url: `http://${config.host}:${config.port}`,
    username: config.username,
    password: config.password,
    database: config.database,
  });

  try {
    // Get all tables in the database
    const result = await client.query({
      query: `SHOW TABLES FROM ${config.database}`,
      format: 'JSONEachRow',
    });

    const tables = await result.json<{ name: string }[]>();

    if (tables.length === 0) {
      console.log(`No tables found in database '${config.database}'`);
      return;
    }

    console.log(`Found ${tables.length} table(s) in database '${config.database}':`);
    tables.forEach((t) => console.log(`  - ${t.name}`));

    // Drop each table
    for (const table of tables) {
      await client.command({
        query: `DROP TABLE IF EXISTS ${config.database}.${table.name}`,
      });
      console.log(`Dropped table: ${table.name}`);
    }

    console.log(`\nAll tables cleared from database '${config.database}'`);
  } catch (error) {
    console.error('Failed to clear tables:', error);
    throw error;
  } finally {
    await client.close();
  }
}

clearTables();
