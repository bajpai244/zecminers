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
