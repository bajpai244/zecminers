# Implementation Plan: Extract Miner Addresses from Coinbase Transactions

**Created:** 2026-01-04
**Status:** Ready for Implementation

---

## Objective

Iterate through Zcash blocks from `START_BLOCK_NUMBER` to `END_BLOCK_NUMBER`, identify coinbase transactions, extract miner addresses, and save the data to a JSON file.

---

## Key Corrections

⚠️ **Important:** The coinbase transaction is NOT necessarily the first transaction in a block. We must iterate through ALL transactions in the block to find the coinbase one using the `isCoinbaseTransaction()` type guard.

---

## Architecture Overview

```
┌─────────────────┐
│   Environment   │
│   Variables     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   main.ts       │─────▶│ miner-extractor  │
│                 │      │   .ts            │
└─────────────────┘      └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ Block 1  │  │ Block 2  │  │ Block N  │
            └─────┬────┘  └─────┬────┘  └─────┬────┘
                  │             │             │
                  ▼             ▼             ▼
            ┌──────────────────────────────────────┐
            │   Iterate through ALL transactions   │
            │   Find coinbase using type guard     │
            └──────────────┬───────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Extract Miner  │
                  │   Addresses    │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  miner-data    │
                  │     .json      │
                  └────────────────┘
```

---

## Implementation Steps

### 1. Create Type Definitions (`src/types.ts`)

New file with TypeScript interfaces:

```typescript
export interface MinerBlockData {
  blockNumber: number;
  blockHash: string;
  minerAddresses: string[];  // All addresses from all vout
  timestamp: number;
  coinbaseTxHash: string;
}

export interface MinerDataCollection {
  startBlock: number;
  endBlock: number;
  totalBlocks: number;
  blocks: MinerBlockData[];
}
```

### 2. Create Miner Extractor Module (`src/miner-extractor.ts`)

New file with core extraction logic:

#### Function 1: Extract Single Block's Miner Data

```typescript
export async function extractMinerData(
  blockNumber: number,
  zcashRpcUrl: string
): Promise<MinerBlockData | null>
```

**Algorithm:**
1. Fetch block data using `getBlockData()`
2. **Iterate through ALL transactions** in `block.tx[]`
3. For each transaction hash:
   - Fetch transaction using `getTxData()`
   - Check if coinbase using `isCoinbaseTransaction()`
   - If coinbase found, break loop
4. Find the vout with the highest `valueZat` (this is the block reward)
   - The block reward is always the largest output in a coinbase transaction
   - Other outputs might be fees or sent to other addresses
5. Extract addresses only from the block reward vout: `blockRewardOutput.scriptPubKey.addresses[]`
6. Return structured `MinerBlockData`

**Error Handling:**
- Warn if transaction fetch fails, continue to next
- Return `null` if no coinbase found in block
- Log warnings for debugging

#### Function 2: Extract Range of Blocks

```typescript
export async function extractMinerDataForRange(
  startBlock: number,
  endBlock: number,
  zcashRpcUrl: string,
  options?: {
    batchSize?: number;
    progressCallback?: (current: number, total: number) => void;
  }
): Promise<MinerDataCollection>
```

**Features:**
- Batch processing (default: 10 blocks at a time)
- Progress callbacks for monitoring
- Concurrent processing within batches
- Filters out null results

#### Function 3: Save to JSON

```typescript
export function saveMinerDataToJSON(
  data: MinerDataCollection,
  filename: string = 'miner-data.json'
): void
```

**Behavior:**
- Pretty-print JSON with 2-space indentation
- UTF-8 encoding
- Console confirmation message

### 3. Update Main Entry Point (`src/main.ts`)

Replace current implementation:

