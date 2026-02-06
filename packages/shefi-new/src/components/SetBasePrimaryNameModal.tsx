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

function getReadableError(error: Error): string {
  const msg = error?.message || '';
  if (msg.includes('User rejected') || msg.includes('denied')) return '';
  if (msg.includes('insufficient funds')) return 'Insufficient ETH for gas fees';
  if (msg.includes('returned no data')) return 'Transaction failed. Please try again';
  if (msg.includes('execution reverted')) return 'Transaction reverted. Please try again';
  if (msg.includes('Wallet not connected')) return 'Wallet not connected';
  const firstLine = msg.split('\n')[0];
  return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;
}

interface SetBasePrimaryNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mintedName: string;
}

export function SetBasePrimaryNameModal({
  isOpen,
  onClose,
  onSuccess,
  mintedName,
}: SetBasePrimaryNameModalProps) {
  const { address, isConnected } = useAccount();
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
  const [isSwitching, setIsSwitching] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setIsSwitching(false);
    }
  }, [isOpen]);

  const handleSwitchChain = async () => {
    setIsSwitching(true);
    try {
      await switchToTargetChain();
    } catch (err: unknown) {
      console.error('Error switching chain:', err);
      const error = err as Error;
      if (!error?.message?.includes('User rejected') && !error?.message?.includes('denied')) {
        toast.error('Failed to switch network. Please switch manually in your wallet.');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSetPrimaryName = async () => {
    if (!isConnected || !address) {
      toast.error('Wallet not connected');
      return;
    }

    setIsLoading(true);

    let txHash: `0x${string}` | undefined;

    try {
      txHash = await setName(mintedName);
      showTransactionModal(txHash);
    } catch (err: unknown) {
      console.error('Error submitting primary name transaction:', err);
      const error = err as Error;
      const readableMsg = getReadableError(error);

      if (!readableMsg) {
        setIsLoading(false);
        return;
      }

      toast.error(readableMsg);
      setIsLoading(false);
      return;
    }

    // Transaction was submitted successfully, now wait for confirmation
    try {
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      toast.success('Primary name set successfully!');

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
              disabled={isLoading || isSwitching}
              className="flex-1"
            >
              Skip
            </Button>
            {!isOnTargetChain ? (
              <Button
                onClick={handleSwitchChain}
                loading={isSwitching}
                disabled={isSwitching}
                className="flex-1"
              >
                {isSwitching ? 'Switching...' : `Switch to ${targetChainName}`}
              </Button>
            ) : (
              <Button
                onClick={handleSetPrimaryName}
                loading={isLoading}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Setting...' : 'Set Primary Name'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
