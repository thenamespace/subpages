// Chain configuration
export const L2_CHAIN_ID = 8453; // Base
export const L1_CHAIN_ID = 1; // Ethereum Mainnet

// ENS Reverse Registrar on Base
export const BASE_REVERSE_REGISTRAR = '0x0000000000D8e504002cC26E3Ec46D81971C1664';
export const BASE_REVERSE_NAMESPACE = '80002105.reverse';

// Parent name configuration
export const PARENT_NAME = 'shefi.eth';
export const ENS_SUFFIX = '.shefi.eth';

// Namespace Indexer API
export const INDEXER_URL = 'https://indexer.namespace.ninja/api/v1';

// Contract ABIs
export const REVERSE_REGISTRAR_ABI = [
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'setName',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
