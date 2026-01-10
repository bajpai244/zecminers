# Analysis Plan: Miner Statistics from miner-data.json

**Created:** 2026-01-04
**Purpose:** Analyze miner distribution and calculate mining statistics

---

## Objective

Analyze the `miner-data.json` file to extract and display:
1. **Unique miners** (distinct addresses)
2. **Number of blocks** mined by each miner
3. **Percentage share** of total blocks for each miner
4. Display results in **descending order** by block count

---

## Input Data Structure

From `src/types.ts`, we know the structure:

```typescript
interface MinerDataCollection {
  startBlock: number;
  endBlock: number;
  totalBlocks: number;
  blocks: MinerBlockData[];
}

interface MinerBlockData {
  blockNumber: number;
  blockHash: string;
  minerAddresses: string[];  // Can have multiple addresses
  timestamp: number;
  coinbaseTxHash: string;
}
```

**Key Consideration:** Each block can have multiple `minerAddresses` (e.g., mining pool + individual miner address). We need to decide how to handle this.

---

## Analysis Approach

**Selected Approach: Primary Address Only**

- Only count the **first address** in `minerAddresses[]`
- Each block is counted exactly once for the primary miner address
- **Result:** Total will be exactly 100%, clean and clear statistics
- **Rationale:** The first address is typically the primary miner/pool that mined the block

---

## Implementation Plan

### 1. Create Analysis Types (src/analytics-types.ts)

```typescript
export interface MinerStats {
  address: string;
  blocksMined: number;
  percentage: number;
  blockNumbers: number[];  // Optional: list of blocks mined
}

export interface MinerAnalysis {
  totalBlocks: number;
  uniqueMiners: number;
  miners: MinerStats[];
}
```

### 2. Create Analysis Module (src/miner-analyzer.ts)

#### Function 1: Load Miner Data

```typescript
import { readFileSync } from 'fs';
import type { MinerDataCollection } from './types';

export function loadMinerData(filename: string = 'miner-data.json'): MinerDataCollection {
  const data = readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}
```

#### Function 2: Analyze Miner Distribution

```typescript
import type { MinerAnalysis, MinerStats } from './analytics-types';

export function analyzeMinerDistribution(data: MinerDataCollection): MinerAnalysis {
  // 1. Create a map to track miner statistics
  const minerMap = new Map<string, {
    blocksMined: number;
    blockNumbers: number[];
  }>();

  // 2. Iterate through all blocks
  for (const block of data.blocks) {
    // Only use the first address (primary miner)
    const primaryAddress = block.minerAddresses[0];

    if (!primaryAddress) {
      console.warn(`Block ${block.blockNumber} has no miner addresses, skipping`);
      continue;
    }

    if (!minerMap.has(primaryAddress)) {
      minerMap.set(primaryAddress, {
        blocksMined: 0,
        blockNumbers: [],
      });
    }

    const stats = minerMap.get(primaryAddress)!;
    stats.blocksMined += 1;
    stats.blockNumbers.push(block.blockNumber);
  }

  // 3. Convert map to array and calculate percentages
  const totalBlocks = data.totalBlocks;
  const miners: MinerStats[] = Array.from(minerMap.entries()).map(([address, stats]) => ({
    address,
    blocksMined: stats.blocksMined,
    percentage: (stats.blocksMined / totalBlocks) * 100,
    blockNumbers: stats.blockNumbers,
  }));

  // 4. Sort by blocks mined (descending)
  miners.sort((a, b) => b.blocksMined - a.blocksMined);

  return {
    totalBlocks,
    uniqueMiners: miners.length,
    miners,
  };
}
```

#### Function 3: Display Analysis Results

```typescript
export function displayMinerAnalysis(analysis: MinerAnalysis): void {
  console.log('='.repeat(80));
  console.log('MINER DISTRIBUTION ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nTotal Blocks Analyzed: ${analysis.totalBlocks}`);
  console.log(`Unique Miners: ${analysis.uniqueMiners}\n`);

  console.log('─'.repeat(80));
  console.log(`${'Rank'.padEnd(6)} ${'Address'.padEnd(50)} ${'Blocks'.padEnd(8)} ${'Share %'.padEnd(10)}`);
  console.log('─'.repeat(80));

  analysis.miners.forEach((miner, index) => {
    const rank = (index + 1).toString().padEnd(6);
    const address = miner.address.padEnd(50);
    const blocks = miner.blocksMined.toString().padEnd(8);
    const percentage = miner.percentage.toFixed(2).padEnd(10);

    console.log(`${rank}${address}${blocks}${percentage}%`);
  });

  console.log('─'.repeat(80));
}
```

#### Function 4: Save Analysis to File

```typescript
export function saveAnalysisToJSON(
  analysis: MinerAnalysis,
  filename: string = 'miner-analysis.json'
): void {
  const json = JSON.stringify(analysis, null, 2);
  writeFileSync(filename, json, 'utf-8');
  console.log(`\nAnalysis saved to ${filename}`);
}

