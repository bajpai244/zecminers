import { createClient } from '@clickhouse/client';
import { validateAndGetClickHouseEnvVars, getClickHouseConfig } from '../env';

interface MinerStats {
  miner: string;
  blocks_mined: number;
  percentage: number;
}

/**
 * Print total blocks mined by various miners from the last 1 week of available data
 */
async function getMinerStats(): Promise<void> {
  const envVars = validateAndGetClickHouseEnvVars();
  const config = getClickHouseConfig(envVars);

  const client = createClient({
    url: `http://${config.host}:${config.port}`,
    username: config.username,
    password: config.password,
    database: config.database,
  });

  try {
    // Get the latest timestamp in the database
    const latestResult = await client.query({
      query: `SELECT max(timestamp) as latest FROM zcash_blocks FINAL`,
      format: 'JSONEachRow',
    });
    const latestRows = await latestResult.json<{ latest: string }[]>();
    const latestTimestamp = latestRows[0]?.latest;

    if (!latestTimestamp) {
      console.log('No data found in the database');
      return;
    }

    console.log(`Latest block timestamp: ${latestTimestamp}`);
    console.log(`Showing stats for 1 week before this date\n`);

    // Get miner stats for the last 1 week of available data
    const statsResult = await client.query({
      query: `
        WITH
          (SELECT max(timestamp) FROM zcash_blocks FINAL) as latest_ts,
          (SELECT count() FROM zcash_blocks FINAL WHERE timestamp >= latest_ts - INTERVAL 1 WEEK) as total_blocks
        SELECT
          arrayElement(miner_addresses, 1) as miner,
          count() as blocks_mined,
          round(count() * 100.0 / total_blocks, 2) as percentage
        FROM zcash_blocks FINAL
        WHERE timestamp >= latest_ts - INTERVAL 1 WEEK
          AND length(miner_addresses) > 0
        GROUP BY miner
        ORDER BY blocks_mined DESC
      `,
      format: 'JSONEachRow',
    });

    const stats = await statsResult.json<MinerStats[]>();

    if (stats.length === 0) {
      console.log('No miner data found for the last week');
      return;
    }

    // Get total blocks in the period
    const totalResult = await client.query({
      query: `
        SELECT count() as total
        FROM zcash_blocks FINAL
        WHERE timestamp >= (SELECT max(timestamp) FROM zcash_blocks FINAL) - INTERVAL 1 WEEK
      `,
      format: 'JSONEachRow',
    });
    const totalRows = await totalResult.json<{ total: string }[]>();
    const totalBlocks = totalRows[0]?.total || '0';

    console.log(`Total blocks in last week: ${totalBlocks}\n`);
    console.log('='.repeat(90));
    console.log(
      'Miner Address'.padEnd(40) + 'Blocks Mined'.padStart(15) + 'Percentage'.padStart(15)
    );
    console.log('='.repeat(90));

    for (const stat of stats) {
      const minerDisplay =
        stat.miner.length > 38 ? stat.miner.substring(0, 35) + '...' : stat.miner;
      console.log(
        minerDisplay.padEnd(40) +
          String(stat.blocks_mined).padStart(15) +
          `${stat.percentage}%`.padStart(15)
      );
    }

    console.log('='.repeat(90));
    console.log(`\nTotal unique miners: ${stats.length}`);
  } catch (error) {
    console.error('Failed to get miner stats:', error);
    throw error;
  } finally {
    await client.close();
  }
}

getMinerStats();
