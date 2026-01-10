import { readFileSync, writeFileSync } from 'fs';
import type { MinerDataCollection } from './types';
import type { MinerAnalysis, MinerStats } from './analytics-types';

/**
 * Load miner data from JSON file
 * @param filename - Path to the miner data JSON file
 * @returns Parsed miner data collection
 */
export function loadMinerData(filename: string = 'miner-data.json'): MinerDataCollection {
  const data = readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

/**
 * Analyze miner distribution from collected data
 * @param data - Miner data collection to analyze
 * @returns Analysis results with miner statistics
 */
export function analyzeMinerDistribution(data: MinerDataCollection): MinerAnalysis {
  // 1. Create a map to track miner statistics
  const minerMap = new Map<
    string,
    {
      blocksMined: number;
      blockNumbers: number[];
    }
  >();

  // 2. Iterate through all blocks
  for (const block of data.blocks) {
    // Only use the first address (primary miner)
    const primaryAddress = block.minerAddresses[0];

    if (!primaryAddress) {
      console.warn(`Block ${block.blockNumber} has no miner addresses, skipping`);
      continue;
    }

    if (!minerMap.has(primaryAddress)) {
      minerMap.set(primaryAddress, {
        blocksMined: 0,
        blockNumbers: [],
      });
    }

    const stats = minerMap.get(primaryAddress)!;
    stats.blocksMined += 1;
    stats.blockNumbers.push(block.blockNumber);
  }

  // 3. Convert map to array and calculate percentages
  const totalBlocks = data.totalBlocks;
  const miners: MinerStats[] = Array.from(minerMap.entries()).map(([address, stats]) => ({
    address,
    blocksMined: stats.blocksMined,
    percentage: (stats.blocksMined / totalBlocks) * 100,
    blockNumbers: stats.blockNumbers,
  }));

  // 4. Sort by blocks mined (descending)
  miners.sort((a, b) => b.blocksMined - a.blocksMined);

  return {
    totalBlocks,
    uniqueMiners: miners.length,
    miners,
  };
}

/**
 * Display miner analysis results to console
 * @param analysis - Analysis results to display
 */
export function displayMinerAnalysis(analysis: MinerAnalysis): void {
  console.log('='.repeat(80));
  console.log('MINER DISTRIBUTION ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nTotal Blocks Analyzed: ${analysis.totalBlocks}`);
  console.log(`Unique Miners: ${analysis.uniqueMiners}\n`);

  console.log('─'.repeat(80));
  console.log(
    `${'Rank'.padEnd(6)} ${'Address'.padEnd(50)} ${'Blocks'.padEnd(8)} ${'Share %'.padEnd(10)}`
  );
  console.log('─'.repeat(80));

  analysis.miners.forEach((miner, index) => {
    const rank = (index + 1).toString().padEnd(6);
    const address = miner.address.padEnd(50);
    const blocks = miner.blocksMined.toString().padEnd(8);
    const percentage = miner.percentage.toFixed(2).padEnd(10);

    console.log(`${rank}${address}${blocks}${percentage}%`);
  });

  console.log('─'.repeat(80));
}

/**
 * Save analysis results to JSON file
 * @param analysis - Analysis results to save
 * @param filename - Output filename
 */
export function saveAnalysisToJSON(
  analysis: MinerAnalysis,
  filename: string = 'miner-analysis.json'
): void {
  const json = JSON.stringify(analysis, null, 2);
  writeFileSync(filename, json, 'utf-8');
  console.log(`\nAnalysis saved to ${filename}`);
}

/**
 * Save analysis results to CSV file
 * @param analysis - Analysis results to save
 * @param filename - Output filename
 */
export function saveAnalysisToCSV(
  analysis: MinerAnalysis,
  filename: string = 'miner-analysis.csv'
): void {
  const header = 'Rank,Address,Blocks Mined,Percentage\n';
  const rows = analysis.miners
    .map(
      (miner, index) =>
        `${index + 1},${miner.address},${miner.blocksMined},${miner.percentage.toFixed(2)}`
    )
    .join('\n');

  writeFileSync(filename, header + rows, 'utf-8');
  console.log(`Analysis saved to ${filename}`);
}
