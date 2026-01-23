# Mint Manager API Reference

Complete type definitions and API details for `@thenamespace/mint-manager`.

## Exports

```typescript
import {
  // Main factory
  createMintClient,

  // Types
  MintClient,
  MintClientConfig,
  MintDetailsRequest,
  MintDetailsResponse,
  MintTransactionRequest,
  MintTransactionResponse,
  EnsRecords,
  EnsTextRecord,
  EnsAddressRecord,
  ContenthashRecord,

  // Enums
  ChainName,
  ContenthashType,
} from "@thenamespace/mint-manager";
```

## MintClientConfig

Configuration for `createMintClient()`:

```typescript
interface MintClientConfig {
  /** Use testnet (Sepolia listings, staging APIs) */
  isTestnet?: boolean;

  /** Custom RPC URLs by chain ID */
  cursomRpcUrls?: Record<number, string>;

  /** Source tag for analytics (default: "namespace-sdk") */
  mintSource?: string;

  /** Cache TTL for listing metadata in ms (default: 15 minutes) */
  listingCacheMilliseconds?: number;

  /** Advanced: Override List Manager API URL */
  listManagerUri?: string;

  /** Advanced: Override Mint Manager API URL */
  mintManagerUri?: string;
}
```

## MintClient Interface

```typescript
interface MintClient {
  /** Get estimated minting parameters and price quote */
  getMintDetails(request: MintDetailsRequest): Promise<MintDetailsResponse>;

  /** Get ABI, args, and value for the mint transaction */
  getMintTransactionParameters(request: MintTransactionRequest): Promise<MintTransactionResponse>;

  /** Check L1 subname availability (Mainnet/Sepolia) */
  isL1SubnameAvailable(subname: string): Promise<boolean>;

  /** Check L2 subname availability (Base, Optimism) */
  isL2SubnameAvailable(subname: string, chainId: number): Promise<boolean>;
}
```

## Request Types

### MintDetailsRequest

```typescript
interface MintDetailsRequest {
  /** Parent ENS name (e.g., "namespace.eth") */
  parentName: string;

  /** Label for the subname (e.g., "alice") */
  label: string;

  /** Address that will mint */
  minterAddress: string;

  /** Years to register (default: 1) */
  expiryInYears?: number;

  /** Use testnet mode */
  isTestnet?: boolean;
}
```

### MintTransactionRequest

```typescript
interface MintTransactionRequest {
  /** Parent ENS name */
  parentName: string;

  /** Subname label */
  label: string;

  /** Address executing the transaction */
  minterAddress: Address; // 0x-prefixed string

  /** Owner of the subname (defaults to minter) */
  owner?: string;

  /** Years to register */
  expiryInYears?: number;

  /** ENS records to set at mint time */
  records?: EnsRecords;
}
```

## Response Types

### MintDetailsResponse

```typescript
interface MintDetailsResponse {
  /** Whether subname can be minted */
  canMint: boolean;

  /** Estimated price in ETH */
  estimatedPriceEth: number;

  /** Estimated fee in ETH */
  estimatedFeeEth: number;

  /** Whether fee is fixed (not subtracted from price) */
  isStandardFee: boolean;

  /** Validation errors if canMint is false */
  validationErrors: MintingValidationErrorType[];
}

type MintingValidationErrorType =
  | "SUBNAME_TAKEN"
  | "MINTER_NOT_TOKEN_OWNER"
  | "MINTER_NOT_WHITELISTED"
  | "LISTING_EXPIRED"
  | "SUBNAME_RESERVED"
  | "VERIFIED_MINTER_ADDRESS_REQUIRED";
```

### MintTransactionResponse

```typescript
interface MintTransactionResponse {
  /** Contract address to call */
  contractAddress: Address;

  /** Contract ABI (for the mint function) */
  abi: any;

  /** Function name (always "mint") */
  functionName: string;

  /** Arguments for the function call */
  args: any[];

  /** Address executing the transaction */
  account: string;

  /** Value to send in wei (price + fee) */
  value: bigint;
}
```

## ENS Records Types

### EnsRecords

```typescript
interface EnsRecords {
  /** Text records */
  texts?: EnsTextRecord[];

  /** Address records for different chains */
  addresses?: EnsAddressRecord[];

  /** Contenthash (IPFS, Arweave, etc.) */
  contenthash?: ContenthashRecord;
}
```

### EnsTextRecord

```typescript
interface EnsTextRecord {
  /** Record key (e.g., "avatar", "com.twitter") */
  key: string;

  /** Record value */
  value: string;
}
```

### EnsAddressRecord

```typescript
interface EnsAddressRecord {
  /** Chain name or coin type number */
  chain: ChainName | number;

  /** Address on that chain */
  value: string;
}
```

### ContenthashRecord

```typescript
interface ContenthashRecord {
  /** Contenthash type */
  type: ContenthashType;

  /** Contenthash value (e.g., IPFS CID) */
  value: string;
}
```

## Enums

### ChainName

```typescript
enum ChainName {
  Ethereum = "eth",
  Default = "default",
  Solana = "sol",
  Arbitrum = "arb",
  Optimism = "op",
  Base = "base",
  Polygon = "polygon",
  Bsc = "bsc",
  Avalanche = "avax",
  Gnosis = "gnosis",
  Zksync = "zksync",
  Cosmos = "cosmos",
  Near = "near",
  Linea = "linea",
  Scroll = "scroll",
  Bitcoin = "btc",
  Starknet = "starknet",
}
```

### ContenthashType

```typescript
enum ContenthashType {
  Ipfs = "ipfs",
  Onion = "onion3",
  Swarm = "swarm",
  Arweave = "arweave",
  Skynet = "skynet",
}
```

## Chain IDs

| Chain | ID | Network |
|-------|-----|---------|
| Ethereum Mainnet | 1 | L1 |
| Sepolia | 11155111 | L1 Testnet |
| Base | 8453 | L2 |
| Base Sepolia | 84532 | L2 Testnet |
| Optimism | 10 | L2 |
