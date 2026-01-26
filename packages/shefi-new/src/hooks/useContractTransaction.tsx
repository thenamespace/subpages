'use client';

import { useState, useCallback } from 'react';
import { Hash } from 'viem';
import { usePublicClient } from 'wagmi';
import toast from 'react-hot-toast';
import { useTransactionModal } from './useTransactionModal';
import { useTargetChain } from './useTargetChain';
import { L2_CHAIN_ID } from '@/constants';
import { isUserRejection } from '@/lib/utils';

interface UseContractTransactionOptions {
  successMessage: string;
  onSuccess?: () => void;
}

export function useContractTransaction(options: UseContractTransactionOptions) {
  const { successMessage, onSuccess } = options;
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { isOnTargetChain, switchToTargetChain } = useTargetChain();
  const [isLoading, setIsLoading] = useState(false);

  const {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage,
    explorerUrl: 'https://basescan.org/tx/',
    explorerName: 'Basescan',
  });

  const execute = useCallback(
    async (transactionFn: () => Promise<Hash>) => {
      setIsLoading(true);

      try {
        // Switch chain if needed
        if (!isOnTargetChain) {
          await switchToTargetChain();
        }

        // Execute transaction
        const txHash = await transactionFn();
        showTransactionModal(txHash);

        // Wait for confirmation
        await waitForTransaction(publicClient, txHash);
        updateTransactionStatus('success');

        toast.success(successMessage);

        // Callback after delay
        setTimeout(() => {
          closeTransactionModal();
          onSuccess?.();
        }, 2000);

        return txHash;
      } catch (err: unknown) {
        console.error('Transaction error:', err);

        if (isUserRejection(err)) {
          setIsLoading(false);
          return null;
        }

        const errorMsg = (err as Error)?.message || 'Transaction failed';
        updateTransactionStatus('failed', errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isOnTargetChain, switchToTargetChain, showTransactionModal, waitForTransaction, updateTransactionStatus, closeTransactionModal, publicClient, successMessage, onSuccess]
  );

  return {
    execute,
    isLoading,
    TransactionModal,
  };
}
