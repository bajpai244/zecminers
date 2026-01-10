import { getSyncEnvVars, getClickHouseConfig } from './env';
import { ClickHouseDB } from './clickhouse-client';
import { BlockSyncService, createSyncConfig } from './services/sync-service';
import { getBlockCount } from './rpc';
import { extractBlockData } from './services/block-extractor';
import type { ClickHouseBlockData } from './clickhouse-types';

const TEST_TABLE_NAME = 'zcash_blocks_test';
const INITIAL_BLOCKS = 10000;

async function main(): Promise<void> {
  // Get environment variables
  const envVars = getSyncEnvVars();
  const clickhouseConfig = getClickHouseConfig(envVars);
  const syncConfig = createSyncConfig(envVars);

  console.log('Initializing Zcash Block Quick Sync Service (Test Mode)...');
  console.log(`Using test table: ${TEST_TABLE_NAME}`);

  // Initialize ClickHouse client with test table
  const db = new ClickHouseDB(clickhouseConfig, TEST_TABLE_NAME);
  await db.init();

  // Check if we need to do initial load
  const dbHeight = await db.getLatestBlockNumber();

  if (dbHeight === null) {
    console.log(`\nNo data in test table. Fetching last ${INITIAL_BLOCKS} blocks...`);

    // Get current chain height
    const chainHeight = await getBlockCount(envVars.ZCASH_RPC_URL);
    const startBlock = Math.max(1, chainHeight - INITIAL_BLOCKS);
    const safeHeight = chainHeight - syncConfig.confirmationBlocks;

    console.log(`Chain height: ${chainHeight}`);
    console.log(`Start block: ${startBlock}`);
    console.log(`Safe height (${syncConfig.confirmationBlocks} confirmations): ${safeHeight}`);

    // Fetch initial blocks
    const totalBlocks = safeHeight - startBlock + 1;
    let insertedCount = 0;
    const batchSize = syncConfig.batchSize;

    for (let batchStart = startBlock; batchStart <= safeHeight; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, safeHeight);
      const batchPromises: Promise<ClickHouseBlockData | null>[] = [];

      for (let blockNum = batchStart; blockNum <= batchEnd; blockNum++) {
        batchPromises.push(extractBlockData(blockNum, envVars.ZCASH_RPC_URL));
      }

      const batchResults = await Promise.all(batchPromises);
      const validBlocks = batchResults.filter((b): b is ClickHouseBlockData => b !== null);

      if (validBlocks.length > 0) {
        await db.insertBlocks(validBlocks);
        insertedCount += validBlocks.length;
      }

      const progress = (((batchEnd - startBlock + 1) / totalBlocks) * 100).toFixed(1);
      console.log(`Initial load: ${batchEnd - startBlock + 1}/${totalBlocks} blocks (${progress}%)`);
    }

    console.log(`\nInitial load complete: ${insertedCount} blocks inserted`);
  } else {
    console.log(`\nTest table has data up to block ${dbHeight}. Continuing sync...`);
  }

  // Create sync service with test table DB
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
  console.log('\nStarting continuous sync...');
  await service.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
