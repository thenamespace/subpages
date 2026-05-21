// One-shot airdrop script for the burn-and-reissue test flow.
//
// Usage (from repo root or this package):
//   cd packages/pizzadaoo
//   node scripts/airdrop.mjs <label> [owner]
//
// Defaults:
//   owner = 0xd5Ba400e732b3d769aA75fc67649Ef4849774bb1
//   label = "happy"
//
// Reads WALLET_KEY, BASE_RPC_URL, NEXT_PUBLIC_ALCHEMY_KEY, PARENT_NAME from .env.

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  namehash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  ChainName,
  createMintClient,
} from "@namespacesdk/mint-manager";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "..", ".env") });

const argLabel = process.argv[2] || "happy";
const argOwner = process.argv[3] || "0xd5Ba400e732b3d769aA75fc67649Ef4849774bb1";

let WALLET_KEY = process.env.WALLET_KEY;
if (WALLET_KEY && !WALLET_KEY.startsWith("0x")) {
  WALLET_KEY = "0x" + WALLET_KEY;
}
const PARENT_NAME = process.env.PARENT_NAME || "enscomponent.eth";
const PARENT_REGISTRY_ADDRESS = process.env.PARENT_REGISTRY_ADDRESS;
const BASE_RPC =
  process.env.BASE_RPC_URL ||
  (process.env.NEXT_PUBLIC_ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
    : "https://mainnet.base.org");

if (!WALLET_KEY) {
  console.error("WALLET_KEY missing from .env");
  process.exit(1);
}
if (!isAddress(argOwner)) {
  console.error("owner is not a valid address:", argOwner);
  process.exit(1);
}

const account = privateKeyToAccount(WALLET_KEY);
const publicClient = createPublicClient({ transport: http(BASE_RPC), chain: base });
const walletClient = createWalletClient({ transport: http(BASE_RPC), chain: base, account });

const mintClient = createMintClient({
  mintSource: "pizzadaoo-airdrop",
  cursomRpcUrls: { [base.id]: BASE_RPC },
});

const label = argLabel.toLowerCase();

async function main() {
  console.log("Minting", `${label}.${PARENT_NAME}`, "→", argOwner);
  console.log("Sponsor (minter):", account.address);

  const available = await mintClient.isL2SubnameAvailable(
    `${label}.${PARENT_NAME}`,
    base.id,
  );
  if (!available) {
    console.error("That name is already taken. Pick another label.");
    process.exit(1);
  }

  const params = await mintClient.getMintTransactionParameters({
    minterAddress: account.address,
    label,
    parentName: PARENT_NAME,
    owner: argOwner,
    records: {
      texts: [
        {
          key: "avatar",
          value: "https://avatars.namespace.ninja/pizzadaoo.png",
        },
      ],
      addresses: [
        { value: argOwner, chain: ChainName.Ethereum },
        { value: argOwner, chain: ChainName.Base },
      ],
    },
  });

  // simulate first so we get a clean error if the contract will revert
  await publicClient.simulateContract({
    abi: params.abi,
    address: params.contractAddress,
    functionName: params.functionName,
    args: params.args,
    value: params.value,
    account,
  });

  // Explicit nonce avoids the "replacement transaction underpriced" race
  // when consecutive writeContract calls hit different Alchemy read replicas.
  const mintNonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  const tx = await walletClient.writeContract({
    abi: params.abi,
    address: params.contractAddress,
    functionName: params.functionName,
    args: params.args,
    value: params.value,
    nonce: mintNonce,
  });
  console.log("tx:", tx);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
  if (receipt.status !== "success") {
    console.error("tx reverted on-chain");
    process.exit(1);
  }
  console.log("✓ minted to sponsor (intermediate). Transferring to", argOwner);

  if (!PARENT_REGISTRY_ADDRESS) {
    console.error(
      "PARENT_REGISTRY_ADDRESS missing — cannot transfer. Add it to .env (it's already in .env.example).",
    );
    process.exit(1);
  }

  // The token id on the child ERC-721 registry is uint256(namehash(fullName)).
  const tokenId = BigInt(namehash(`${label}.${PARENT_NAME}`));
  const transferAbi = [
    {
      type: "function",
      name: "transferFrom",
      stateMutability: "nonpayable",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
      ],
      outputs: [],
    },
  ];

  // Retry simulate briefly — Alchemy's read replica can lag the mint receipt,
  // causing a spurious ERC721NonexistentToken (0x7e273289) on the first try.
  for (let i = 0; i < 5; i++) {
    try {
      await publicClient.simulateContract({
        abi: transferAbi,
        address: PARENT_REGISTRY_ADDRESS,
        functionName: "transferFrom",
        args: [account.address, argOwner, tokenId],
        account,
      });
      break;
    } catch (err) {
      if (i === 4) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const transferTx = await walletClient.writeContract({
    abi: transferAbi,
    address: PARENT_REGISTRY_ADDRESS,
    functionName: "transferFrom",
    args: [account.address, argOwner, tokenId],
    nonce: mintNonce + 1,
  });
  console.log("transfer tx:", transferTx);

  const transferReceipt = await publicClient.waitForTransactionReceipt({
    hash: transferTx,
    confirmations: 1,
  });
  if (transferReceipt.status !== "success") {
    console.error("transfer reverted on-chain");
    process.exit(1);
  }
  console.log(`✓ airdropped ${label}.${PARENT_NAME} -> ${argOwner}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
