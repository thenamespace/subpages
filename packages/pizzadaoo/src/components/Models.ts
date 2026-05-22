export interface Subname {
    expiry: number;
    label: string;
    name: string;
    texts: Record<string, string>;
    addresses: Record<string, string>;
    // Set by the indexer. "pizzadaoo-swap" marks a name produced by the
    // sponsored rename flow — used to enforce one swap per wallet.
    mintSource?: string;
  }