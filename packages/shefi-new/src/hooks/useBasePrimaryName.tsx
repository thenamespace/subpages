'use client';

import { useCallback } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useConfig } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { base } from 'wagmi/chains';
import { Hash } from 'viem';
import { L2_CHAIN_ID, BASE_REVERSE_REGISTRAR, REVERSE_REGISTRAR_ABI } from '@/constants';

export function useBasePrimaryName() {
  const { address, chain } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const isOnTargetChain = chain?.id === L2_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    await switchChainAsync({ chainId: L2_CHAIN_ID });
  }, [switchChainAsync]);

  const setName = useCallback(
    async (name: string): Promise<Hash> => {
      if (!address || !publicClient) {
        throw new Error('Wallet not connected');
      }

      // Simulate on Base public client (RPC call, no connector dependency)
      const { request } = await publicClient.simulateContract({
        address: BASE_REVERSE_REGISTRAR,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        chain: base,
        account: address,
      });

      // Get wallet client without specifying chainId to avoid race condition
      const walletClient = await getWalletClient(config);

      const hash = await walletClient.writeContract(request);
      return hash;
    },
    [address, publicClient, config]
  );

  return {
    setName,
    switchToTargetChain,
    isOnTargetChain,
    targetChain: base,
    targetChainName: base.name,
    targetChainId: L2_CHAIN_ID,
  };
}
