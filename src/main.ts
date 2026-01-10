import { validateAndGetEnvVars } from './env';
import { extractMinerDataForRange, saveMinerDataToJSON } from './miner-extractor';

const main = async () => {
  // Validate and get environment variables
  const { ZCASH_RPC_URL, START_BLOCK_NUMBER, END_BLOCK_NUMBER } = validateAndGetEnvVars();

  console.log(`Extracting miner data from blocks ${START_BLOCK_NUMBER} to ${END_BLOCK_NUMBER}...`);

  // Extract miner data for the range
  const minerData = await extractMinerDataForRange(
    parseInt(START_BLOCK_NUMBER),
    parseInt(END_BLOCK_NUMBER),
    ZCASH_RPC_URL,
    {
      batchSize: 500, // Process 1000 blocks at a time
      progressCallback: (current, total) => {
        console.log(`Progress: ${current}/${total} blocks processed`);
      },
    }
  );

  // Save to JSON file
  saveMinerDataToJSON(minerData, 'miner-data.json');

  console.log(`Successfully extracted miner data for ${minerData.totalBlocks} blocks`);
};

main();
