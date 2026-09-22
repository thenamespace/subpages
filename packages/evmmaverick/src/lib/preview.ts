import type { Quota } from "./quota";
import type { ListingResult } from "./listing";

/**
 * Design-review harness.
 *
 * Because we fail closed and `evmaverick.eth` has no Namespace listing yet,
 * every real wallet currently lands on "minting isn't open" — which makes the
 * happy path impossible to look at. `?preview=<state>` swaps in fixtures so
 * each screen can be reviewed without a listing, an NFT, or a wallet.
 *
 * Off in production unless NEXT_PUBLIC_ENABLE_PREVIEW is explicitly "true",
 * so it can be turned on for a staging deploy and stays off for real users.
 */

export const PREVIEW_STATES = [
  "not-listed",
  "checking",
  "no-token",
  "ready",
  "ready-multi",
  "spent",
  "error",
  "minting",
  "success",
] as const;

export type PreviewState = (typeof PREVIEW_STATES)[number];

export function isPreviewEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_PREVIEW === "true"
  );
}

export function parsePreviewState(value: string | null): PreviewState | null {
  if (!value || !isPreviewEnabled()) return null;
  return (PREVIEW_STATES as readonly string[]).includes(value)
    ? (value as PreviewState)
    : null;
}

const LISTED: ListingResult = {
  state: "listed",
  config: {
    whitelistType: 2,
    whitelistWallets: [],
    tokenGates: [
      {
        tokenType: "ERC721",
        tokenAddress: "0x7ddaa898d33d7ab252ea5f89f96717c47b2fee6e",
        tokenNetwork: "MAINNET",
      },
    ],
  },
};

export function previewListing(state: PreviewState): ListingResult {
  return state === "not-listed" ? { state: "not-listed" } : LISTED;
}

export function previewQuota(state: PreviewState): Quota {
  switch (state) {
    case "checking":
      return { status: "checking", held: 0, claimed: 0, remaining: 0 };
    case "no-token":
      return { status: "no-token", held: 0, claimed: 0, remaining: 0 };
    case "ready":
      return { status: "ready", held: 1, claimed: 0, remaining: 1 };
    case "ready-multi":
      return { status: "ready", held: 4, claimed: 1, remaining: 3 };
    case "minting":
    case "success":
      return { status: "ready", held: 3, claimed: 1, remaining: 2 };
    case "spent":
      // The sell-after-minting case: two names against one remaining token.
      return { status: "spent", held: 1, claimed: 2, remaining: 0 };
    case "error":
      return {
        status: "error",
        held: 0,
        claimed: 0,
        remaining: 0,
        error: "Indexer returned 503",
      };
    default:
      return { status: "idle", held: 0, claimed: 0, remaining: 0 };
  }
}
