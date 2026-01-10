/**
 * Statistics for a single miner
 */
export interface MinerStats {
  address: string;
  blocksMined: number;
  percentage: number;
  blockNumbers: number[];
}

/**
 * Complete analysis of miner distribution
 */
export interface MinerAnalysis {
  totalBlocks: number;
  uniqueMiners: number;
  miners: MinerStats[];
}
