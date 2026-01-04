# Zcash Block Data Scraper

A TypeScript-based tool for scraping block and transaction data from the Zcash blockchain via RPC and storing it in a SQLite database.

## Features

- Fetch block data from Zcash RPC endpoints
- Fetch transaction data using transaction hashes
- Store block data (block ID and miner) in SQLite database
- Batch insert support for efficient data storage
- TypeScript type safety
- Built with Bun for fast performance

## Prerequisites

- [Bun](https://bun.com) v1.2.22 or higher
- Access to a Zcash RPC endpoint (local node or remote service)

## Installation

Install dependencies:

```bash
bun install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:

```env
ZCASH_RPC_URL=http://localhost:8232/
START_BLOCK_NUMBER=0
END_BLOCK_NUMBER=1000
```

- `ZCASH_RPC_URL`: The URL of your Zcash RPC endpoint
- `START_BLOCK_NUMBER`: Starting block number for scraping
- `END_BLOCK_NUMBER`: Ending block number for scraping

## Usage

Run the scraper:

```bash
bun src/main.ts
```

## Project Structure

```
src/
├── main.ts      - Entry point and main execution logic
├── rpc.ts       - RPC client for Zcash blockchain interaction
├── db.ts        - SQLite database interface for storing block data
└── env.ts       - Environment variable validation
```

## API Reference

### RPC Functions

**`getBlockData(params: GetBlockParams)`**
- Fetches block data from the Zcash blockchain
- Parameters: `blockNumber`, `zcashRpcUrl`
- Returns: RPC response with block data

**`getTxData(params: GetTxParams)`**
- Fetches transaction data using a transaction hash
- Parameters: `txHash`, `zcashRpcUrl`
- Returns: RPC response with transaction data

### Database Class

**`DB`**
- `insert(data: BlockData)`: Insert a single block record
- `insertMany(dataArray: BlockData[])`: Batch insert multiple block records
- `close()`: Close the database connection

## Development

Format code:

```bash
bun run fmt
```
