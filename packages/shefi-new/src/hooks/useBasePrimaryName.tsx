'use client';

import { useCallback } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { Hash } from 'viem';
import { L2_CHAIN_ID, BASE_REVERSE_REGISTRAR, REVERSE_REGISTRAR_ABI } from '@/constants';

export function useBasePrimaryName() {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const isOnTargetChain = chain?.id === L2_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L2_CHAIN_ID });
    }
  }, [isOnTargetChain, switchChainAsync]);

  /**
   * Sets the primary name (reverse record) for the connected address on Base L2
   * @param name The ENS name to set as primary (e.g., "myname.shefi.eth")
   * @returns Transaction hash
   */
  const setName = useCallback(
    async (name: string): Promise<Hash> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const hash = await walletClient.writeContract({
        address: BASE_REVERSE_REGISTRAR,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        chain: base,
      });

      return hash;
    },
    [walletClient, address, isOnTargetChain, switchToTargetChain]
  );

  /**
   * Simulates the setName transaction to check for errors
   */
  const simulateSetName = useCallback(
    async (name: string) => {
      if (!publicClient || !address) {
        throw new Error('Client not available');
      }

      return await publicClient.simulateContract({
        address: BASE_REVERSE_REGISTRAR,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        account: address,
      });
    },
    [publicClient, address]
  );

  /**
   * Waits for a transaction to be confirmed
   */
  const waitForTransaction = useCallback(
    async (hash: Hash, confirmations = 1) => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      return await publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });
    },
    [publicClient]
  );

  return {
    setName,
    simulateSetName,
    switchToTargetChain,
    waitForTransaction,
    isOnTargetChain,
    targetChain: base,
    targetChainName: base.name,
    targetChainId: L2_CHAIN_ID,
  };
}
