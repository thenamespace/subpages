/**
 * Fetch + cache list-manager listing config so we can show eligibility
 * upfront — before the user submits a mint that's destined to revert with
 * `MINTER_NOT_WHITELISTED` or `MINTER_NOT_TOKEN_OWNER`.
 */

export type TokenGateNetwork = "MAINNET" | "BASE";

export interface TokenGate {
  tokenType: "ERC721" | "ERC1155" | string;
  tokenAddress: `0x${string}`;
  tokenNetwork: TokenGateNetwork;
}

export interface ListingGate {
  /** 1 = address whitelist, 2 = verifiedMinter (signature-based, paired with tokenGates) */
  whitelistType: number | null;
  /** Lower-cased addresses for cheap comparison. */
  whitelistWallets: string[];
  tokenGates: TokenGate[];
}

const LIST_MANAGER =
  "https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/";

const cache = new Map<string, ListingGate | null>();
const inFlight = new Map<string, Promise<ListingGate | null>>();

export async function getListingGate(
  parentName: string,
): Promise<ListingGate | null> {
  if (cache.has(parentName)) return cache.get(parentName) ?? null;

  const pending = inFlight.get(parentName);
  if (pending) return pending;

  const p = (async () => {
    try {
      const res = await fetch(LIST_MANAGER + encodeURIComponent(parentName));
      if (!res.ok) {
        cache.set(parentName, null);
        return null;
      }
      const text = await res.text();
      if (!text) {
        cache.set(parentName, null);
        return null;
      }
      const data = JSON.parse(text);
      const gate: ListingGate = {
        whitelistType: data?.whitelist?.type ?? null,
        whitelistWallets: (data?.whitelist?.wallets ?? []).map((a: string) =>
          a.toLowerCase(),
        ),
        tokenGates: data?.tokenGatedAccess ?? [],
      };
      cache.set(parentName, gate);
      return gate;
    } catch {
      cache.set(parentName, null);
      return null;
    } finally {
      inFlight.delete(parentName);
    }
  })();

  inFlight.set(parentName, p);
  return p;
}
