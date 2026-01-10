export type TimePeriod = '24h' | '7d' | '1m' | '1y';
export type ViewType = 'table' | 'chart';

export interface MinerStats {
  miner: string;
  blocks_mined: number;
  percentage: number;
}

export interface MinerDistribution {
  period: string;
  start_time: string;
  end_time: string;
  total_blocks: number;
  miners: MinerStats[];
}

export const PERIOD_LABELS: Record<TimePeriod, string> = {
  '24h': '24 Hours',
  '7d': '7 Days',
  '1m': '1 Month',
  '1y': '1 Year',
};
