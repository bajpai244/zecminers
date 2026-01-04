import { getTxData, isCoinbaseTransaction } from './rpc';
import { validateAndGetEnvVars } from './env';

/**
 * Example showing how to use the typed transaction data response
 * Demonstrates handling both coinbase and non-coinbase transactions
 */
async function exampleCoinbaseTransaction() {
  const { ZCASH_RPC_URL } = validateAndGetEnvVars();

  // Example coinbase transaction hash (block reward)
  const coinbaseTxHash = 'de2630a3ad5727d50f32f2f77c77b8fb5d8febac807d360c19b0fb12c55f65ce';

  const response = await getTxData({
    txHash: coinbaseTxHash,
    zcashRpcUrl: ZCASH_RPC_URL,
  });

  if (response.error) {
    console.error('RPC Error:', response.error.message);
    return;
  }

  if (response.result) {
    const tx = response.result;

    console.log('=== Transaction Information ===');
    console.log('Transaction ID:', tx.txid);
    console.log('Block Height:', tx.height);
    console.log('Confirmations:', tx.confirmations);
    console.log('Size:', tx.size, 'bytes');

    // Use type guard to check if this is a coinbase transaction
    if (isCoinbaseTransaction(tx)) {
      console.log('\n=== Coinbase Transaction (Block Reward) ===');

      // TypeScript now knows tx is CoinbaseTransactionData
      // We can safely access coinbase-specific fields
      const firstVin = tx.vin[0];
      if (firstVin) {
        console.log('Coinbase Data:', firstVin.coinbase);
      }
      console.log('Auth Digest:', tx.authdigest);
      console.log('Expiry Height:', tx.expiryheight);

      console.log('\n=== Outputs ===');
      tx.vout.forEach((output, index) => {
        console.log(`Output ${index}:`);
        console.log(`  Value: ${output.value} ZEC`);
        console.log(`  Value (Zatoshi): ${output.valueZat}`);
        console.log(`  Address:`, output.scriptPubKey.addresses?.[0] || 'N/A');
        console.log(`  Type:`, output.scriptPubKey.type);
      });
    } else {
      console.log('\n=== Regular Transaction ===');

      // TypeScript now knows tx is NonCoinbaseTransactionData
      // We can safely access regular transaction fields
      console.log('Number of Inputs:', tx.vin.length);

      tx.vin.forEach((input, index) => {
        console.log(`\nInput ${index}:`);
        console.log(`  Previous TX:`, input.txid);
        console.log(`  Output Index:`, input.vout);
        console.log(`  Script Signature:`, input.scriptSig.hex.substring(0, 40) + '...');
      });

      console.log('\n=== Outputs ===');
      tx.vout.forEach((output, index) => {
        console.log(`Output ${index}:`);
        console.log(`  Value: ${output.value} ZEC`);
        console.log(`  Address:`, output.scriptPubKey.addresses?.[0] || 'N/A');
      });
    }

    // Common fields accessible regardless of transaction type
    console.log('\n=== Common Information ===');
    console.log('Version:', tx.version);
    console.log('Overwintered:', tx.overwintered);
    console.log('Locktime:', tx.locktime);
    console.log('Block Hash:', tx.blockhash);
    console.log('Block Time:', new Date(tx.blocktime * 1000).toISOString());

    // Orchard pool information
    console.log('\n=== Orchard Pool ===');
    console.log('Actions:', tx.orchard.actions.length);
    console.log('Value Balance:', tx.orchard.valueBalance);
  }
}

async function exampleNonCoinbaseTransaction() {
  const { ZCASH_RPC_URL } = validateAndGetEnvVars();

  // Example non-coinbase transaction hash
  const regularTxHash = 'e43a6b8bd608ea83359c18f2ad6db496ffd8b7495aee4c385e987d7eaf5df210';

  const response = await getTxData({
    txHash: regularTxHash,
    zcashRpcUrl: ZCASH_RPC_URL,
  });

  if (response.error) {
    console.error('RPC Error:', response.error.message);
    return;
  }

  if (response.result) {
    const tx = response.result;

    console.log('\n\n=== Non-Coinbase Transaction Example ===');
    console.log('Transaction ID:', tx.txid);
    console.log('Is Coinbase?', isCoinbaseTransaction(tx));

    if (!isCoinbaseTransaction(tx)) {
      // TypeScript knows this is NonCoinbaseTransactionData
      console.log('\nInputs spending from previous transactions:');
      tx.vin.forEach((input, index) => {
        console.log(`  Input ${index}: ${input.txid} (output #${input.vout})`);
      });
    }
  }
}

// Run both examples
async function runExamples() {
  console.log('Example 1: Coinbase Transaction\n');
  await exampleCoinbaseTransaction();

  console.log('\n\n' + '='.repeat(80) + '\n');

  console.log('Example 2: Non-Coinbase Transaction\n');
  await exampleNonCoinbaseTransaction();
}

runExamples().catch(console.error);
