/**
 * Reads the parent name's listing config from Namespace's list-manager so the
 * UI can tell a visitor whether minting is open *before* they type a name.
 *
 * Note the failure shape: list-manager answers 200 with an empty body when a
 * name has no listing at all. That is not an error, it means "not listed yet",
 * and it is the state `evmaverick.eth` is in today.
 */

export type TokenGateNetwork = "MAINNET" | "BASE";

export interface TokenGate {
  tokenType: "ERC721" | "ERC1155" | string;
  tokenAddress: `0x${string}`;
  tokenNetwork: TokenGateNetwork;
}

export interface ListingConfig {
  /** 1 = address whitelist, 2 = verified minter (paired with tokenGates). */
  whitelistType: number | null;
  /** Lower-cased for cheap comparison. */
  whitelistWallets: string[];
  tokenGates: TokenGate[];
}

export type ListingResult =
  | { state: "listed"; config: ListingConfig }
  | { state: "not-listed" }
  | { state: "error"; message: string };

const LIST_MANAGER =
  "https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/";

let cached: ListingResult | null = null;
let inFlight: Promise<ListingResult> | null = null;

export async function getListing(parentName: string): Promise<ListingResult> {
  // Only "listed" and "not-listed" are cached. Errors are transient by
  // definition — caching them would strand the page on a blocked state until
  // reload, which matters a lot given we fail closed.
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<ListingResult> => {
    try {
      const res = await fetch(LIST_MANAGER + encodeURIComponent(parentName));

      if (!res.ok) {
        return { state: "error", message: `list-manager returned ${res.status}` };
      }

      const text = await res.text();
      if (!text.trim()) {
        cached = { state: "not-listed" };
        return cached;
      }

      const data = JSON.parse(text);
      cached = {
        state: "listed",
        config: {
          whitelistType: data?.whitelist?.type ?? null,
          whitelistWallets: (data?.whitelist?.wallets ?? []).map((a: string) =>
            a.toLowerCase(),
          ),
          tokenGates: data?.tokenGatedAccess ?? [],
        },
      };
      return cached;
    } catch (err) {
      return {
        state: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Test seam — the preview harness resets the module cache between states. */
export function __resetListingCache() {
  cached = null;
  inFlight = null;
}
