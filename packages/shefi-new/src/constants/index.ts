// Chain configuration
export const L2_CHAIN_ID = 8453; // Base
export const L1_CHAIN_ID = 1; // Ethereum Mainnet

// ENS Reverse Registrar on Base
export const BASE_REVERSE_REGISTRAR = '0x0000000000D8e504002cC26E3Ec46D81971C1664';
export const BASE_REVERSE_NAMESPACE = '80002105.reverse';

// ENS Default Reverse Registrar on Ethereum Mainnet
export const L1_REVERSE_REGISTRAR = '0x283F227c4Bd38ecE252C4Ae7ECE650B0e913f1f9';

// Parent name configuration
export const PARENT_NAME = 'shefi.eth';
export const ENS_SUFFIX = '.shefi.eth';

// Namespace Indexer API
export const INDEXER_URL = 'https://indexer.namespace.ninja/api/v1';

// Function selector for setNameForAddrWithSignature(address,uint256,string,bytes)
export const FUNCTION_SIGNATURE = '0x012a67bc' as const;

// Minimum ETH balance threshold for gasless eligibility (in ETH)
export const MIN_ETH_FOR_SPONSORSHIP = '0.0001';

// Contract ABIs
export const REVERSE_REGISTRAR_ABI = [
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'setName',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'signatureExpiry', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'setNameForAddrWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
