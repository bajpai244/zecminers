import { getSyncEnvVars, getClickHouseConfig } from './env';
import { ClickHouseDB } from './clickhouse-client';
import { BlockSyncService, createSyncConfig } from './services/sync-service';

async function main(): Promise<void> {
  // Get environment variables
  const envVars = getSyncEnvVars();
  const clickhouseConfig = getClickHouseConfig(envVars);
  const syncConfig = createSyncConfig(envVars);

  console.log('Initializing Zcash Block Sync Service...');

  // Initialize ClickHouse client
  const db = new ClickHouseDB(clickhouseConfig);
  await db.init();

  // Create sync service
  const service = new BlockSyncService(db, syncConfig);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await service.stop();
    await db.close();
    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start the sync service
  await service.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
