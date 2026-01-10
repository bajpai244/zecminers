import { validateAndGetClickHouseEnvVars, getClickHouseConfig } from './env';
import { ClickHouseDB } from './clickhouse-client';
import { extractBlockData } from './services/block-extractor';
import type { ClickHouseBlockData } from './clickhouse-types';

/**
 * Main ingestion function
 */
async function main(): Promise<void> {
  // Get environment variables
  const envVars = validateAndGetClickHouseEnvVars();
  const config = getClickHouseConfig(envVars);

  const startBlock = parseInt(envVars.START_BLOCK_NUMBER, 10);
  const endBlock = parseInt(envVars.END_BLOCK_NUMBER, 10);
  const totalBlocks = endBlock - startBlock + 1;

  console.log(`Starting ClickHouse ingestion for blocks ${startBlock} to ${endBlock}`);
  console.log(`Total blocks to process: ${totalBlocks}`);

  // Initialize ClickHouse client
  const db = new ClickHouseDB(config);
  await db.init();

  const batchSize = 100;
  let processedCount = 0;
  let insertedCount = 0;

  try {
    for (let batchStart = startBlock; batchStart <= endBlock; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, endBlock);
      const batchPromises: Promise<ClickHouseBlockData | null>[] = [];

      // Fetch blocks in parallel within the batch
      for (let blockNum = batchStart; blockNum <= batchEnd; blockNum++) {
        batchPromises.push(extractBlockData(blockNum, envVars.ZCASH_RPC_URL));
      }

      const batchResults = await Promise.all(batchPromises);

      // Filter out null results and insert
      const validBlocks = batchResults.filter((b): b is ClickHouseBlockData => b !== null);

      if (validBlocks.length > 0) {
        await db.insertBlocks(validBlocks);
        insertedCount += validBlocks.length;
      }

      processedCount += batchEnd - batchStart + 1;
      const progress = ((processedCount / totalBlocks) * 100).toFixed(1);
      console.log(
        `Progress: ${processedCount}/${totalBlocks} blocks (${progress}%) - Inserted: ${insertedCount}`
      );
    }

    const finalCount = await db.getBlockCount();
    console.log(`\nIngestion complete!`);
    console.log(`Blocks processed: ${processedCount}`);
    console.log(`Blocks inserted: ${insertedCount}`);
    console.log(`Total blocks in database: ${finalCount}`);
  } catch (error) {
    console.error('Ingestion failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

main();
