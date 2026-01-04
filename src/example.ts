import { getBlockData } from './rpc';
import { validateAndGetEnvVars } from './env';

/**
 * Example showing how to use the typed block data response
 */
async function example() {
  const { ZCASH_RPC_URL, START_BLOCK_NUMBER } = validateAndGetEnvVars();

  // Call getBlockData - now returns typed GetBlockDataResponse
  const response = await getBlockData({
    blockNumber: START_BLOCK_NUMBER,
    zcashRpcUrl: ZCASH_RPC_URL,
  });

  // Check for errors in the RPC response
  if (response.error) {
    console.error('RPC Error:', response.error.message);
    return;
  }

  // Access typed block data with full autocomplete support
  if (response.result) {
    const block = response.result;

    // All properties are now typed!
    console.log('Block Hash:', block.hash);
    console.log('Block Height:', block.height);
    console.log('Block Time:', new Date(block.time * 1000).toISOString());
    console.log('Difficulty:', block.difficulty);
    console.log('Number of Transactions:', block.tx.length);

    // Access chain supply information
    console.log('\nChain Supply:');
    console.log('  Value (ZEC):', block.chainSupply.chainValue);
    console.log('  Value (Zatoshi):', block.chainSupply.chainValueZat);

    // Access value pools with type safety
    console.log('\nValue Pools:');
    block.valuePools.forEach((pool) => {
      console.log(`  ${pool.id}:`);
      console.log(`    Value: ${pool.chainValue} ZEC`);
      console.log(`    Monitored: ${pool.monitored}`);
    });

    // Access tree information
    console.log('\nTree Sizes:');
    console.log('  Sapling:', block.trees.sapling.size);
    console.log('  Orchard:', block.trees.orchard.size);

    // Access transaction hashes
    console.log('\nFirst Transaction:', block.tx[0]);
    console.log('Previous Block:', block.previousblockhash);
    console.log('Next Block:', block.nextblockhash);
  }
}

// Run the example
example().catch(console.error);
