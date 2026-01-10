import { ClickHouseDB } from '../clickhouse-client';
import { getBlockCount, getBlockHash } from '../rpc';
import { extractBlockData } from './block-extractor';
import type { SyncEnvVars } from '../env';
import type { ClickHouseBlockData } from '../clickhouse-types';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export interface SyncServiceConfig {
  zcashRpcUrl: string;
  pollIntervalMs: number;
  confirmationBlocks: number;
  batchSize: number;
  reorgCheckDepth: number;
}

/**
 * Block Sync Service
 * Continuously syncs blocks from Zcash node to ClickHouse
 * Handles chain reorganizations
 */
export class BlockSyncService {
  private db: ClickHouseDB;
  private config: SyncServiceConfig;
  private isRunning: boolean = false;
  private pollTimeoutId: NodeJS.Timeout | null = null;

  constructor(db: ClickHouseDB, config: SyncServiceConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Start the sync service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log('Sync service is already running');
      return;
    }

    this.isRunning = true;
    log('Sync service started');
    log(`Configuration:`);
    log(`  - Poll interval: ${this.config.pollIntervalMs}ms`);
    log(`  - Confirmation blocks: ${this.config.confirmationBlocks}`);
    log(`  - Batch size: ${this.config.batchSize}`);
    log(`  - Reorg check depth: ${this.config.reorgCheckDepth}`);

    await this.poll();
  }

  /**
   * Stop the sync service gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    log('Stopping sync service...');
    this.isRunning = false;

    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = null;
    }

    log('Sync service stopped');
  }

  /**
   * Single poll iteration
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // 1. Get current chain height
      const chainHeight = await getBlockCount(this.config.zcashRpcUrl);

      // 2. Get current DB height
      let dbHeight = await this.db.getLatestBlockNumber();

      log(`Chain height: ${chainHeight}, DB height: ${dbHeight ?? 'empty'}`);

      // 3. Check for reorgs if we have data
      if (dbHeight !== null) {
        const reorgHeight = await this.checkForReorgs(dbHeight);
        if (reorgHeight !== null) {
          await this.handleReorg(reorgHeight);
          // Update dbHeight after reorg handling
          dbHeight = await this.db.getLatestBlockNumber();
        }
      }

      // 4. Calculate safe sync target (with confirmations)
      const safeHeight = chainHeight - this.config.confirmationBlocks;

      if (safeHeight < 1) {
        log(`Waiting for more blocks (need ${this.config.confirmationBlocks} confirmations)`);
        this.scheduleNextPoll();
        return;
      }

      // 5. Sync new blocks
      const startBlock = dbHeight === null ? 1 : dbHeight + 1;

      if (startBlock > safeHeight) {
        log('No new blocks to sync (waiting for confirmations)');
        this.scheduleNextPoll();
        return;
      }

      await this.syncBlocks(startBlock, safeHeight);
    } catch (error) {
      log(`Poll error: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.scheduleNextPoll();
  }

  /**
   * Schedule the next poll iteration
   */
  private scheduleNextPoll(): void {
    if (!this.isRunning) {
      return;
    }

    this.pollTimeoutId = setTimeout(() => {
      this.poll();
    }, this.config.pollIntervalMs);
  }

  /**
   * Check for chain reorganizations
   * @returns The height where reorg was detected, or null if no reorg
   */
  private async checkForReorgs(dbHeight: number): Promise<number | null> {
    // Get recent blocks from DB
    const recentBlocks = await this.db.getRecentBlocks(this.config.reorgCheckDepth);

    if (recentBlocks.length === 0) {
      return null;
    }

    // Check each block's hash against the chain
    for (const block of recentBlocks) {
      try {
        const chainHash = await getBlockHash(block.block_number, this.config.zcashRpcUrl);

        if (chainHash !== block.block_hash) {
          log(`Reorg detected at height ${block.block_number}!`);
          log(`  DB hash:    ${block.block_hash}`);
          log(`  Chain hash: ${chainHash}`);
          return block.block_number;
        }
      } catch (error) {
        // Block might not exist on chain anymore (deep reorg)
        log(`Block ${block.block_number} not found on chain - possible deep reorg`);
        return block.block_number;
      }
    }

    return null;
  }

  /**
   * Handle a chain reorganization
   */
  private async handleReorg(reorgHeight: number): Promise<void> {
    log(`Handling reorg from height ${reorgHeight}`);

    // Delete all blocks from reorg point onwards
    const deleted = await this.db.deleteBlocksFrom(reorgHeight);
    log(`Deleted ${deleted} orphaned blocks`);

    // The next sync iteration will re-fetch these blocks with correct data
  }

  /**
   * Sync blocks from startBlock to endBlock
   */
  private async syncBlocks(startBlock: number, endBlock: number): Promise<void> {
    const totalBlocks = endBlock - startBlock + 1;
    log(`Syncing ${totalBlocks} blocks (${startBlock} to ${endBlock})`);

    let insertedCount = 0;

    for (let batchStart = startBlock; batchStart <= endBlock; batchStart += this.config.batchSize) {
      if (!this.isRunning) {
        log('Sync interrupted');
        return;
      }

      const batchEnd = Math.min(batchStart + this.config.batchSize - 1, endBlock);
      const batchPromises: Promise<ClickHouseBlockData | null>[] = [];

      // Fetch blocks in parallel within the batch
      for (let blockNum = batchStart; blockNum <= batchEnd; blockNum++) {
        batchPromises.push(extractBlockData(blockNum, this.config.zcashRpcUrl));
      }

      const batchResults = await Promise.all(batchPromises);

      // Filter out null results and insert
      const validBlocks = batchResults.filter((b): b is ClickHouseBlockData => b !== null);

      if (validBlocks.length > 0) {
        await this.db.insertBlocks(validBlocks);
        insertedCount += validBlocks.length;
      }

      const progress = (((batchEnd - startBlock + 1) / totalBlocks) * 100).toFixed(1);
      log(`Progress: ${batchEnd - startBlock + 1}/${totalBlocks} blocks (${progress}%)`);
    }

    log(`Sync complete: inserted ${insertedCount} blocks`);
  }
}

/**
 * Create a SyncServiceConfig from SyncEnvVars
 */
export function createSyncConfig(envVars: SyncEnvVars): SyncServiceConfig {
  return {
    zcashRpcUrl: envVars.ZCASH_RPC_URL,
    pollIntervalMs: envVars.SYNC_POLL_INTERVAL_MS,
    confirmationBlocks: envVars.SYNC_CONFIRMATION_BLOCKS,
    batchSize: envVars.SYNC_BATCH_SIZE,
    reorgCheckDepth: envVars.SYNC_REORG_CHECK_DEPTH,
  };
}
