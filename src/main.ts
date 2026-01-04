import { validateAndGetEnvVars } from './env';
import { getBlockData, getTxData, isCoinbaseTransaction } from './rpc';

import { writeFileSync } from 'node:fs';

const main = async () => {
  // Validate and get environment variables
  const { ZCASH_RPC_URL, START_BLOCK_NUMBER, END_BLOCK_NUMBER } = validateAndGetEnvVars();

  const result = await getBlockData({
    blockNumber: START_BLOCK_NUMBER,
    zcashRpcUrl: ZCASH_RPC_URL,
  });

  const results = result.result?.tx.map(async (tx) => {
    console.log('printing info for: ', tx);

    const result = await getTxData({
      txHash: tx,
      zcashRpcUrl: ZCASH_RPC_URL,
    });

    writeFileSync(`saving-${Math.random()}.json`, JSON.stringify(result));

    console.log('results: ', result);

    if (result.result) {
      console.log('isCoinbaseTransaction:', isCoinbaseTransaction(result.result));
    }
  });

  if (results) {
    await Promise.all(results);
  }
};

main();
