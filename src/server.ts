import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { getSyncEnvVars, getClickHouseConfig } from './env';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// ClickHouse client
let client: ClickHouseClient;

// Initialize ClickHouse client
function initClient(): void {
  const envVars = getSyncEnvVars();
  const config = getClickHouseConfig(envVars);

  client = createClient({
    url: `http://${config.host}:${config.port}`,
    username: config.username,
    password: config.password,
    database: config.database,
  });
}

// Time period mapping
type TimePeriod = '24h' | '7d' | '1m' | '1y';

const periodToInterval: Record<TimePeriod, string> = {
  '24h': '1 DAY',
  '7d': '1 WEEK',
  '1m': '1 MONTH',
  '1y': '1 YEAR',
};

interface MinerStats {
  miner: string;
  blocks_mined: number;
  percentage: number;
}

interface MinerDistributionResponse {
  period: string;
  start_time: string;
  end_time: string;
  total_blocks: number;
  miners: MinerStats[];
}

/**
 * Get miner distribution for a given time period
 */
async function getMinerDistribution(period: TimePeriod): Promise<MinerDistributionResponse> {
  const interval = periodToInterval[period];

  // Get time range
  const timeRangeResult = await client.query({
    query: `
      SELECT
        max(timestamp) as end_time,
        max(timestamp) - INTERVAL ${interval} as start_time
      FROM zcash_blocks FINAL
    `,
    format: 'JSONEachRow',
  });
  const timeRange = await timeRangeResult.json<{ start_time: string; end_time: string }[]>();
  const { start_time, end_time } = timeRange[0]!;

  // Get total blocks in period
  const totalResult = await client.query({
    query: `
      SELECT count() as total
      FROM zcash_blocks FINAL
      WHERE timestamp >= (SELECT max(timestamp) FROM zcash_blocks FINAL) - INTERVAL ${interval}
    `,
    format: 'JSONEachRow',
  });
  const totalRows = await totalResult.json<{ total: number }[]>();
  const totalBlocks = totalRows[0]?.total || 0;

  // Get miner distribution
  const statsResult = await client.query({
    query: `
      WITH
        (SELECT max(timestamp) FROM zcash_blocks FINAL) as latest_ts,
        (SELECT count() FROM zcash_blocks FINAL WHERE timestamp >= latest_ts - INTERVAL ${interval}) as total_blocks
      SELECT
        arrayElement(miner_addresses, 1) as miner,
        count() as blocks_mined,
        round(count() * 100.0 / total_blocks, 2) as percentage
      FROM zcash_blocks FINAL
      WHERE timestamp >= latest_ts - INTERVAL ${interval}
        AND length(miner_addresses) > 0
      GROUP BY miner
      ORDER BY blocks_mined DESC
    `,
    format: 'JSONEachRow',
  });
  const miners = await statsResult.json<MinerStats[]>();

  return {
    period,
    start_time,
    end_time,
    total_blocks: totalBlocks,
    miners,
  };
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get miner distribution for specific period
app.get('/api/miners/:period', async (c) => {
  const period = c.req.param('period') as TimePeriod;

  if (!['24h', '7d', '1m', '1y'].includes(period)) {
    return c.json({ error: 'Invalid period. Use: 24h, 7d, 1m, 1y' }, 400);
  }

  try {
    const data = await getMinerDistribution(period);
    return c.json(data);
  } catch (error) {
    console.error('Error fetching miner distribution:', error);
    return c.json({ error: 'Failed to fetch miner distribution' }, 500);
  }
});

// Get all periods at once
app.get('/api/miners', async (c) => {
  try {
    const [h24, d7, m1, y1] = await Promise.all([
      getMinerDistribution('24h'),
      getMinerDistribution('7d'),
      getMinerDistribution('1m'),
      getMinerDistribution('1y'),
    ]);

    return c.json({
      '24h': h24,
      '7d': d7,
      '1m': m1,
      '1y': y1,
    });
  } catch (error) {
    console.error('Error fetching miner distributions:', error);
    return c.json({ error: 'Failed to fetch miner distributions' }, 500);
  }
});

// Get stats for a specific miner
app.get('/api/miner/:address', async (c) => {
  const address = c.req.param('address');

  try {
    const results: Record<string, { blocks_mined: number; percentage: number; total_blocks: number }> = {};

    for (const [period, interval] of Object.entries(periodToInterval)) {
      const result = await client.query({
        query: `
          WITH
            (SELECT max(timestamp) FROM zcash_blocks FINAL) as latest_ts,
            (SELECT count() FROM zcash_blocks FINAL WHERE timestamp >= latest_ts - INTERVAL ${interval}) as total_blocks
          SELECT
            count() as blocks_mined,
            round(count() * 100.0 / total_blocks, 2) as percentage,
            total_blocks
          FROM zcash_blocks FINAL
          WHERE timestamp >= latest_ts - INTERVAL ${interval}
            AND has(miner_addresses, {address:String})
        `,
        query_params: { address },
        format: 'JSONEachRow',
      });

      const rows = await result.json<{ blocks_mined: number; percentage: number; total_blocks: number }[]>();
      results[period] = rows[0] || { blocks_mined: 0, percentage: 0, total_blocks: 0 };
    }

    return c.json({
      address,
      stats: results,
    });
  } catch (error) {
    console.error('Error fetching miner stats:', error);
    return c.json({ error: 'Failed to fetch miner stats' }, 500);
  }
});

// Get database stats
app.get('/api/stats', async (c) => {
  try {
    const result = await client.query({
      query: `
        SELECT
          count() as total_blocks,
          min(block_number) as first_block,
          max(block_number) as last_block,
          min(timestamp) as first_timestamp,
          max(timestamp) as last_timestamp
        FROM zcash_blocks FINAL
      `,
      format: 'JSONEachRow',
    });

    const stats = await result.json<{
      total_blocks: number;
      first_block: number;
      last_block: number;
      first_timestamp: string;
      last_timestamp: string;
    }[]>();

    return c.json(stats[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// Initialize and start server
initClient();

const port = parseInt(process.env.API_PORT || '3000', 10);

console.log(`Starting API server on port ${port}...`);
console.log(`Endpoints:`);
console.log(`  GET /health - Health check`);
console.log(`  GET /api/stats - Database statistics`);
console.log(`  GET /api/miners - All miner distributions (24h, 7d, 1m, 1y)`);
console.log(`  GET /api/miners/:period - Miner distribution for period (24h, 7d, 1m, 1y)`);
console.log(`  GET /api/miner/:address - Stats for specific miner address`);

export default {
  port,
  fetch: app.fetch,
};
