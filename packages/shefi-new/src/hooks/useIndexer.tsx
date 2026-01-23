'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { INDEXER_URL, PARENT_NAME, L2_CHAIN_ID } from '@/constants';
import { IndexerSubname, SubnamePagedResponse } from '@/types/indexer';

export function useIndexer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all names owned by an address
   */
  const getOwnerNames = useCallback(async (ownerAddress: string): Promise<IndexerSubname[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<SubnamePagedResponse>(
        `${INDEXER_URL}/subnames`,
        {
          params: {
            network: 'base',
            parentName: PARENT_NAME,
            owner: ownerAddress,
            pageSize: 100,
          },
        }
      );

      return response.data.items || [];
    } catch (err) {
      console.error('Error fetching owner names:', err);
      setError('Failed to fetch names');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a single name by its label
   */
  const getNameByLabel = useCallback(async (label: string): Promise<IndexerSubname | null> => {
    setLoading(true);
    setError(null);

    try {
      const fullName = `${label}.${PARENT_NAME}`;
      const response = await axios.get<IndexerSubname>(
        `${INDEXER_URL}/subname`,
        {
          params: {
            network: 'base',
            name: fullName,
          },
        }
      );

      return response.data || null;
    } catch (err: any) {
      // 404 means name doesn't exist, not an error
      if (err.response?.status === 404) {
        return null;
      }
      console.error('Error fetching name:', err);
      setError('Failed to fetch name');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all subnames with pagination
   */
  const getSubnames = useCallback(
    async (page = 1, pageSize = 50): Promise<{ items: IndexerSubname[]; hasMore: boolean }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<SubnamePagedResponse>(
          `${INDEXER_URL}/subnames`,
          {
            params: {
              network: 'base',
              parentName: PARENT_NAME,
              page,
              pageSize,
            },
          }
        );

        const items = response.data.items || [];
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
    []
  );

  /**
   * Check if a subname is available (not taken)
   */
  const checkAvailability = useCallback(async (label: string): Promise<boolean> => {
    try {
      const name = await getNameByLabel(label);
      return name === null;
    } catch {
      // If we can't check, assume it's not available for safety
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
