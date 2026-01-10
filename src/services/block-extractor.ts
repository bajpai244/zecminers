import { getBlockData, getTxData, isCoinbaseTransaction, type BlockData } from '../rpc';
import type { ClickHouseBlockData } from '../clickhouse-types';

/**
 * Extract value pool data from block
 */
export function extractValuePools(block: BlockData): {
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
export async function extractMinerAddresses(
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
export async function extractBlockData(
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
 * Extract multiple blocks in parallel batches
 */
export async function extractBlocksInBatch(
  startBlock: number,
  endBlock: number,
  zcashRpcUrl: string,
  batchSize: number = 50,
  onProgress?: (current: number, total: number) => void
): Promise<ClickHouseBlockData[]> {
  const allBlocks: ClickHouseBlockData[] = [];
  const totalBlocks = endBlock - startBlock + 1;

  for (let batchStart = startBlock; batchStart <= endBlock; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize - 1, endBlock);
    const batchPromises: Promise<ClickHouseBlockData | null>[] = [];

    for (let blockNum = batchStart; blockNum <= batchEnd; blockNum++) {
      batchPromises.push(extractBlockData(blockNum, zcashRpcUrl));
    }

    const batchResults = await Promise.all(batchPromises);
    const validBlocks = batchResults.filter((b): b is ClickHouseBlockData => b !== null);
    allBlocks.push(...validBlocks);

    if (onProgress) {
      const processed = batchEnd - startBlock + 1;
      onProgress(processed, totalBlocks);
    }
  }

  return allBlocks;
}
