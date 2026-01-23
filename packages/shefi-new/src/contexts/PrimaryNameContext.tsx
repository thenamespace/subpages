'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { L2_CHAIN_ID, BASE_REVERSE_NAMESPACE, PARENT_NAME } from '@/constants';

interface PrimaryNameContextType {
  primaryName: string | null;
  avatar: string | null;
  isLoading: boolean;
  refreshPrimaryName: (forceRefresh?: boolean) => Promise<void>;
}

const PrimaryNameContext = createContext<PrimaryNameContextType | undefined>(undefined);

const STORAGE_KEY = 'shefi_primary_name';
const AVATAR_STORAGE_KEY = 'shefi_primary_avatar';

interface PrimaryNameProviderProps {
  children: ReactNode;
}

export function PrimaryNameProvider({ children }: PrimaryNameProviderProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrimaryName = useCallback(
    async (forceRefresh = false) => {
      if (!address || !isConnected) {
        setPrimaryName(null);
        setAvatar(null);
        return;
      }

      setIsLoading(true);

      try {
        // Check localStorage first (unless force refresh)
        if (!forceRefresh) {
          const storedPrimaryName = localStorage.getItem(
            `${STORAGE_KEY}_${address.toLowerCase()}`
          );
          const storedAvatar = localStorage.getItem(
            `${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`
          );

          if (storedPrimaryName) {
            setPrimaryName(storedPrimaryName);
            if (storedAvatar) setAvatar(storedAvatar);
            setIsLoading(false);
            return;
          }
        }

        // Fetch primary name from Base L2 using getEnsName
        // Note: This uses the L2 reverse registrar namespace (80002105.reverse)
        if (publicClient) {
          try {
            // For Base L2, we need to query the reverse node directly
            // The reverse namespace is 80002105.reverse for Base
            const name = await publicClient.getEnsName({
              address,
              universalResolverAddress: '0xce01f8eee7E479C928F8919abD53E553a36CeF67', // Base Universal Resolver
            });

            if (name) {
              // Check if this is a shefi.eth subname
              if (name.endsWith(`.${PARENT_NAME}`)) {
                localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, name);
                setPrimaryName(name);

                // Try to fetch avatar
                try {
                  const avatarUrl = await publicClient.getEnsText({
                    name,
                    key: 'avatar',
                    universalResolverAddress: '0xce01f8eee7E479C928F8919abD53E553a36CeF67',
                  });
                  if (avatarUrl) {
                    localStorage.setItem(
                      `${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`,
                      avatarUrl
                    );
                    setAvatar(avatarUrl);
                  }
                } catch (e) {
                  console.error('Error fetching avatar:', e);
                  setAvatar(null);
                }
              } else {
                // Primary name exists but isn't a shefi.eth name
                setPrimaryName(null);
                setAvatar(null);
              }
            } else {
              setPrimaryName(null);
              setAvatar(null);
              localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
              localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${address.toLowerCase()}`);
            }
          } catch (e) {
            console.error('Error fetching ENS name:', e);
            setPrimaryName(null);
            setAvatar(null);
          }
        }
      } catch (error) {
        console.error('Error fetching primary name:', error);
        setPrimaryName(null);
        setAvatar(null);
      } finally {
        setIsLoading(false);
      }
    },
    [address, isConnected, publicClient]
  );

  const refreshPrimaryName = useCallback(
    async (forceRefresh = true) => {
      await fetchPrimaryName(forceRefresh);
    },
    [fetchPrimaryName]
  );

  // Fetch on mount and when address/connection changes
  useEffect(() => {
    fetchPrimaryName(false);
  }, [address, isConnected]);

  // Clean up on disconnect
  useEffect(() => {
    if (!isConnected) {
      setPrimaryName(null);
      setAvatar(null);
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
