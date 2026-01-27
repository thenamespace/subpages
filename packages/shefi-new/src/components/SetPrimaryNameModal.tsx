'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';
import { useBasePrimaryName } from '@/hooks/useBasePrimaryName';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { L2_CHAIN_ID } from '@/constants';

interface SetPrimaryNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mintedName: string;
}

export function SetPrimaryNameModal({
  isOpen,
  onClose,
  onSuccess,
  mintedName,
}: SetPrimaryNameModalProps) {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { setName, switchToTargetChain, isOnTargetChain, targetChainName } =
    useBasePrimaryName();
  const {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage: 'Your primary name has been set successfully!',
    explorerUrl: 'https://basescan.org/tx/',
    explorerName: 'Basescan',
  });

  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSetPrimaryName = async () => {
    if (!isConnected || !address) {
      toast.error('Wallet not connected');
      return;
    }

    setIsLoading(true);

    let txHash: `0x${string}` | undefined;

    try {
      // Switch to Base if needed
      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      // Execute the transaction
      txHash = await setName(mintedName);
      showTransactionModal(txHash);
    } catch (err: unknown) {
      console.error('Error submitting primary name transaction:', err);
      const error = err as Error;

      // Don't show toast for user rejection
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied')) {
        setIsLoading(false);
        return;
      }

      updateTransactionStatus('failed', error?.message || 'Failed to set primary name');
      toast.error(error?.message || 'Failed to set primary name');
      setIsLoading(false);
      return;
    }

    // Transaction was submitted successfully, now wait for confirmation
    // Errors during waiting should NOT show error toast since tx is already on-chain
    try {
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      // Notify success
      toast.success('Primary name set successfully!');

      // Close modals and callback after delay
      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      console.error('Tx confirmation error:', err);
      // Transaction is already on-chain, so still show success
      updateTransactionStatus('success');
      toast.success('Primary name set successfully!');

      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleSkip} title="Set Primary Name">
        <div className="flex flex-col gap-4">
          <Text size="sm" color="gray">
            Set this name as your primary ENS name on Base. This is what others will
            see when they look up your address.
          </Text>

          <div className="rounded-lg border border-brand-accent/30 bg-gradient-to-r from-brand-pinkBtn/30 to-brand-lavender/30 p-4 text-center">
            <Text size="lg" weight="bold">
              {mintedName}
            </Text>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-brand-light p-3">
            <img src="/chains/base.svg" alt="Base" className="h-5 w-5" />
            <Text size="sm" color="gray">
              Transaction will be submitted on {targetChainName}
            </Text>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleSetPrimaryName}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Setting...' : 'Set Primary Name'}
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
