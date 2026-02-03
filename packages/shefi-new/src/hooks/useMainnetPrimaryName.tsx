'use client';

import { useCallback } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { Hash } from 'viem';
import { L1_CHAIN_ID, L1_REVERSE_REGISTRAR, REVERSE_REGISTRAR_ABI } from '@/constants';

export function useMainnetPrimaryName() {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient({ chainId: L1_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: L1_CHAIN_ID });

  const isOnTargetChain = chain?.id === L1_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L1_CHAIN_ID });
    }
  }, [isOnTargetChain, switchChainAsync]);

  const setName = useCallback(
    async (name: string): Promise<Hash> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const hash = await walletClient.writeContract({
        address: L1_REVERSE_REGISTRAR,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        chain: mainnet,
      });

      return hash;
    },
    [walletClient, address, isOnTargetChain, switchToTargetChain]
  );

  return {
    setName,
    switchToTargetChain,
    isOnTargetChain,
    targetChain: mainnet,
    targetChainName: mainnet.name,
    targetChainId: L1_CHAIN_ID,
  };
}
