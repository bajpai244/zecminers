import { createClient, type ClickHouseClient } from '@clickhouse/client';
import type { ClickHouseConfig, ClickHouseBlockData } from './clickhouse-types';

const TABLE_NAME = 'zcash_blocks';

const CREATE_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  block_number UInt64,
  block_hash String,
  timestamp DateTime,
  miner_addresses Array(String),
  coinbase_tx_hash String,
  difficulty Float64,
  transparent_value Float64,
  sprout_value Float64,
  sapling_value Float64,
  orchard_value Float64,
  ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(timestamp)
ORDER BY block_number
`;

/**
 * ClickHouse client wrapper for Zcash block data storage
 */
export class ClickHouseDB {
  private client: ClickHouseClient;
  private database: string;

  constructor(config: ClickHouseConfig) {
    this.database = config.database;
    this.client = createClient({
      url: `http://${config.host}:${config.port}`,
      username: config.username,
      password: config.password,
      database: config.database,
    });
  }

  /**
   * Initialize the database and create table if not exists
   */
  async init(): Promise<void> {
    // Create database if not exists
    await this.client.command({
      query: `CREATE DATABASE IF NOT EXISTS ${this.database}`,
    });

    // Create table
    await this.client.command({
      query: CREATE_TABLE_QUERY,
    });

    console.log(`ClickHouse: Database '${this.database}' and table '${TABLE_NAME}' ready`);
  }

  /**
   * Insert multiple blocks into ClickHouse
   * @param blocks - Array of block data to insert
   */
  async insertBlocks(blocks: ClickHouseBlockData[]): Promise<void> {
    if (blocks.length === 0) return;

    const values = blocks.map((block) => ({
      block_number: block.block_number,
      block_hash: block.block_hash,
      timestamp: Math.floor(block.timestamp.getTime() / 1000),
      miner_addresses: block.miner_addresses,
      coinbase_tx_hash: block.coinbase_tx_hash,
      difficulty: block.difficulty,
      transparent_value: block.transparent_value,
      sprout_value: block.sprout_value,
      sapling_value: block.sapling_value,
      orchard_value: block.orchard_value,
    }));

    await this.client.insert({
      table: TABLE_NAME,
      values,
      format: 'JSONEachRow',
    });
  }

  /**
   * Get the count of blocks in the database
   */
  async getBlockCount(): Promise<number> {
    const result = await this.client.query({
      query: `SELECT count() as count FROM ${TABLE_NAME} FINAL`,
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ count: string }[]>();
    return parseInt(rows[0]?.count || '0', 10);
  }

  /**
   * Check if a specific block exists
   * @param blockNumber - The block number to check
   */
  async blockExists(blockNumber: number): Promise<boolean> {
    const result = await this.client.query({
      query: `SELECT 1 FROM ${TABLE_NAME} FINAL WHERE block_number = {blockNumber:UInt64} LIMIT 1`,
      query_params: { blockNumber },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    return rows.length > 0;
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
