// Types for Namespace Indexer API responses

export interface IndexerSubname {
  name: string;
  namehash: string;
  label: string;
  parentNamehash: string;
  owner: string;
  texts: Record<string, string>;
  addresses: Record<string, string>;
  contenthash?: string;
  chainId: number;
  expiry: number;
  mintTransaction?: {
    price: number;
    paymentReceiver: string;
  };
}

export interface IndexerPagedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
}

export type SubnamePagedResponse = IndexerPagedResponse<IndexerSubname>;

// ENS Records format for @thenamespace/ens-components
export interface EnsTextRecord {
  key: string;
  value: string;
}

export interface EnsAddressRecord {
  coin: string;
  value: string;
  name?: string;
}

export interface EnsContenthashRecord {
  codec: string;
  decoded: string;
  encoded: string;
}

export interface EnsRecords {
  texts: EnsTextRecord[];
  addresses: EnsAddressRecord[];
  contenthash?: EnsContenthashRecord;
}

// Convert indexer data to EnsRecords format
export function indexerToEnsRecords(subname: IndexerSubname): EnsRecords {
  const texts: EnsTextRecord[] = Object.entries(subname.texts || {}).map(
    ([key, value]) => ({ key, value })
  );

  const addresses: EnsAddressRecord[] = Object.entries(
    subname.addresses || {}
  ).map(([coin, value]) => ({ coin, value }));

  return {
    texts,
    addresses,
    contenthash: subname.contenthash
      ? {
          codec: 'unknown',
          decoded: subname.contenthash,
          encoded: subname.contenthash,
        }
      : undefined,
  };
}

// Helper to get avatar from subname
export function getAvatarFromSubname(subname: IndexerSubname): string | null {
  return subname.texts?.avatar || null;
}

// Helper to format expiry date
export function formatExpiry(expiryTimestamp: number): string {
  if (!expiryTimestamp || expiryTimestamp === 0) {
    return 'No expiry';
  }
  const date = new Date(expiryTimestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper to check if name is expired
export function isExpired(expiryTimestamp: number): boolean {
  if (!expiryTimestamp || expiryTimestamp === 0) {
    return false;
  }
  return Date.now() > expiryTimestamp * 1000;
}
