'use client';

import { useState, useCallback, useMemo } from 'react';
import { createIndexerClient, L2SubnameResponse } from '@thenamespace/indexer';
import { PARENT_NAME, L2_CHAIN_ID } from '@/constants';
import { IndexerSubname } from '@/types/indexer';

export function useIndexer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => createIndexerClient(), []);

  // Helper to map SDK response to IndexerSubname
  const mapResponseToSubname = useCallback((item: L2SubnameResponse): IndexerSubname => {
    return {
      name: item.name,
      namehash: item.namehash,
      label: item.name.split('.')[0], // Safe assumption for 2-level names
      parentNamehash: item.parentHash,
      owner: item.owner,
      texts: item.records.texts || {},
      addresses: item.records.addresses || {},
      contenthash: item.records.contenthash,
      chainId: item.chainId,
      expiry: item.expiry,
      mintTransaction: item.metadata ? {
        price: item.metadata.price,
        paymentReceiver: '0x0000000000000000000000000000000000000000', // Default if not provided
      } : undefined
    };
  }, []);

  /**
   * Get all names owned by an address
   */
  const getOwnerNames = useCallback(async (ownerAddress: string): Promise<IndexerSubname[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.getL2Subnames({
        chainId: L2_CHAIN_ID,
        parent: PARENT_NAME,
        owner: ownerAddress,
        size: 100,
      });

      return (response.items || []).map(mapResponseToSubname);
    } catch (err) {
      console.error('Error fetching owner names:', err);
      setError('Failed to fetch names');
      return [];
    } finally {
      setLoading(false);
    }
  }, [client, mapResponseToSubname]);

  /**
   * Get a single name by its label
   */
  const getNameByLabel = useCallback(async (label: string): Promise<IndexerSubname | null> => {
    setLoading(true);
    setError(null);

    const fullName = `${label}.${PARENT_NAME}`;

    try {
      const response = await client.getL2Subname({
        chainId: L2_CHAIN_ID,
        nameOrNamehash: fullName,
      });

      return mapResponseToSubname(response);
    } catch (err: any) {
      // 404 means name doesn't exist
      if (err.response?.status === 404 || err.status === 404) {
        return null;
      }
      console.error('Error fetching name:', err);
      setError('Failed to fetch name');
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, mapResponseToSubname]);

  /**
   * Get all subnames with pagination
   */
  const getSubnames = useCallback(
    async (page = 0, pageSize = 50): Promise<{ items: IndexerSubname[]; hasMore: boolean }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await client.getL2Subnames({
          chainId: L2_CHAIN_ID,
          parent: PARENT_NAME,
          page,
          size: pageSize,
        });

        const items = (response.items || []).map(mapResponseToSubname);
        const hasMore = items.length === pageSize;

        return { items, hasMore };
      } catch (err) {
        console.error('Error fetching subnames:', err);
        setError('Failed to fetch subnames');
        return { items: [], hasMore: false };
      } finally {
        setLoading(false);
      }
    },
    [client, mapResponseToSubname]
  );

  /**
   * Check if a subname is available (not taken)
   */
  const checkAvailability = useCallback(async (label: string): Promise<boolean> => {
    try {
      const name = await getNameByLabel(label);
      return name === null;
    } catch {
      return false;
    }
  }, [getNameByLabel]);

  return {
    loading,
    error,
    getOwnerNames,
    getNameByLabel,
    getSubnames,
    checkAvailability,
  };
}
