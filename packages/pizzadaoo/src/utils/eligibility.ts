import type { PublicClient } from "viem";
import {
  getListingGate,
  type ListingGate,
  type TokenGate,
} from "./listingConfig";

export type EligibilityStatus =
  | "idle"
  | "checking"
  | "eligible"
  | "ineligible"
  | "unknown";

export interface EligibilityResult {
  status: EligibilityStatus;
  /** Short, hint-row-sized reason. Detailed copy belongs in instructionText. */
  reason?: string;
}

const erc721BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

/**
 * Friendly names for known gate tokens. Used in the hint row when telling
 * the user which NFT they need to hold. Extend as new listings ship.
 */
const KNOWN_TOKENS: Record<string, { name: string }> = {
  // Rare Pizzas Box — pizzamafia.eth gate
  "0x4ae57798aef4af99ed03818f83d2d8aca89952c7": { name: "Rare Pizzas Box" },
};

function tokenLabel(address: string) {
  return (
    KNOWN_TOKENS[address.toLowerCase()] ?? {
      name: `${address.slice(0, 6)}…${address.slice(-4)}`,
    }
  );
}

async function ownsAny(
  gates: TokenGate[],
  address: `0x${string}`,
  clients: { mainnet?: PublicClient; base?: PublicClient },
): Promise<boolean> {
  for (const g of gates) {
    const client =
      g.tokenNetwork === "MAINNET" ? clients.mainnet : clients.base;
    if (!client) continue;
    try {
      const balance = (await client.readContract({
        abi: erc721BalanceAbi,
        address: g.tokenAddress,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      if (balance > BigInt(0)) return true;
    } catch {
      // Treat read failures as inconclusive — let the loop continue, but
      // don't pretend the user holds the token.
    }
  }
  return false;
}

export async function checkEligibility(
  parentName: string,
  address: `0x${string}` | undefined,
  clients: { mainnet?: PublicClient; base?: PublicClient },
): Promise<EligibilityResult> {
  if (!address) return { status: "idle" };

  const gate: ListingGate | null = await getListingGate(parentName);

  // No listing info from list-manager — treat as not open for direct mint.
  // pizzadao.eth currently lands here: list-manager returns 200 with empty
  // body, which lines up with the existing "ask a Capo or DPR" instruction.
  if (!gate) {
    return { status: "ineligible", reason: "Direct mint isn't open" };
  }

  const hasWhitelist = gate.whitelistWallets.length > 0;
  const hasTokenGate = gate.tokenGates.length > 0;

  // Type 1 — pure address whitelist (e.g., rarepizzas.eth, enscomponent.eth).
  if (gate.whitelistType === 1 && hasWhitelist) {
    const isWhitelisted = gate.whitelistWallets.includes(
      address.toLowerCase(),
    );
    if (isWhitelisted) return { status: "eligible" };
    return {
      status: "ineligible",
      reason: "Your wallet isn't on the allowlist",
    };
  }

  // Type 2 (or otherwise) with a token gate — verifiedMinter pattern.
  // Anyone holding any gate token can mint.
  if (hasTokenGate) {
    const owns = await ownsAny(gate.tokenGates, address, clients);
    if (owns) return { status: "eligible" };
    const { name } = tokenLabel(gate.tokenGates[0].tokenAddress);
    return {
      status: "ineligible",
      reason: `You need a ${name} in this wallet`,
    };
  }

  // No gates documented — open mint.
  return { status: "eligible" };
}
