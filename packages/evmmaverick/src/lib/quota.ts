import type { PublicClient } from "viem";
import { GATE_CONTRACT } from "./config";

/**
 * The 1-name-per-NFT rule.
 *
 * This is a UI lock and nothing more. Real enforcement lives in the Namespace
 * listing's token gate on-chain, which checks that the minter holds a gate
 * token — but it does NOT count how many names that wallet already minted.
 * So a determined user can exceed their quota by transferring a minted subname
 * to another wallet and minting again. We are not trying to stop that; we are
 * trying to stop an honest holder from burning gas on a mint they didn't mean
 * to make, and to make the remaining count legible.
 *
 *   remaining = max(0, balanceOf(wallet) - subnamesOwnedUnderParent)
 *
 * Reads FAIL CLOSED: any error leaves remaining at 0 with a retry, because a
 * silent pass-through here would let a non-holder reach a mint that reverts.
 */

export type QuotaStatus =
  | "idle"
  | "checking"
  | "ready"
  | "spent"
  | "no-token"
  | "error";

export interface Quota {
  status: QuotaStatus;
  /** Gate NFTs currently in the wallet. */
  held: number;
  /** Subnames under the parent this wallet already owns, incl. pending mints. */
  claimed: number;
  /** Clamped at zero — see the sell-after-minting case below. */
  remaining: number;
  /** Populated only when status is "error". */
  error?: string;
}

export const IDLE_QUOTA: Quota = {
  status: "idle",
  held: 0,
  claimed: 0,
  remaining: 0,
};

const erc721BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const INDEXER = "https://indexer.namespace.ninja/api/v1/nodes";

/** Gate NFTs held. Throws on RPC failure so the caller can fail closed. */
export async function readHeldCount(
  client: PublicClient,
  address: `0x${string}`,
): Promise<number> {
  const balance = (await client.readContract({
    abi: erc721BalanceAbi,
    address: GATE_CONTRACT,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;

  // Supply is ~1.3k, so this never approaches Number.MAX_SAFE_INTEGER. Clamp
  // anyway rather than trust a contract we don't control.
  return Number(balance > BigInt(10_000) ? BigInt(10_000) : balance);
}

/**
 * Subnames under the parent already owned by this wallet.
 *
 * Reads `totalItems`, not `items.length` — the indexer paginates at 25 and a
 * whale holding more than that would otherwise under-count and get free quota.
 */
export async function readClaimedCount(
  parentName: string,
  address: `0x${string}`,
): Promise<number> {
  const url = `${INDEXER}?owner=${address}&parentName=${encodeURIComponent(parentName)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Indexer returned ${res.status}`);
  }

  const data = await res.json();
  const total = data?.totalItems;

  if (typeof total !== "number" || Number.isNaN(total)) {
    throw new Error("Indexer returned an unexpected shape");
  }

  return total;
}

/**
 * Combine both reads into a quota.
 *
 * `pendingLocal` covers the gap between a successful mint and the indexer
 * catching up — without it the button unlocks again for the ten-odd seconds
 * before indexing, which is exactly when an impatient user clicks twice.
 */
export async function computeQuota(
  parentName: string,
  address: `0x${string}`,
  client: PublicClient,
  pendingLocal = 0,
): Promise<Quota> {
  let held: number;
  let indexed: number;

  try {
    // Parallel: the two reads are independent and both are on the critical
    // path to enabling the button.
    [held, indexed] = await Promise.all([
      readHeldCount(client, address),
      readClaimedCount(parentName, address),
    ]);
  } catch (err) {
    return {
      status: "error",
      held: 0,
      claimed: 0,
      remaining: 0,
      error:
        err instanceof Error
          ? err.message
          : "Couldn't verify your wallet right now",
    };
  }

  const claimed = indexed + pendingLocal;

  // Clamped, because `claimed` can legitimately exceed `held`: mint three
  // names, sell two NFTs, and you own three names against one token. The names
  // stay valid — they're yours — you just have no quota left.
  const remaining = Math.max(0, held - claimed);

  if (held === 0) {
    return { status: "no-token", held, claimed, remaining: 0 };
  }

  if (remaining === 0) {
    return { status: "spent", held, claimed, remaining };
  }

  return { status: "ready", held, claimed, remaining };
}
