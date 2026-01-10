/**
 * Block data structure for ClickHouse storage
 */
export interface ClickHouseBlockData {
  block_number: number;
  block_hash: string;
  timestamp: Date;
  miner_addresses: string[];
  coinbase_tx_hash: string;
  difficulty: number;
  transparent_value: number;
  sprout_value: number;
  sapling_value: number;
  orchard_value: number;
}

/**
 * Value pool information from Zcash block
 */
export interface ValuePool {
  id: 'transparent' | 'sprout' | 'sapling' | 'orchard';
  chainValue: number;
  chainValueZat: number;
  monitored: boolean;
}

/**
 * Configuration for ClickHouse connection
 */
export interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
