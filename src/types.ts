/**
 * Data structure for a single block's miner information
 */
export interface MinerBlockData {
  blockNumber: number;
  blockHash: string;
  minerAddresses: string[];
  timestamp: number;
  coinbaseTxHash: string;
}

/**
 * Collection of miner data for a range of blocks
 */
export interface MinerDataCollection {
  startBlock: number;
  endBlock: number;
  totalBlocks: number;
  blocks: MinerBlockData[];
}
