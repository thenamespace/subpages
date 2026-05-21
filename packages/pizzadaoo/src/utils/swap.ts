import {
  Address,
  Hex,
  encodePacked,
  keccak256,
} from "viem";

export interface SwapRecords {
  texts?: { key: string; value: string }[];
  addresses?: { coinType: number; value: string }[];
}

export interface SwapRequest {
  owner: Address;
  oldNode: Hex;          // namehash(oldFullName)
  oldFullName: string;   // e.g. "alice.enscomponent.eth"
  newLabel: string;      // e.g. "bob"
  expiry: string;        // bigint as decimal string
  signature: Hex;
  records?: SwapRecords;
}

export interface SwapResponse {
  burnTx: Hex;
  mintTx: Hex;
  name: string;
}

const SWAP_CHAIN_ID = 8453; // Base mainnet

/**
 * Builds the message hash the user signs. Mirrors shefi-new's constructMintMessageHash
 * but covers the burn+mint pair so a leaked signature can't be repurposed for a
 * different name or chain.
 */
export function constructSwapMessageHash(
  owner: Address,
  oldNode: Hex,
  oldFullName: string,
  newLabel: string,
  expiry: bigint,
): Hex {
  return keccak256(
    encodePacked(
      ["address", "bytes32", "string", "string", "uint256", "uint256"],
      [owner, oldNode, oldFullName, newLabel, BigInt(SWAP_CHAIN_ID), expiry],
    ),
  );
}

/** 5-minute expiry, same window as the existing sponsored flows. */
export function getSwapExpiry(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 300);
}

export async function submitSwap(body: SwapRequest): Promise<SwapResponse> {
  const res = await fetch("/api/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Swap failed");
  }
  return data as SwapResponse;
}
