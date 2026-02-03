'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAccount, usePublicClient, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { L2_CHAIN_ID, PARENT_NAME } from '@/constants';

interface PrimaryNameContextType {
  primaryName: string | null;
  avatar: string | null;
  isLoading: boolean;
  refreshPrimaryName: (forceRefresh?: boolean) => Promise<void>;
}

const PrimaryNameContext = createContext<PrimaryNameContextType | undefined>(undefined);

const AVATAR_STORAGE_KEY = 'shefi_primary_avatar';

interface PrimaryNameProviderProps {
  children: ReactNode;
}

export function PrimaryNameProvider({ children }: PrimaryNameProviderProps) {
  const { address, isConnected } = useAccount();
  const baseClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const [avatar, setAvatar] = useState<string | null>(null);
  const [lastFetchedAddress, setLastFetchedAddress] = useState<string | null>(null);

  // Resolve the standard L1 ENS primary name (default reverse record)
  const { data: ensName, isLoading, refetch } = useEnsName({
    address: address,
    chainId: mainnet.id,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Filter to only shefi.eth subnames
  const primaryName = ensName && ensName.endsWith(`.${PARENT_NAME}`) ? ensName : null;

  // Fetch avatar when primary name changes
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!primaryName || !baseClient) {
        setAvatar(null);
        return;
      }

      // Only fetch if we haven't already for this address
      const addressKey = address?.toLowerCase() || '';
      if (lastFetchedAddress === addressKey) {
        return;
      }

      try {
        // Check localStorage first
        const storedAvatar = localStorage.getItem(`${AVATAR_STORAGE_KEY}_${addressKey}`);
        if (storedAvatar) {
          setAvatar(storedAvatar);
          setLastFetchedAddress(addressKey);
          return;
        }

        // Fetch avatar text record from Base L2
        const avatarUrl = await baseClient.getEnsText({
          name: primaryName,
          key: 'avatar',
          universalResolverAddress: '0xce01f8eee7E479C928F8919abD53E553a36CeF67',
        });
        if (avatarUrl) {
          localStorage.setItem(`${AVATAR_STORAGE_KEY}_${addressKey}`, avatarUrl);
          setAvatar(avatarUrl);
        } else {
          setAvatar(null);
        }
        setLastFetchedAddress(addressKey);
      } catch (e) {
        console.error('Error fetching avatar:', e);
        setAvatar(null);
        setLastFetchedAddress(addressKey);
      }
    };

    fetchAvatar();
  }, [primaryName, address, baseClient, lastFetchedAddress]);

  const refreshPrimaryName = useCallback(
    async (forceRefresh = true) => {
      if (forceRefresh) {
        // Clear cached avatar
        if (address) {
          localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`);
        }
        setLastFetchedAddress(null);
      }
      await refetch();
    },
    [refetch, address]
  );

  // Clean up on disconnect
  useEffect(() => {
    if (!isConnected) {
      setAvatar(null);
      setLastFetchedAddress(null);
    }
  }, [isConnected]);

  return (
    <PrimaryNameContext.Provider
      value={{ primaryName, avatar, isLoading, refreshPrimaryName }}
    >
      {children}
    </PrimaryNameContext.Provider>
  );
}

export function usePrimaryName() {
  const context = useContext(PrimaryNameContext);
  if (context === undefined) {
    throw new Error('usePrimaryName must be used within a PrimaryNameProvider');
  }
  return context;
}
