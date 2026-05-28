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
// Mints the subname DIRECTLY to <owner> by calling the mint-manager API with
// an explicit `owner` field — no mint-to-sponsor-then-transfer, so the
// Namespace indexer records the right owner immediately.
//
// Reads WALLET_KEY, BASE_RPC_URL, NEXT_PUBLIC_ALCHEMY_KEY, NEXT_PUBLIC_PARENT_NAME from .env.

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import axios from "axios";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  namehash,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ChainName } from "@namespacesdk/mint-manager";
import { convertEnsRecordsToResolverData } from "@namespacesdk/mint-manager/dist/utils.js";

const MINT_MANAGER_API =
  "https://mint-manager.namespace.ninja/api/v1/minting-parameters";
const L2_MINT_CONTROLLER = "0xa8e61891626f86ae6397217823701183de947c7d";

const mintAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      {
        name: "context",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "label", type: "string" },
          { name: "parentNode", type: "bytes32" },
          { name: "price", type: "uint256" },
          { name: "fee", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
          { name: "expiry", type: "uint256" },
          { name: "signatureExpiry", type: "uint256" },
          { name: "verifiedMinter", type: "address" },
        ],
      },
      { name: "signature", type: "bytes" },
      { name: "resolverData", type: "bytes[]" },
      { name: "extraData", type: "bytes" },
    ],
    outputs: [],
  },
];

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "..", ".env") });

const argLabel = process.argv[2] || "happy";
const argOwner = process.argv[3] || "0xd5Ba400e732b3d769aA75fc67649Ef4849774bb1";

let WALLET_KEY = process.env.WALLET_KEY;
if (WALLET_KEY && !WALLET_KEY.startsWith("0x")) {
  WALLET_KEY = "0x" + WALLET_KEY;
}
const PARENT_NAME = process.env.NEXT_PUBLIC_PARENT_NAME || "pizzaday.eth";
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

const label = argLabel.toLowerCase();

async function main() {
  console.log("Minting", `${label}.${PARENT_NAME}`, "→", argOwner);
  console.log("Sponsor (minter):", account.address);

  // Ask the mint-manager API for signed params, owner = the recipient.
  const { data } = await axios.post(MINT_MANAGER_API, {
    label,
    parentName: PARENT_NAME,
    minterAddress: account.address,
    owner: argOwner,
    expiryInYears: 1,
  });
  const { content, signature } = data;

  if (content.owner.toLowerCase() !== argOwner.toLowerCase()) {
    console.error("API did not honor owner; got", content.owner);
    process.exit(1);
  }

  const fullName = `${label}.${PARENT_NAME}`;

  // ENSIP-19 default-address coinType: any EVM chain that isn't otherwise
  // listed will fall through to this record. 0x80000000 | 0 = 2147483648.
  const ENSIP19_DEFAULT_COIN_TYPE = 2147483648;

  // Texts: just set `name` to the subname itself for now. Add more entries
  // here (e.g. avatar, description, url, com.twitter, com.github) if you want
  // the airdropped name to ship with a richer profile.
  const texts = [{ key: "name", value: fullName }];

  const resolverData = convertEnsRecordsToResolverData(fullName, {
    texts,
    addresses: [
      { value: argOwner, chain: ChainName.Ethereum },
      { value: argOwner, chain: ChainName.Base },
      // ENSIP-19 default address — fallback for any EVM chain not listed above.
      { value: argOwner, chain: ENSIP19_DEFAULT_COIN_TYPE },
    ],
  });

  console.log(
    `  records: name="${fullName}", addr(eth/base/default)=${argOwner}`,
  );
  console.log(
    "  (extend `texts` in scripts/airdrop.mjs to add avatar/description/url/socials)",
  );

  const mintArgs = [content, signature, resolverData, toHex("pizzadaoo-airdrop")];
  const value = BigInt(content.fee) + BigInt(content.price);

  // simulate first so we get a clean revert reason before broadcasting
  await publicClient.simulateContract({
    abi: mintAbi,
    address: L2_MINT_CONTROLLER,
    functionName: "mint",
    args: mintArgs,
    value,
    account,
  });

  // Pad gas 50% — the mint's internal resolver calls can be starved by the
  // EIP-150 63/64 rule if we send only the bare estimate.
  const gasEstimate = await publicClient.estimateContractGas({
    abi: mintAbi,
    address: L2_MINT_CONTROLLER,
    functionName: "mint",
    args: mintArgs,
    value,
    account,
  });
  const tx = await walletClient.writeContract({
    abi: mintAbi,
    address: L2_MINT_CONTROLLER,
    functionName: "mint",
    args: mintArgs,
    value,
    gas: (gasEstimate * 3n) / 2n,
  });
  console.log("tx:", tx);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: tx,
    confirmations: 1,
  });
  if (receipt.status !== "success") {
    console.error("tx reverted on-chain");
    process.exit(1);
  }

  // sanity check: the NFT should be owned by the recipient straight away
  const tokenId = BigInt(namehash(`${label}.${PARENT_NAME}`));
  console.log(`✓ airdropped ${label}.${PARENT_NAME} -> ${argOwner}`);
  console.log("  tokenId:", tokenId.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
