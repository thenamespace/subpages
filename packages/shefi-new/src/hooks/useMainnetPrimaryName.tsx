'use client';

import { useCallback } from 'react';
import { useAccount, useConfig, usePublicClient, useSwitchChain } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { mainnet } from 'wagmi/chains';
import { Hash } from 'viem';
import { L1_CHAIN_ID, L1_REVERSE_REGISTRAR, REVERSE_REGISTRAR_ABI } from '@/constants';

export function useMainnetPrimaryName() {
  const { address, chain } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: L1_CHAIN_ID });

  const isOnTargetChain = chain?.id === L1_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L1_CHAIN_ID });
    }
  }, [isOnTargetChain, switchChainAsync]);

  const setName = useCallback(
    async (name: string): Promise<Hash> => {
      if (!address || !publicClient) {
        throw new Error('Wallet not connected');
      }

      if (chain?.id !== L1_CHAIN_ID) {
        await switchChainAsync({ chainId: L1_CHAIN_ID });
      }

      // Get a fresh wallet client after potential chain switch
      const walletClient = await getWalletClient(config, { chainId: L1_CHAIN_ID });

      const { request } = await publicClient.simulateContract({
        address: L1_REVERSE_REGISTRAR,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        chain: mainnet,
        account: address,
      });

      const hash = await walletClient.writeContract(request);

      return hash;
    },
    [address, publicClient, chain?.id, switchChainAsync, config]
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