```typescript
import { validateAndGetEnvVars } from './env';
import { extractMinerDataForRange, saveMinerDataToJSON } from './miner-extractor';

const main = async () => {
  const { ZCASH_RPC_URL, START_BLOCK_NUMBER, END_BLOCK_NUMBER } = validateAndGetEnvVars();

  console.log(`Extracting miner data from blocks ${START_BLOCK_NUMBER} to ${END_BLOCK_NUMBER}...`);

  const minerData = await extractMinerDataForRange(
    parseInt(START_BLOCK_NUMBER),
    parseInt(END_BLOCK_NUMBER),
    ZCASH_RPC_URL,
    {
      batchSize: 10,
      progressCallback: (current, total) => {
        console.log(`Progress: ${current}/${total} blocks processed`);
      }
    }
  );

  saveMinerDataToJSON(minerData, 'miner-data.json');

  console.log(`Successfully extracted miner data for ${minerData.totalBlocks} blocks`);
};

main();
```

---

## Output Format

**File:** `miner-data.json`

```json
{
  "startBlock": 3143950,
  "endBlock": 3143960,
  "totalBlocks": 11,
  "blocks": [
    {
      "blockNumber": 3143950,
      "blockHash": "0000000000f1876afe4c907141d75a1bcdecd6a43e3716bb2b90d7b1c617e36a",
      "minerAddresses": [
        "t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak",
        "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow"
      ],
      "timestamp": 1763829630,
      "coinbaseTxHash": "de2630a3ad5727d50f32f2f77c77b8fb5d8febac807d360c19b0fb12c55f65ce"
    },
    {
      "blockNumber": 3143951,
      "blockHash": "...",
      "minerAddresses": ["..."],
      "timestamp": 1763829730,
      "coinbaseTxHash": "..."
    }
  ]
}
```

---

## File Changes

### New Files
- ✅ `src/types.ts` - TypeScript type definitions
- ✅ `src/miner-extractor.ts` - Core extraction logic

### Modified Files
- ✅ `src/main.ts` - Updated to use new extraction functions

### Unchanged Files
- `src/rpc.ts` - Already has all needed functions
- `src/env.ts` - Already has environment validation
- `src/db.ts` - Not used in this implementation

---

## Performance Characteristics

### Batch Processing
- **Default batch size:** 10 blocks
- **Rationale:** Balance between parallelism and RPC load
- **Configurable:** Can adjust via options parameter

### RPC Calls per Block
- 1 call for block data
- N calls for transactions (where N = number of txs until coinbase found)
- **Optimization:** Stops searching after finding coinbase

### Memory Usage
- Accumulates all results in memory before writing
- For very large ranges, consider streaming approach

---

## Error Handling Strategy

| Error Type | Strategy | Impact |
|------------|----------|--------|
| Block fetch fails | Throw error, stop execution | Critical - can't continue |
| Transaction fetch fails | Warn and skip transaction | Non-critical - try next tx |
| No coinbase found | Return null, log warning | Non-critical - skip block |
| JSON write fails | Throw error | Critical - data loss |

---

## Testing Recommendations

1. **Small range first:** Test with 5-10 blocks
2. **Check output:** Verify JSON structure is correct
3. **Validate addresses:** Confirm addresses are valid Zcash addresses (start with 't1' or 't3')
4. **Performance test:** Monitor RPC response times
5. **Edge cases:** Test blocks with many transactions

---

## Future Enhancements

1. **Resume capability:** Save progress, resume from last processed block
2. **Database storage:** Option to save to SQLite instead of JSON
3. **Retry logic:** Automatic retry for failed RPC calls
4. **Rate limiting:** Configurable delays between requests
5. **Parallel block processing:** Process multiple blocks truly in parallel
6. **Streaming output:** Write to JSON incrementally for large ranges

---

## Environment Variables

Ensure `.env` is configured:

```env
ZCASH_RPC_URL=http://localhost:8232/
START_BLOCK_NUMBER=3143950
END_BLOCK_NUMBER=3143960
```

---

## Usage

```bash
# Run the extraction
bun src/main.ts

# Output will be saved to miner-data.json
```

---

## Dependencies

All existing dependencies are sufficient:
- `axios` - For RPC calls
- `bun` - Runtime
- TypeScript types already defined in `src/rpc.ts`

No additional packages needed.
