// Known mining pool addresses mapped to their names
export const KNOWN_MINERS: Record<string, string> = {
  t1K79TgQbqu74d6rBmsMu2oFEXEwAmdYiT7: 'viaBTC',
  t1ZVi2YGk98tEGYcNpXYnJFWCoLG2oYwv3J: 'viaBTC',
  t1PEp2GJLSdhDfCKqc2J211WKDUS1NfoQNy: 'f2pool',
  t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak: 'viaBTC-Solo',
  t1bnxtY7aLCjWx9Ru1YcGwRWch3eEWUFK7u: '2Miners',
  t1L2b66MXbgpVMXDfUa94GCBFAN4dCxGohM: 'Antpool',
  t1e6hceYHkzCbwcwGZzKeMfXXW7x7gr19Cw: 'Kryptex',
  t1LRTUjrLE2RHsS75cjCrxB7xaLTwaVkwao: '2Miners-Solo',
};

export function getMinerName(address: string): string | null {
  return KNOWN_MINERS[address] || null;
}

export interface AggregatedMiner {
  name: string | null;
  addresses: string[];
  blocks_mined: number;
  percentage: number;
}

// Aggregate miners with same pool name into single entries
export function aggregateMiners(
  miners: { miner: string; blocks_mined: number; percentage: number }[]
): AggregatedMiner[] {
  const poolMap = new Map<string, AggregatedMiner>();

  for (const miner of miners) {
    const poolName = getMinerName(miner.miner);
    const key = poolName || miner.miner; // Use address as key for unknown miners

    if (poolMap.has(key)) {
      const existing = poolMap.get(key)!;
      existing.addresses.push(miner.miner);
      existing.blocks_mined += miner.blocks_mined;
      existing.percentage = Math.round((existing.percentage + miner.percentage) * 100) / 100;
    } else {
      poolMap.set(key, {
        name: poolName,
        addresses: [miner.miner],
        blocks_mined: miner.blocks_mined,
        percentage: miner.percentage,
      });
    }
  }

  // Sort by blocks mined descending
  return Array.from(poolMap.values()).sort((a, b) => b.blocks_mined - a.blocks_mined);
}
