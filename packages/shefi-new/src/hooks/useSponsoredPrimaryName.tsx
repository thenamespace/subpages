'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { type Hash, type Hex } from 'viem';
import { constructMessageHash, getSignatureExpiry, sponsorSetPrimaryName } from '@/lib/sponsor';

export function useSponsoredPrimaryName() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setTxHash(null);
  }, []);

  const setPrimaryName = useCallback(
    async (name: string): Promise<Hash> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const signatureExpiry = getSignatureExpiry();
        const messageHash = constructMessageHash(address, name, signatureExpiry);

        // Sign with personal_sign (EIP-191) — wallet signs the raw bytes of the hash
        const signature = await signMessageAsync({
          message: { raw: messageHash as Hex },
        });

        // Submit to server for sponsored transaction
        const result = await sponsorSetPrimaryName({
          addr: address,
          name,
          signatureExpiry,
          signature: signature as Hex,
        });

        const hash = result.tx as Hash;
        setTxHash(hash);
        return hash;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set primary name';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, signMessageAsync]
  );

  return { setPrimaryName, isLoading, error, txHash, reset };
}
