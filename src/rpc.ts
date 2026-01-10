import axios from 'axios';

export interface GetBlockParams {
  blockNumber: string | number;
  zcashRpcUrl: string;
}

export interface GetTxParams {
  txHash: string;
  zcashRpcUrl: string;
}

export interface RpcResponse<T = unknown> {
  jsonrpc: string;
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface ValuePool {
  id: string;
  chainValue: number;
  chainValueZat: number;
  monitored: boolean;
}

export interface ChainSupply {
  chainValue: number;
  chainValueZat: number;
  monitored: boolean;
}

export interface TreeInfo {
  size: number;
}

export interface Trees {
  sapling: TreeInfo;
  orchard: TreeInfo;
}

export interface BlockData {
  hash: string;
  confirmations: number;
  size: number;
  height: number;
  version: number;
  merkleroot: string;
  blockcommitments: string;
  finalsaplingroot: string;
  finalorchardroot: string;
  tx: string[];
  time: number;
  nonce: string;
  solution: string;
  bits: string;
  difficulty: number;
  chainSupply: ChainSupply;
  valuePools: ValuePool[];
  trees: Trees;
  previousblockhash: string;
  nextblockhash: string;
}

export type GetBlockDataResponse = RpcResponse<BlockData>;

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Script public key information
 */
export interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs?: number;
  type: string;
  addresses?: string[];
}

/**
 * Script signature information
 */
export interface ScriptSig {
  asm: string;
  hex: string;
}

/**
 * Transaction output
 */
export interface Vout {
  value: number;
  valueZat: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

/**
 * Orchard shielded pool information
 */
export interface OrchardInfo {
  actions: unknown[];
  valueBalance: number;
  valueBalanceZat: number;
}

/**
 * Coinbase transaction input (block reward)
 */
export interface VinCoinbase {
  coinbase: string;
  sequence: number;
}

/**
 * Regular transaction input
 */
export interface VinRegular {
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  sequence: number;
}

/**
 * Transaction input - can be either coinbase or regular
 */
export type Vin = VinCoinbase | VinRegular;

/**
 * Base transaction data fields common to all transaction types
 */
interface BaseTransactionData {
  in_active_chain?: boolean;
  hex: string;
  height: number;
  confirmations: number;
  vout: Vout[];
  vShieldedSpend: unknown[];
  vShieldedOutput: unknown[];
  vjoinsplit: unknown[];
  orchard: OrchardInfo;
  valueBalance: number;
  valueBalanceZat: number;
  size: number;
  time: number;
  txid: string;
  overwintered: boolean;
  version: number;
  versiongroupid?: string;
  locktime: number;
  blockhash: string;
  blocktime: number;
}

/**
 * Coinbase transaction data (block reward transaction)
 */
export interface CoinbaseTransactionData extends BaseTransactionData {
  vin: VinCoinbase[];
  authdigest: string;
  expiryheight: number;
}

/**
 * Non-coinbase transaction data (regular transaction)
 */
export interface NonCoinbaseTransactionData extends BaseTransactionData {
  vin: VinRegular[];
  authdigest?: string;
  expiryheight?: number;
}

/**
 * Transaction data - can be either coinbase or non-coinbase
 */
export type TransactionData = CoinbaseTransactionData | NonCoinbaseTransactionData;

/**
 * RPC response type for getTxData
 */
export type GetTxDataResponse = RpcResponse<TransactionData>;

/**
 * Type guard to check if a transaction is a coinbase transaction
 * @param tx - Transaction data to check
 * @returns true if the transaction is a coinbase transaction
 */
export function isCoinbaseTransaction(tx: TransactionData): tx is CoinbaseTransactionData {
  const firstVin = tx.vin[0];
  return tx.vin.length > 0 && firstVin !== undefined && 'coinbase' in firstVin;
}

/**
 * Fetches block data from Zcash RPC endpoint
 * @param params - Object containing blockNumber and zcashRpcUrl
 * @returns The RPC response containing block data
 * @throws {Error} If the RPC request fails
 */
export async function getBlockData(params: GetBlockParams): Promise<GetBlockDataResponse> {
  const { blockNumber, zcashRpcUrl } = params;

  const requestBody = {
    jsonrpc: '1.0',
    id: 'curltest',
    method: 'getblock',
    params: [String(blockNumber)],
  };

  try {
    const response = await axios.post<GetBlockDataResponse>(zcashRpcUrl, requestBody, {
      headers: {
        'content-type': 'text/plain;',
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to fetch block data: ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`
      );
    }
    throw error;
  }
}

/**
 * Fetches transaction data from Zcash RPC endpoint
 * @param params - Object containing txHash and zcashRpcUrl
 * @returns The RPC response containing transaction data
 * @throws {Error} If the RPC request fails
 */
export async function getTxData(params: GetTxParams): Promise<GetTxDataResponse> {
  const { txHash, zcashRpcUrl } = params;

  const requestBody = {
    jsonrpc: '1.0',
    id: 'curltest',
    method: 'getrawtransaction',
    params: [txHash, 1],
  };

  try {
    const response = await axios.post<GetTxDataResponse>(zcashRpcUrl, requestBody, {
      headers: {
        'content-type': 'text/plain;',
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to fetch transaction data: ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`
      );
    }
    throw error;
  }
}

/**
 * Gets the current block count (chain height) from Zcash RPC endpoint
 * @param zcashRpcUrl - The Zcash RPC endpoint URL
 * @returns The current block height
 * @throws {Error} If the RPC request fails
 */
export async function getBlockCount(zcashRpcUrl: string): Promise<number> {
  const requestBody = {
    jsonrpc: '1.0',
    id: 'curltest',
    method: 'getblockcount',
    params: [],
  };

  try {
    const response = await axios.post<RpcResponse<number>>(zcashRpcUrl, requestBody, {
      headers: {
        'content-type': 'text/plain;',
      },
    });

    if (response.data.error || response.data.result === undefined) {
      throw new Error(`RPC error: ${response.data.error?.message || 'Unknown error'}`);
    }

    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to get block count: ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`
      );
    }
    throw error;
  }
}

/**
 * Gets the block hash at a specific height from Zcash RPC endpoint
 * @param height - The block height
 * @param zcashRpcUrl - The Zcash RPC endpoint URL
 * @returns The block hash at the given height
 * @throws {Error} If the RPC request fails
 */
export async function getBlockHash(height: number, zcashRpcUrl: string): Promise<string> {
  const requestBody = {
    jsonrpc: '1.0',
    id: 'curltest',
    method: 'getblockhash',
    params: [height],
  };

  try {
    const response = await axios.post<RpcResponse<string>>(zcashRpcUrl, requestBody, {
      headers: {
        'content-type': 'text/plain;',
      },
    });

    if (response.data.error || response.data.result === undefined) {
      throw new Error(`RPC error: ${response.data.error?.message || 'Unknown error'}`);
    }

    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to get block hash: ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`
      );
    }
    throw error;
  }
}
