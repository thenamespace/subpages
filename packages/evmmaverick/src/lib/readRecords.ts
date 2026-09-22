import { namehash, type PublicClient } from "viem";
import type { FormRecords } from "./records";

/**
 * Reads a name's current records so the editor can show them.
 *
 * The library's form is write-only — it diffs against whatever you hand it and
 * submits the difference — so if these come back empty the user sees a blank
 * form and "saving" would wipe records that were already set. That makes this
 * read load-bearing, not cosmetic, and it's why a failure here surfaces as an
 * error instead of an empty form.
 *
 * One resolver lookup, then a single multicall for every key at once.
 */

/** Text keys the ENS manager and most wallets surface. */
export const TEXT_KEYS = [
  "avatar",
  "header",
  "description",
  "display",
  "email",
  "url",
  "location",
  "notice",
  "keywords",
  "com.twitter",
  "com.github",
  "com.discord",
  "org.telegram",
] as const;

/** Coin types worth showing by default. 60 is ETH (ENSIP-9). */
export const COIN_TYPES = [
  60, // Ethereum
  2147492101, // Base
  2147483658, // Optimism
  2147525809, // Arbitrum
  0, // Bitcoin
] as const;

const resolverAbi = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinType", type: "uint256" },
    ],
    outputs: [{ type: "bytes" }],
  },
] as const;

export async function readRecords(
  client: PublicClient,
  name: string,
): Promise<FormRecords> {
  const resolver = await client.getEnsResolver({ name });
  if (!resolver) {
    // No resolver means there is nothing to read and nothing to diff against.
    return { texts: [], addresses: [] };
  }

  const node = namehash(name);

  const calls = [
    ...TEXT_KEYS.map((key) => ({
      address: resolver,
      abi: resolverAbi,
      functionName: "text" as const,
      args: [node, key] as const,
    })),
    ...COIN_TYPES.map((coinType) => ({
      address: resolver,
      abi: resolverAbi,
      functionName: "addr" as const,
      args: [node, BigInt(coinType)] as const,
    })),
  ];

  // allowFailure keeps one unsupported key from voiding the whole read — an
  // older resolver may not implement every method.
  const results = await client.multicall({ contracts: calls, allowFailure: true });

  const texts: { key: string; value: string }[] = [];
  TEXT_KEYS.forEach((key, i) => {
    const r = results[i];
    if (r.status === "success" && typeof r.result === "string" && r.result) {
      texts.push({ key, value: r.result });
    }
  });

  const addresses: { coinType: number; value: string }[] = [];
  COIN_TYPES.forEach((coinType, i) => {
    const r = results[TEXT_KEYS.length + i];
    if (r.status !== "success") return;
    const raw = r.result;
    // `addr` returns empty bytes for unset, which is not the same as 0x0.
    if (typeof raw !== "string" || raw === "0x" || raw.length <= 2) return;
    addresses.push({ coinType, value: raw });
  });

  return { texts, addresses };
}
