'use client';

import { useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { L2_CHAIN_ID } from '@/constants';

export function useTargetChain() {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const isOnTargetChain = chain?.id === L2_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L2_CHAIN_ID });
    }
  }, [isOnTargetChain, switchChainAsync]);

  return {
    isOnTargetChain,
    switchToTargetChain,
    targetChainId: L2_CHAIN_ID,
  };
}
