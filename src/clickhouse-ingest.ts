import { validateAndGetClickHouseEnvVars, getClickHouseConfig } from './env';
import { ClickHouseDB } from './clickhouse-client';
import { getBlockData, getTxData, isCoinbaseTransaction, type BlockData } from './rpc';
import type { ClickHouseBlockData } from './clickhouse-types';

/**
 * Extract value pool data from block
 */
function extractValuePools(block: BlockData): {
  transparent: number;
  sprout: number;
  sapling: number;
  orchard: number;
} {
  const result = { transparent: 0, sprout: 0, sapling: 0, orchard: 0 };

  for (const pool of block.valuePools) {
    switch (pool.id) {
      case 'transparent':
        result.transparent = pool.chainValue;
        break;
      case 'sprout':
        result.sprout = pool.chainValue;
        break;
      case 'sapling':
        result.sapling = pool.chainValue;
        break;
      case 'orchard':
        result.orchard = pool.chainValue;
        break;
    }
  }

  return result;
}

/**
 * Extract miner addresses from a block by finding the coinbase transaction
 */
async function extractMinerAddresses(
  block: BlockData,
  zcashRpcUrl: string
): Promise<{ addresses: string[]; coinbaseTxHash: string }> {
  for (const txHash of block.tx) {
    const txResponse = await getTxData({ txHash, zcashRpcUrl });

    if (txResponse.error || !txResponse.result) {
      continue;
    }

    const tx = txResponse.result;

    if (isCoinbaseTransaction(tx)) {
      // Find the vout with the highest valueZat (block reward)
      if (tx.vout.length === 0) {
        return { addresses: [], coinbaseTxHash: txHash };
      }

      let blockRewardOutput = tx.vout[0]!;
      for (const output of tx.vout) {
        if (output.valueZat > blockRewardOutput.valueZat) {
          blockRewardOutput = output;
        }
      }

      return {
        addresses: blockRewardOutput.scriptPubKey.addresses || [],
        coinbaseTxHash: txHash,
      };
    }
  }

  return { addresses: [], coinbaseTxHash: '' };
}

/**
 * Extract full block data for ClickHouse storage
 */
async function extractBlockData(
  blockNumber: number,
  zcashRpcUrl: string
): Promise<ClickHouseBlockData | null> {
  const blockResponse = await getBlockData({ blockNumber, zcashRpcUrl });

  if (blockResponse.error || !blockResponse.result) {
    console.warn(`Failed to fetch block ${blockNumber}: ${blockResponse.error?.message}`);
    return null;
  }

  const block = blockResponse.result;
  const valuePools = extractValuePools(block);
  const { addresses, coinbaseTxHash } = await extractMinerAddresses(block, zcashRpcUrl);

  return {
    block_number: block.height,
    block_hash: block.hash,
    timestamp: new Date(block.time * 1000),
    miner_addresses: addresses,
    coinbase_tx_hash: coinbaseTxHash,
    difficulty: block.difficulty,
    transparent_value: valuePools.transparent,
    sprout_value: valuePools.sprout,
    sapling_value: valuePools.sapling,
    orchard_value: valuePools.orchard,
  };
}

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
