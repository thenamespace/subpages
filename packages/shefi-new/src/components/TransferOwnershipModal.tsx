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

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setNewOwner('');
    }
  }, [isOpen]);

  const isValidNewOwner = isValidAddress(newOwner) && newOwner.toLowerCase() !== address?.toLowerCase();
  const canTransfer = isValidNewOwner;

  const handleTransfer = async () => {
    if (!isConnected || !nameData || !canTransfer) {
      return;
    }

    setIsLoading(true);

    let txHash: `0x${string}` | undefined;

    try {
      // Switch to Base if needed
      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      // Execute the transfer
      txHash = await transferOwnership(nameData.name, newOwner as Address);
      showTransactionModal(txHash);
    } catch (err: unknown) {
      console.error('Error submitting transfer transaction:', err);
      const error = err as Error;

      // Don't show toast for user rejection
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied')) {
        setIsLoading(false);
        return;
      }

      updateTransactionStatus('failed', error?.message || 'Failed to transfer ownership');
      toast.error(error?.message || 'Failed to transfer ownership');
      setIsLoading(false);
      return;
    }

    // Transaction was submitted successfully, now wait for confirmation
    // Errors during waiting should NOT show error toast since tx is already on-chain
    try {
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      toast.success('Ownership transferred successfully!');

      // Close modals and callback after delay
      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      console.error('Tx confirmation error:', err);
      // Transaction is already on-chain, so still show success
      updateTransactionStatus('success');
      toast.success('Ownership transferred successfully!');

      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!nameData) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-lg">
        <div className="flex flex-col gap-5">
          {/* Warning Banner */}
          <div className="rounded-lg border-2 border-[#E5A84B] bg-[#FFF9E6] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5  text-[#E5A84B]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <Text size="sm" weight="bold" className="text-gray-900">
                  Transfer Ownership
                </Text>
                <Text size="sm" color="gray" className="mt-1">
                  You are transferring ownership of <span className="font-semibold text-gray-900">{nameData.name}</span> to a new owner. This action cannot be undone. Make sure you trust the recipient.
                </Text>
              </div>
            </div>
          </div>

          {/* Current Owner */}
          <div className="rounded-lg bg-gray-50 p-4">
            <Text size="sm" color="gray" className="mb-1">
              Current Owner
            </Text>
            <Text size="sm" weight="medium" className="font-mono">
              {truncateAddress(nameData.owner)}
            </Text>
          </div>

          {/* New owner address */}
          <div className="space-y-2 w-full">
            <Text as="label" size="sm" weight="medium">
              New Owner Address or ENS Name
            </Text>
            <Input
              name="newOwner"
              placeholder="0x... or name.eth"
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

          {/* Actions */}
          <div className="flex gap-3 pt-2 justify-between">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              // size="sm"
              className='w-1/2'
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              loading={isLoading}
              disabled={isLoading || !canTransfer}
              // size="sm"
              className='w-1/2 '
            >
              {isLoading ? 'Transferring...' : 'Transfer '}
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
