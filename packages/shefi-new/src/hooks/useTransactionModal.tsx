'use client';

import { useState, useCallback } from 'react';
import { Hash, PublicClient } from 'viem';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';

type TransactionStatus = 'pending' | 'success' | 'failed';

interface UseTransactionModalOptions {
  successMessage?: string;
  explorerUrl?: string;
  explorerName?: string;
}

export function useTransactionModal(options: UseTransactionModalOptions = {}) {
  const {
    successMessage = 'Transaction completed successfully!',
    explorerUrl = 'https://basescan.org/tx/',
    explorerName = 'Basescan',
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showTransactionModal = useCallback((hash: Hash) => {
    setTxHash(hash);
    setStatus('pending');
    setErrorMessage(null);
    setIsOpen(true);
  }, []);

  const updateTransactionStatus = useCallback(
    (newStatus: TransactionStatus, error?: string) => {
      setStatus(newStatus);
      if (error) {
        setErrorMessage(error);
      }
    },
    []
  );

  const closeTransactionModal = useCallback(() => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(() => {
      setTxHash(null);
      setStatus('pending');
      setErrorMessage(null);
    }, 200);
  }, []);

  /**
   * Wait for a transaction with retry logic
   */
  const waitForTransaction = useCallback(
    async (publicClient: PublicClient | undefined, hash: Hash, maxRetries = 3) => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: 1,
          });
          return receipt;
        } catch (err) {
          attempts++;
          if (attempts === maxRetries) {
            throw err;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    },
    []
  );

  const TransactionModal = useCallback(() => {
    return (
      <Modal isOpen={isOpen} onClose={closeTransactionModal} showCloseButton={status !== 'pending'}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {/* Status Icon */}
          {status === 'pending' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellowBtn">
                <Spinner />
              </div>
              <Text size="lg" weight="bold">
                Transaction Pending
              </Text>
              <Text size="sm" color="gray">
                Please wait while your transaction is being processed...
              </Text>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <Text size="lg" weight="bold">
                Success!
              </Text>
              <Text size="sm" color="gray">
                {successMessage}
              </Text>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <Text size="lg" weight="bold">
                Transaction Failed
              </Text>
              <Text size="sm" color="gray">
                {errorMessage || 'Something went wrong. Please try again.'}
              </Text>
            </>
          )}

          {/* Transaction Hash Link */}
          {txHash && (
            <a
              href={`${explorerUrl}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-orange underline hover:text-brand-orange/80"
            >
              View on {explorerName}
            </a>
          )}

          {/* Close Button (only show when not pending) */}
          {status !== 'pending' && (
            <Button onClick={closeTransactionModal} className="mt-2">
              Close
            </Button>
          )}
        </div>
      </Modal>
    );
  }, [isOpen, status, txHash, errorMessage, successMessage, explorerUrl, explorerName, closeTransactionModal]);

  return {
    isOpen,
    txHash,
    status,
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  };
}
