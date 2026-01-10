import type { ClickHouseConfig } from './clickhouse-types';

// Required environment variables for basic operation
const REQUIRED_ENV_VARS = ['ZCASH_RPC_URL', 'START_BLOCK_NUMBER', 'END_BLOCK_NUMBER'] as const;

// Required environment variables for ClickHouse (with defaults)
const CLICKHOUSE_ENV_VARS = [
  'CLICKHOUSE_HOST',
  'CLICKHOUSE_PORT',
  'CLICKHOUSE_DATABASE',
  'CLICKHOUSE_USER',
  'CLICKHOUSE_PASSWORD',
] as const;

export type EnvVars = {
  ZCASH_RPC_URL: string;
  START_BLOCK_NUMBER: string;
  END_BLOCK_NUMBER: string;
};

export type ClickHouseEnvVars = EnvVars & {
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_PORT: string;
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
};

export type SyncEnvVars = {
  ZCASH_RPC_URL: string;
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_PORT: string;
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  SYNC_POLL_INTERVAL_MS: number;
  SYNC_CONFIRMATION_BLOCKS: number;
  SYNC_BATCH_SIZE: number;
  SYNC_REORG_CHECK_DEPTH: number;
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnvVars(): void {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env file and ensure all required variables are set.`
    );
  }
}

/**
 * Validates that all required environment variables are present and returns them
 * @returns An object containing all required environment variables
 * @throws {Error} If any required environment variable is missing
 */
export function validateAndGetEnvVars(): EnvVars {
  validateEnvVars();

  return {
    ZCASH_RPC_URL: process.env.ZCASH_RPC_URL!,
    START_BLOCK_NUMBER: process.env.START_BLOCK_NUMBER!,
    END_BLOCK_NUMBER: process.env.END_BLOCK_NUMBER!,
  };
}

/**
 * Validates and returns environment variables for ClickHouse ingestion
 * Uses defaults for ClickHouse connection if not provided
 * @returns An object containing all required environment variables including ClickHouse config
 * @throws {Error} If any required base environment variable is missing
 */
export function validateAndGetClickHouseEnvVars(): ClickHouseEnvVars {
  validateEnvVars();

  return {
    ZCASH_RPC_URL: process.env.ZCASH_RPC_URL!,
    START_BLOCK_NUMBER: process.env.START_BLOCK_NUMBER!,
    END_BLOCK_NUMBER: process.env.END_BLOCK_NUMBER!,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST || 'localhost',
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT || '8123',
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE || 'zcash',
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER || 'default',
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD || 'zcash123',
  };
}

/**
 * Converts ClickHouse environment variables to ClickHouseConfig object
 * @param envVars - The ClickHouse environment variables
 * @returns ClickHouseConfig object ready for client initialization
 */
export function getClickHouseConfig(envVars: ClickHouseEnvVars | SyncEnvVars): ClickHouseConfig {
  return {
    host: envVars.CLICKHOUSE_HOST,
    port:
      typeof envVars.CLICKHOUSE_PORT === 'string'
        ? parseInt(envVars.CLICKHOUSE_PORT, 10)
        : envVars.CLICKHOUSE_PORT,
    database: envVars.CLICKHOUSE_DATABASE,
    username: envVars.CLICKHOUSE_USER,
    password: envVars.CLICKHOUSE_PASSWORD,
  };
}

/**
 * Validates that ZCASH_RPC_URL is present (required for sync service)
 * @throws {Error} If ZCASH_RPC_URL is missing
 */
function validateSyncEnvVars(): void {
  if (!process.env.ZCASH_RPC_URL) {
    throw new Error(
      `Missing required environment variable: ZCASH_RPC_URL\n` +
        `Please check your .env file and ensure it is set.`
    );
  }
}

/**
 * Gets environment variables for the sync service
 * Uses defaults for most values
 * @returns SyncEnvVars object
 * @throws {Error} If ZCASH_RPC_URL is missing
 */
export function getSyncEnvVars(): SyncEnvVars {
  validateSyncEnvVars();

  return {
    ZCASH_RPC_URL: process.env.ZCASH_RPC_URL!,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST || 'localhost',
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT || '8123',
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE || 'zcash',
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER || 'default',
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD || 'zcash123',
    SYNC_POLL_INTERVAL_MS: parseInt(process.env.SYNC_POLL_INTERVAL_MS || '10000', 10),
    SYNC_CONFIRMATION_BLOCKS: parseInt(process.env.SYNC_CONFIRMATION_BLOCKS || '10', 10),
    SYNC_BATCH_SIZE: parseInt(process.env.SYNC_BATCH_SIZE || '50', 10),
    SYNC_REORG_CHECK_DEPTH: parseInt(process.env.SYNC_REORG_CHECK_DEPTH || '20', 10),
  };
}
