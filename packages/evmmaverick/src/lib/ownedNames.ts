import { PARENT_NAME } from "./config";

/** A subname the connected wallet owns under the parent. */
export interface OwnedName {
  name: string;
  label: string;
  texts?: Record<string, string>;
  /** Chain the name was minted on: 1 for mainnet ENS, 8453 for Base L2. */
  chainId: number;
}

interface IndexerNode {
  name?: string;
  label?: string;
  texts?: Record<string, string>;
  chainId?: number;
}

const INDEXER = "https://indexer.namespace.ninja/api/v1/nodes";

/**
 * Names this wallet owns under the parent, for the manage list.
 *
 * Pages through the indexer rather than reading the first 25, so someone
 * holding a lot of names can still reach the last one.
 */
export async function fetchOwnedNames(
  address: `0x${string}`,
): Promise<OwnedName[]> {
  const out: OwnedName[] = [];
  const pageSize = 25;

  for (let page = 1; page <= 20; page++) {
    const url = `${INDEXER}?owner=${address}&parentName=${encodeURIComponent(
      PARENT_NAME,
    )}&page=${page}&pageSize=${pageSize}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Indexer returned ${res.status}`);

    const data = await res.json();
    const items: IndexerNode[] = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const name = item.name ?? (item.label ? `${item.label}.${PARENT_NAME}` : null);
      if (!name) continue;
      out.push({
        name,
        label: item.label ?? name.split(".")[0],
        texts: item.texts,
        chainId: item.chainId ?? 1,
      });
    }

    // Last page: either short, or we've collected everything it reported.
    if (items.length < pageSize) break;
    if (typeof data?.totalItems === "number" && out.length >= data.totalItems) {
      break;
    }
  }

  return out;
}
