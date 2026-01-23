# Mint Manager Examples

Complete working examples for the `@thenamespace/mint-manager` SDK.

## Example 1: Check Availability and Get Quote

```typescript
import { createMintClient } from "@thenamespace/mint-manager";

async function checkAndQuote() {
  const client = createMintClient({ isTestnet: true });

  const parentName = "namespace.eth";
  const label = "alice";
  const fullSubname = `${label}.${parentName}`;
  const minterAddress = "0x1234567890123456789012345678901234567890";

  // Check L1 availability
  const l1Available = await client.isL1SubnameAvailable(fullSubname);
  console.log(`L1 Available: ${l1Available}`);

  // Check L2 availability (Base Sepolia)
  const l2Available = await client.isL2SubnameAvailable(fullSubname, 84532);
  console.log(`L2 Available (Base Sepolia): ${l2Available}`);

  // Get mint quote
  const details = await client.getMintDetails({
    parentName,
    label,
    minterAddress,
    expiryInYears: 1,
  });

  console.log(`Can Mint: ${details.canMint}`);
  console.log(`Price: ${details.estimatedPriceEth} ETH`);
  console.log(`Fee: ${details.estimatedFeeEth} ETH`);
  console.log(`Total: ${details.estimatedPriceEth + details.estimatedFeeEth} ETH`);

  if (!details.canMint) {
    console.log(`Errors: ${details.validationErrors.join(", ")}`);
  }
}

checkAndQuote();
```

## Example 2: Mint with ENS Records

```typescript
import { createMintClient, ChainName } from "@thenamespace/mint-manager";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

async function mintWithRecords() {
  const client = createMintClient({ isTestnet: true });

  const minterAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;

  // Get transaction parameters with records
  const txParams = await client.getMintTransactionParameters({
    parentName: "namespace.eth",
    label: "alice",
    minterAddress,
    expiryInYears: 1,
    records: {
      texts: [
        { key: "avatar", value: "https://example.com/avatar.png" },
        { key: "description", value: "Alice's ENS subname" },
        { key: "com.twitter", value: "@alice" },
        { key: "com.github", value: "alice" },
        { key: "url", value: "https://alice.example.com" },
      ],
      addresses: [
        { chain: ChainName.Ethereum, value: minterAddress },
        { chain: ChainName.Base, value: minterAddress },
        { chain: ChainName.Optimism, value: minterAddress },
      ],
    },
  });

  console.log("Transaction Parameters:");
  console.log(`  Contract: ${txParams.contractAddress}`);
  console.log(`  Function: ${txParams.functionName}`);
  console.log(`  Value: ${txParams.value} wei`);

  // Execute transaction (requires private key)
  const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: txParams.contractAddress,
    abi: txParams.abi,
    functionName: txParams.functionName,
    args: txParams.args,
    value: txParams.value,
  });

  console.log(`Transaction hash: ${hash}`);
}

mintWithRecords();
```

## Example 3: Mint with IPFS Contenthash

```typescript
import { createMintClient, ContenthashType } from "@thenamespace/mint-manager";

async function mintWithContenthash() {
  const client = createMintClient({ isTestnet: true });

  const txParams = await client.getMintTransactionParameters({
    parentName: "namespace.eth",
    label: "mysite",
    minterAddress: "0x1234..." as `0x${string}`,
    records: {
      contenthash: {
        type: ContenthashType.Ipfs,
        value: "QmYwAPJzv5CZsnAzt8auVZRn8355M7YLPpxMXbwsP8EfTD",
      },
      texts: [
        { key: "url", value: "https://mysite.eth.limo" },
      ],
    },
  });

  console.log("Ready to mint with IPFS contenthash");
  console.log(txParams);
}

mintWithContenthash();
```

## Example 4: Mint for Another Address

