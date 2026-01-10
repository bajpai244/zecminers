import { createClient, type ClickHouseClient } from '@clickhouse/client';
import type { ClickHouseConfig, ClickHouseBlockData } from './clickhouse-types';

const DEFAULT_TABLE_NAME = 'zcash_blocks';

function getCreateTableQuery(tableName: string): string {
  return `
CREATE TABLE IF NOT EXISTS ${tableName} (
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
}

/**
 * ClickHouse client wrapper for Zcash block data storage
 */
export class ClickHouseDB {
  private client: ClickHouseClient;
  private database: string;
  private tableName: string;

  constructor(config: ClickHouseConfig, tableName: string = DEFAULT_TABLE_NAME) {
    this.database = config.database;
    this.tableName = tableName;
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
      query: getCreateTableQuery(this.tableName),
    });

    console.log(`ClickHouse: Database '${this.database}' and table '${this.tableName}' ready`);
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
      table: this.tableName,
      values,
      format: 'JSONEachRow',
    });
  }

  /**
   * Get the count of blocks in the database
   */
  async getBlockCount(): Promise<number> {
    const result = await this.client.query({
      query: `SELECT count() as count FROM ${this.tableName} FINAL`,
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
      query: `SELECT 1 FROM ${this.tableName} FINAL WHERE block_number = {blockNumber:UInt64} LIMIT 1`,
      query_params: { blockNumber },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    return rows.length > 0;
  }

  /**
   * Get the latest (highest) block number in the database
   * @returns The highest block number or null if database is empty
   */
  async getLatestBlockNumber(): Promise<number | null> {
    const result = await this.client.query({
      query: `SELECT max(block_number) as max_block FROM ${this.tableName} FINAL`,
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ max_block: number }[]>();
    const maxBlock = rows[0]?.max_block;
    return maxBlock === 0 ? null : maxBlock;
  }

  /**
   * Get the block hash at a specific height
   * @param blockNumber - The block number to look up
   * @returns The block hash or null if not found
   */
  async getBlockHashAtHeight(blockNumber: number): Promise<string | null> {
    const result = await this.client.query({
      query: `SELECT block_hash FROM ${this.tableName} FINAL WHERE block_number = {blockNumber:UInt64} LIMIT 1`,
      query_params: { blockNumber },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ block_hash: string }[]>();
    return rows[0]?.block_hash || null;
  }

  /**
   * Get recent blocks for reorg checking
   * @param count - Number of recent blocks to retrieve
   * @returns Array of block numbers and hashes
   */
  async getRecentBlocks(count: number): Promise<{ block_number: number; block_hash: string }[]> {
    const result = await this.client.query({
      query: `
        SELECT block_number, block_hash
        FROM ${this.tableName} FINAL
        ORDER BY block_number DESC
        LIMIT {count:UInt32}
      `,
      query_params: { count },
      format: 'JSONEachRow',
    });

    return result.json<{ block_number: number; block_hash: string }[]>();
  }

  /**
   * Delete blocks from a certain height onwards (for reorg recovery)
   * @param fromHeight - Delete all blocks with block_number >= this value
   * @returns Number of blocks deleted
   */
  async deleteBlocksFrom(fromHeight: number): Promise<number> {
    // First count how many we'll delete
    const countResult = await this.client.query({
      query: `SELECT count() as count FROM ${this.tableName} FINAL WHERE block_number >= {fromHeight:UInt64}`,
      query_params: { fromHeight },
      format: 'JSONEachRow',
    });
    const countRows = await countResult.json<{ count: number }[]>();
    const deleteCount = countRows[0]?.count || 0;

    // Delete the blocks using ALTER TABLE DELETE
    await this.client.command({
      query: `ALTER TABLE ${this.tableName} DELETE WHERE block_number >= {fromHeight:UInt64}`,
      query_params: { fromHeight },
    });

    return deleteCount;
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
