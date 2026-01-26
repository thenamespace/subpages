---
name: mint-manager
description: Mint ENS subnames using the Namespace SDK. Use when minting subnames, checking subname availability, getting mint pricing, or preparing mint transactions for ENS names on Ethereum, Base, or Optimism.
allowed-tools: Read, Bash, Write, Edit, Glob, Grep
---

# Namespace Mint Manager Skill

This skill helps you work with the `@thenamespace/mint-manager` SDK to mint ENS subnames on Ethereum Mainnet and L2 networks (Base, Optimism).

## Overview

The Namespace Mint Manager SDK enables:
- **Checking subname availability** on L1 (Ethereum) and L2 (Base, Optimism)
- **Getting mint quotes** with pricing and validation
- **Preparing mint transactions** with optional ENS records
- **Setting ENS records** (text records, addresses, contenthash) at mint time

## Installation

```bash
npm install @thenamespace/mint-manager viem
```

## Quick Start

```typescript
import { createMintClient } from "@thenamespace/mint-manager";

// Mainnet (default)
const client = createMintClient();

// Testnet (Sepolia)
const testnetClient = createMintClient({ isTestnet: true });
```

## Core API

### 1. Check Subname Availability

**L1 (Ethereum Mainnet/Sepolia):**
```typescript
const isAvailable = await client.isL1SubnameAvailable("alice.namespace.eth");
console.log(isAvailable); // true or false
```

**L2 (Base, Optimism):**
```typescript
// Chain IDs: 8453 (Base), 10 (Optimism), 84532 (Base Sepolia)
const isAvailable = await client.isL2SubnameAvailable("alice.namespace.eth", 8453);
```

### 2. Get Mint Details (Quote)

Get pricing and validation before minting:

```typescript
const details = await client.getMintDetails({
  parentName: "namespace.eth",
  label: "alice",
  minterAddress: "0x1234...",
  expiryInYears: 1, // optional, default: 1
});

// Response:
// {
//   canMint: true,
//   estimatedPriceEth: 0.001,
//   estimatedFeeEth: 0.0001,
//   isStandardFee: true,
//   validationErrors: [] // e.g., ["SUBNAME_TAKEN", "MINTER_NOT_WHITELISTED"]
// }
```

### 3. Get Mint Transaction Parameters

Prepare the on-chain transaction:

```typescript
const txParams = await client.getMintTransactionParameters({
  parentName: "namespace.eth",
  label: "alice",
  minterAddress: "0x1234..." as `0x${string}`,
  owner: "0x5678...", // optional, defaults to minter
  expiryInYears: 1,
  records: { // optional ENS records
    texts: [
      { key: "avatar", value: "https://example.com/avatar.png" },
      { key: "com.twitter", value: "@alice" },
      { key: "description", value: "My ENS subname" },
    ],
    addresses: [
      { chain: "eth", value: "0x1234..." },
      { chain: "base", value: "0x1234..." },
    ],
    contenthash: {
      type: "ipfs",
      value: "QmYwAPJzv5CZsnAzt8auVZRn..."
    }
  },
});

// Response includes everything needed for the transaction:
// {
//   contractAddress: "0x...",
//   abi: [...],
//   functionName: "mint",
//   args: [...],
//   value: 1100000000000000n, // wei to send
//   account: "0x1234..."
// }
```

### 4. Execute the Transaction (with viem)

```typescript
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

const hash = await walletClient.writeContract({
  address: txParams.contractAddress,
  abi: txParams.abi,
  functionName: txParams.functionName,
  args: txParams.args,
  value: txParams.value,
});
```

## Supported Chains

| Network | Chain ID | Type | Usage |
|---------|----------|------|-------|
| Ethereum Mainnet | 1 | L1 | `isL1SubnameAvailable` |
| Sepolia | 11155111 | L1 (testnet) | `isL1SubnameAvailable` with `isTestnet: true` |
| Base | 8453 | L2 | `isL2SubnameAvailable(subname, 8453)` |
| Base Sepolia | 84532 | L2 (testnet) | `isL2SubnameAvailable(subname, 84532)` |
| Optimism | 10 | L2 | `isL2SubnameAvailable(subname, 10)` |

## ENS Records Reference

### Text Records
Common keys: `avatar`, `description`, `com.twitter`, `com.github`, `com.discord`, `url`, `email`, `notice`

### Address Records
Supported chains: `eth`, `btc`, `sol`, `base`, `op`, `arb`, `polygon`, `bsc`, `avax`, `gnosis`, `zksync`, `cosmos`, `near`, `linea`, `scroll`, `starknet`

### Contenthash Types
Supported: `ipfs`, `arweave`, `swarm`, `onion3`, `skynet`

## Validation Errors

When `canMint` is false, check `validationErrors`:

| Error | Meaning |
|-------|---------|
| `SUBNAME_TAKEN` | Subname already registered |
| `MINTER_NOT_TOKEN_OWNER` | Minter doesn't own required token |
| `MINTER_NOT_WHITELISTED` | Minter not on whitelist |
| `LISTING_EXPIRED` | Parent name listing expired |
| `SUBNAME_RESERVED` | Subname is reserved |
| `VERIFIED_MINTER_ADDRESS_REQUIRED` | Verification required |

## Configuration Options

```typescript
const client = createMintClient({
  isTestnet: true, // Use testnet (Sepolia)
  cursomRpcUrls: { // Custom RPC URLs by chain ID
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
    84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
  },
  mintSource: "my-app", // Source tag for analytics
});
```

## Complete Example

For a full working example, see [examples.md](examples.md).

## Additional Resources

- [API Reference](reference.md) - Detailed type definitions
- [Package README](../../packages/mint-manager/README.md) - Original documentation