export function saveAnalysisToCSV(
  analysis: MinerAnalysis,
  filename: string = 'miner-analysis.csv'
): void {
  const header = 'Rank,Address,Blocks Mined,Percentage\n';
  const rows = analysis.miners.map((miner, index) =>
    `${index + 1},${miner.address},${miner.blocksMined},${miner.percentage.toFixed(2)}`
  ).join('\n');

  writeFileSync(filename, header + rows, 'utf-8');
  console.log(`Analysis saved to ${filename}`);
}
```

### 3. Create Analysis Entry Point (src/analyze.ts)

```typescript
import {
  loadMinerData,
  analyzeMinerDistribution,
  displayMinerAnalysis,
  saveAnalysisToJSON,
  saveAnalysisToCSV,
} from './miner-analyzer';

const main = () => {
  console.log('Loading miner data...\n');

  // Load the data
  const minerData = loadMinerData('miner-data.json');

  // Analyze distribution
  const analysis = analyzeMinerDistribution(minerData);

  // Display results
  displayMinerAnalysis(analysis);

  // Save to files
  saveAnalysisToJSON(analysis, 'miner-analysis.json');
  saveAnalysisToCSV(analysis, 'miner-analysis.csv');

  console.log('\nAnalysis complete!');
};

main();
```

### 4. Update package.json Scripts

Add a new script for running analysis:

```json
{
  "scripts": {
    "analyze": "bun src/analyze.ts"
  }
}
```

---

## Expected Output

### Console Output

```
================================================================================
MINER DISTRIBUTION ANALYSIS
================================================================================

Total Blocks Analyzed: 1000
Unique Miners: 25

────────────────────────────────────────────────────────────────────────────────
Rank   Address                                            Blocks   Share %
────────────────────────────────────────────────────────────────────────────────
1      t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak                 450      45.00%
2      t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow                 320      32.00%
3      t1PKBiv7mtzD9bNafYaqyxaENeiNDbpKxxQ                 150      15.00%
4      t1RchFTXhPxmpzzV8YgVkeiqjciT29HzjBd                  50       5.00%
5      t1SfJCZz4q7EtD5bdVrgrJXRgbsjZiKxyo8                  30       3.00%
────────────────────────────────────────────────────────────────────────────────

Analysis saved to miner-analysis.json
Analysis saved to miner-analysis.csv

Analysis complete!
```

### JSON Output (miner-analysis.json)

```json
{
  "totalBlocks": 1000,
  "uniqueMiners": 25,
  "miners": [
    {
      "address": "t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak",
      "blocksMined": 450,
      "percentage": 45.0,
      "blockNumbers": [1, 2, 3, ...]
    },
    {
      "address": "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow",
      "blocksMined": 320,
      "percentage": 32.0,
      "blockNumbers": [5, 8, 12, ...]
    }
  ]
}
```

### CSV Output (miner-analysis.csv)

```csv
Rank,Address,Blocks Mined,Percentage
1,t1at7nVNsv6taLRrNRvnQdtfLNRDfsGc3Ak,450,45.00
2,t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow,320,32.00
3,t1PKBiv7mtzD9bNafYaqyxaENeiNDbpKxxQ,150,15.00
```

---

## File Structure

```
src/
├── types.ts              (existing - miner data types)
├── analytics-types.ts    (new - analysis result types)
├── miner-analyzer.ts     (new - analysis logic)
└── analyze.ts            (new - entry point)

Output files:
├── miner-data.json       (existing - input data)
├── miner-analysis.json   (new - analysis results)
└── miner-analysis.csv    (new - CSV export)
```

---

## Advanced Features (Optional Enhancements)

### 1. Top N Miners Only

Add option to display only top N miners:

```typescript
export function displayTopMiners(analysis: MinerAnalysis, topN: number = 10): void {
  const topMiners = {
    ...analysis,
    miners: analysis.miners.slice(0, topN)
  };
  displayMinerAnalysis(topMiners);
}
```

### 2. Mining Pool Detection

Detect common mining pool patterns:

```typescript
export function categorizeMiners(analysis: MinerAnalysis) {
  const pools = analysis.miners.filter(m => m.blocksMined > 50);
  const solo = analysis.miners.filter(m => m.blocksMined <= 50);

  return { pools, solo };
}
```

### 3. Time-based Analysis

Analyze mining patterns over time using timestamps:

```typescript
export function analyzeMiningTrends(data: MinerDataCollection) {
  // Group blocks by time periods (daily/weekly/monthly)
  // Track which miners were active in each period
}
```

### 4. Decentralization Metrics

Calculate mining decentralization:

```typescript
export function calculateDecentralization(analysis: MinerAnalysis) {
  // Nakamoto coefficient
  // Gini coefficient
  // Herfindahl-Hirschman Index (HHI)
}
```

---

## Usage

```bash
# Extract miner data (already done)
bun src/main.ts

# Analyze the extracted data
bun src/analyze.ts

# View results
cat miner-analysis.csv
```

---

## Files to Create

1. ✅ `src/analytics-types.ts` - Type definitions
2. ✅ `src/miner-analyzer.ts` - Analysis logic
3. ✅ `src/analyze.ts` - Entry point
4. ✅ Update `package.json` - Add analyze script

---

## Benefits

1. **Clear Insights**: Easy to see miner distribution
2. **Multiple Formats**: JSON for programmatic use, CSV for spreadsheets, console for quick viewing
3. **Reusable**: Can re-run analysis on different datasets
4. **Extensible**: Easy to add more metrics later
5. **Type Safe**: Full TypeScript type checking