```typescript
import { createMintClient } from "@thenamespace/mint-manager";

async function mintForOther() {
  const client = createMintClient({ isTestnet: true });

  const minter = "0xMINTER_ADDRESS..." as `0x${string}`;
  const owner = "0xOWNER_ADDRESS..."; // Different from minter

  const txParams = await client.getMintTransactionParameters({
    parentName: "namespace.eth",
    label: "gift",
    minterAddress: minter,
    owner: owner, // Subname will be owned by this address
    expiryInYears: 2,
  });

  // Minter pays and executes, but owner receives the subname
  console.log(`Minter (pays): ${txParams.account}`);
  console.log(`Owner (receives): ${owner}`);
}

mintForOther();
```

## Example 5: Custom RPC Configuration

```typescript
import { createMintClient } from "@thenamespace/mint-manager";

const client = createMintClient({
  isTestnet: true,
  cursomRpcUrls: {
    // Sepolia
    11155111: "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
    // Base Sepolia
    84532: "https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
  },
});

// Now all RPC calls use your custom endpoints
const available = await client.isL2SubnameAvailable("alice.namespace.eth", 84532);
```

## Example 6: Full Mint Flow with Error Handling

```typescript
import { createMintClient } from "@thenamespace/mint-manager";
import { createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

async function fullMintFlow() {
  const client = createMintClient({ isTestnet: true });

  const config = {
    parentName: "namespace.eth",
    label: "myname",
    minterAddress: "0x..." as `0x${string}`,
  };

  try {
    // Step 1: Check availability
    console.log("Checking availability...");
    const fullSubname = `${config.label}.${config.parentName}`;

    const isAvailable = await client.isL2SubnameAvailable(fullSubname, 84532);
    if (!isAvailable) {
      throw new Error(`${fullSubname} is not available`);
    }
    console.log(`✓ ${fullSubname} is available`);

    // Step 2: Get quote
    console.log("Getting mint quote...");
    const details = await client.getMintDetails({
      parentName: config.parentName,
      label: config.label,
      minterAddress: config.minterAddress,
    });

    if (!details.canMint) {
      throw new Error(`Cannot mint: ${details.validationErrors.join(", ")}`);
    }

    const totalCost = details.estimatedPriceEth + details.estimatedFeeEth;
    console.log(`✓ Quote: ${totalCost} ETH`);

    // Step 3: Prepare transaction
    console.log("Preparing transaction...");
    const txParams = await client.getMintTransactionParameters({
      parentName: config.parentName,
      label: config.label,
      minterAddress: config.minterAddress,
      records: {
        texts: [{ key: "description", value: "My subname" }],
        addresses: [{ chain: "eth", value: config.minterAddress }],
      },
    });

    console.log(`✓ Transaction ready`);
    console.log(`  Contract: ${txParams.contractAddress}`);
    console.log(`  Value: ${formatEther(txParams.value)} ETH`);

    // Step 4: Execute (uncomment when ready)
    // const account = privateKeyToAccount("0x...");
    // const walletClient = createWalletClient({
    //   account,
    //   chain: baseSepolia,
    //   transport: http(),
    // });
    //
    // const hash = await walletClient.writeContract({
    //   address: txParams.contractAddress,
    //   abi: txParams.abi,
    //   functionName: txParams.functionName,
    //   args: txParams.args,
    //   value: txParams.value,
    // });
    //
    // console.log(`✓ Minted! Tx: ${hash}`);

  } catch (error) {
    console.error("Mint failed:", error);
  }
}

fullMintFlow();
```

## Example 7: Batch Availability Check

```typescript
import { createMintClient } from "@thenamespace/mint-manager";

async function batchCheck() {
  const client = createMintClient({ isTestnet: true });

  const parentName = "namespace.eth";
  const labels = ["alice", "bob", "charlie", "david", "eve"];

  console.log("Checking availability on Base Sepolia...\n");

  const results = await Promise.all(
    labels.map(async (label) => {
      const subname = `${label}.${parentName}`;
      const available = await client.isL2SubnameAvailable(subname, 84532);
      return { label, subname, available };
    })
  );

  results.forEach(({ subname, available }) => {
    const status = available ? "✓ Available" : "✗ Taken";
    console.log(`${status}: ${subname}`);
  });
}

batchCheck();
```
