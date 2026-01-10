import { writeFileSync } from 'fs';
import {
  getBlockData,
  getTxData,
  isCoinbaseTransaction,
  type CoinbaseTransactionData,
} from './rpc';
import type { MinerBlockData, MinerDataCollection } from './types';

/**
 * Extract miner data from a single block
 * @param blockNumber - The block number to extract data from
 * @param zcashRpcUrl - The Zcash RPC endpoint URL
 * @returns MinerBlockData or null if no coinbase transaction found
 */
export async function extractMinerData(
  blockNumber: number,
  zcashRpcUrl: string
): Promise<MinerBlockData | null> {
  // 1. Fetch block data
  const blockResponse = await getBlockData({ blockNumber, zcashRpcUrl });

  if (blockResponse.error || !blockResponse.result) {
    throw new Error(`Failed to fetch block ${blockNumber}: ${blockResponse.error?.message}`);
  }

  const block = blockResponse.result;

  // 2. Iterate through ALL transactions to find the coinbase one
  let coinbaseTxHash: string | null = null;
  let coinbaseTx: CoinbaseTransactionData | null = null;

  for (const txHash of block.tx) {
    // Fetch transaction details
    const txResponse = await getTxData({ txHash, zcashRpcUrl });

    if (txResponse.error || !txResponse.result) {
      console.warn(`Failed to fetch transaction ${txHash}, skipping...`);
      continue;
    }

    const tx = txResponse.result;

    // Check if this is the coinbase transaction
    if (isCoinbaseTransaction(tx)) {
      coinbaseTxHash = txHash;
      coinbaseTx = tx;
      break; // Found it, stop searching
    }
  }

  // 3. If no coinbase transaction found, return null
  if (!coinbaseTxHash || !coinbaseTx) {
    console.warn(`No coinbase transaction found in block ${blockNumber}`);
    return null;
  }

  // 4. Check if coinbase transaction has outputs
  if (coinbaseTx.vout.length === 0) {
    console.warn(`Coinbase transaction ${coinbaseTxHash} has no outputs`);
    return null;
  }

  // 5. Find the vout with the highest valueZat (block reward)
  // The block reward is always the largest output in a coinbase transaction
  // Other outputs are fees or other purposes
  let blockRewardOutput = coinbaseTx.vout[0]!; // Safe because we checked length above
  for (const output of coinbaseTx.vout) {
    if (output.valueZat > blockRewardOutput.valueZat) {
      blockRewardOutput = output;
    }
  }

  // 6. Extract miner addresses only from the block reward output
  const minerAddresses: string[] = blockRewardOutput.scriptPubKey.addresses || [];

  // 7. Return structured data
  return {
    blockNumber: block.height,
    blockHash: block.hash,
    minerAddresses,
    timestamp: block.time,
    coinbaseTxHash,
  };
}

/**
 * Extract miner data for a range of blocks
 * @param startBlock - Starting block number
 * @param endBlock - Ending block number
 * @param zcashRpcUrl - The Zcash RPC endpoint URL
 * @param options - Optional configuration
 * @returns Collection of miner data for the range
 */
export async function extractMinerDataForRange(
  startBlock: number,
  endBlock: number,
  zcashRpcUrl: string,
  options?: {
    batchSize?: number;
    progressCallback?: (current: number, total: number) => void;
  }
): Promise<MinerDataCollection> {
  const batchSize = options?.batchSize || 10;
  const blocks: MinerBlockData[] = [];

  for (let blockNum = startBlock; blockNum <= endBlock; blockNum += batchSize) {
    // Process blocks in batches
    const batchEnd = Math.min(blockNum + batchSize - 1, endBlock);
    const batchPromises: Promise<MinerBlockData | null>[] = [];

    for (let i = blockNum; i <= batchEnd; i++) {
      batchPromises.push(extractMinerData(i, zcashRpcUrl));

      // Report progress
      if (options?.progressCallback) {
        options.progressCallback(i - startBlock + 1, endBlock - startBlock + 1);
      }
    }

    const batchResults = await Promise.all(batchPromises);

    // Filter out nulls and add to results
    blocks.push(...batchResults.filter((b): b is MinerBlockData => b !== null));
  }

  return {
    startBlock,
    endBlock,
    totalBlocks: blocks.length,
    blocks,
  };
}

/**
 * Save miner data collection to a JSON file
 * @param data - The miner data collection to save
 * @param filename - Output filename (default: 'miner-data.json')
 */
export function saveMinerDataToJSON(
  data: MinerDataCollection,
  filename: string = 'miner-data.json'
): void {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filename, json, 'utf-8');
  console.log(`Miner data saved to ${filename}`);
}
