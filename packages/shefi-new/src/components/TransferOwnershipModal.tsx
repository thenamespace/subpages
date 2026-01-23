'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';
import { Input } from './Input';
import { useRegistry } from '@/hooks/useRegistry';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { IndexerSubname } from '@/types/indexer';
import { isValidAddress, truncateAddress } from '@/lib/utils';
import { L2_CHAIN_ID } from '@/constants';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nameData: IndexerSubname | null;
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  onSuccess,
  nameData,
}: TransferOwnershipModalProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { transferOwnership, isOnTargetChain, switchToTargetChain } = useRegistry();
  const {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage: 'Ownership has been transferred successfully!',
    explorerUrl: 'https://basescan.org/tx/',
    explorerName: 'Basescan',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const [confirmText, setConfirmText] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setNewOwner('');
      setConfirmText('');
    }
  }, [isOpen]);

  const isValidNewOwner = isValidAddress(newOwner) && newOwner.toLowerCase() !== address?.toLowerCase();
  const isConfirmed = confirmText.toLowerCase() === 'transfer';
  const canTransfer = isValidNewOwner && isConfirmed;

  const handleTransfer = async () => {
    if (!isConnected || !nameData || !canTransfer) {
      return;
    }

    setIsLoading(true);

    try {
      // Switch to Base if needed
      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      // Execute the transfer
      const txHash = await transferOwnership(nameData.name, newOwner as Address);
      showTransactionModal(txHash);

      // Wait for confirmation
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      toast.success('Ownership transferred successfully!');

      // Close modals and callback after delay
      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      console.error('Error transferring ownership:', err);
      const error = err as Error;

      // Don't show toast for user rejection
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied')) {
        setIsLoading(false);
        return;
      }

      updateTransactionStatus('failed', error?.message || 'Failed to transfer ownership');
      toast.error(error?.message || 'Failed to transfer ownership');
    } finally {
      setIsLoading(false);
    }
  };

  if (!nameData) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Transfer Ownership">
        <div className="flex flex-col gap-4">
          {/* Warning */}
          <div className="rounded-lg border border-red-300 bg-red-50 p-4">
            <Text size="sm" color="red" weight="medium">
              Warning: This action cannot be undone!
            </Text>
            <Text size="xs" color="gray" className="mt-1">
              You will lose control of this name once transferred. Make sure you
              enter the correct address.
            </Text>
          </div>

          {/* Name being transferred */}
          <div className="rounded-lg border border-brand-orange/20 bg-brand-light/50 p-4">
            <Text size="xs" color="gray" className="mb-1">
              Transferring
            </Text>
            <Text size="lg" weight="bold">
              {nameData.name}
            </Text>
          </div>

          {/* New owner address */}
          <div className="space-y-1">
            <Text as="label" size="sm" weight="medium">
              New Owner Address
            </Text>
            <Input
              name="newOwner"
              placeholder="0x..."
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
            />
            {newOwner && !isValidAddress(newOwner) && (
              <Text size="xs" color="red">
                Please enter a valid Ethereum address
              </Text>
            )}
            {newOwner && newOwner.toLowerCase() === address?.toLowerCase() && (
              <Text size="xs" color="red">
                New owner cannot be the same as current owner
              </Text>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-1">
            <Text as="label" size="sm" weight="medium">
              Type "transfer" to confirm
            </Text>
            <Input
              name="confirm"
              placeholder="transfer"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-brand-orange/20 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              loading={isLoading}
              disabled={isLoading || !canTransfer}
              className="flex-1 bg-red-500 hover:bg-red-600 border-red-500"
            >
              {isLoading ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
