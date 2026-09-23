import type { Address } from "viem";
import { base, mainnet } from "viem/chains";
import { PARENT_NAME } from "./config";
import { getListing } from "./listing";

/**
 * Where the parent's subnames actually live, resolved from the listing.
 *
 * - L1 listing: plain mainnet ENS subnames. The records editor finds the
 *   resolver through the ENS registry itself, so no resolver is returned.
 * - L2 listing on Base: subnames are minted into Namespace's Base registry and
 *   never exist in the mainnet ENS registry (it returns the zero resolver for
 *   them). Records are read and written on Namespace's Base resolver directly.
 *
 * The Base address mirrors `getL2NamespaceContracts(8453).resolver` in the
 * Namespace SDKs, which don't export it. Verified on Base (2026-09-23): it
 * implements text/addr and `multicall`, and rejects writes from non-owners.
 */
const BASE_L2_RESOLVER: Address = "0x32d63B83BBA5a25f1f8aE308d7fd1F3c0b1abfA6";

export interface NameChain {
  chain: typeof mainnet | typeof base;
  /** Set when the resolver can't be found through mainnet ENS. */
  resolver?: Address;
}

export const L1_NAME_CHAIN: NameChain = { chain: mainnet };

const BASE_NAME_CHAIN: NameChain = { chain: base, resolver: BASE_L2_RESOLVER };

/**
 * For a name that already exists, from the chain id the indexer recorded when
 * it was minted. Preferred over the listing for existing names: a listing can
 * be paused or removed, but the name stays where it was minted.
 */
export function nameChainFor(chainId: number): NameChain {
  return chainId === base.id ? BASE_NAME_CHAIN : L1_NAME_CHAIN;
}

/**
 * Throws when the listing can't be read, so callers pick their own fallback:
 * minting can safely default to mainnet (the SDK pre-flight blocks a bad
 * mint), while the records editor should surface the error instead.
 */
export async function resolveNameChain(): Promise<NameChain> {
  const listing = await getListing(PARENT_NAME);
  if (listing.state === "error") throw new Error(listing.message);
  if (listing.state === "listed" && listing.config.type === "L2") {
    if (listing.config.l2RegistryNetwork === "BASE") {
      return BASE_NAME_CHAIN;
    }
    throw new Error(
      `Unsupported registry network: ${listing.config.l2RegistryNetwork}`,
    );
  }
  return L1_NAME_CHAIN;
}
