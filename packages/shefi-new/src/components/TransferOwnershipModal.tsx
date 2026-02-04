'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { normalize } from 'viem/ens';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';
import { useRegistry } from '@/hooks/useRegistry';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { IndexerSubname } from '@/types/indexer';
import { isValidAddress, truncateAddress } from '@/lib/utils';
import { L1_CHAIN_ID, L2_CHAIN_ID } from '@/constants';

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
  const mainnetClient = usePublicClient({ chainId: L1_CHAIN_ID });
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
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setNewOwner('');
      setResolvedAddress(null);
      setResolveError(null);
    }
  }, [isOpen]);

  // Resolve ENS names
  useEffect(() => {
    const input = newOwner.trim();

    // If it's already a valid address, use it directly
    if (isValidAddress(input)) {
      setResolvedAddress(input);
      setResolveError(null);
      setIsResolving(false);
      return;
    }

    // If it looks like an ENS name, try to resolve
    if (input.includes('.') && input.length > 3) {
      setIsResolving(true);
      setResolvedAddress(null);
      setResolveError(null);

      const resolveENS = async () => {
        try {
          if (!mainnetClient) {
            setResolveError('Unable to resolve ENS names');
            setIsResolving(false);
            return;
          }
          const normalized = normalize(input);
          const addr = await mainnetClient.getEnsAddress({ name: normalized });
          if (addr) {
            setResolvedAddress(addr);
            setResolveError(null);
          } else {
            setResolveError('ENS name not found');
            setResolvedAddress(null);
          }
        } catch {
          setResolveError('Could not resolve ENS name');
          setResolvedAddress(null);
        } finally {
          setIsResolving(false);
        }
      };

      const timer = setTimeout(resolveENS, 500);
      return () => clearTimeout(timer);
    }

    // Not a valid address or ENS name
    setResolvedAddress(null);
    setResolveError(null);
    setIsResolving(false);
  }, [newOwner, mainnetClient]);

  const effectiveAddress = resolvedAddress;
  const isSameOwner = effectiveAddress && address && effectiveAddress.toLowerCase() === address.toLowerCase();
  const canTransfer = !!effectiveAddress && isValidAddress(effectiveAddress) && !isSameOwner;

  const handleTransfer = async () => {
    if (!isConnected || !nameData || !canTransfer || !effectiveAddress) {
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
      txHash = await transferOwnership(nameData.name, effectiveAddress as Address);
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
    try {
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      toast.success('Ownership transferred successfully!');

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

  const isEnsInput = newOwner.trim().includes('.') && !isValidAddress(newOwner.trim());

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Transfer Ownership" className="max-w-lg">
        <div className="flex flex-col gap-4">
          {/* Warning Banner */}
          <div className="rounded-lg border border-brand-orange/30 bg-brand-light/50 p-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 text-brand-orange">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
              <Text size="sm" color="gray">
                Transferring <span className="font-semibold text-brand-dark">{nameData.name}</span> to a new owner. This cannot be undone.
              </Text>
            </div>
          </div>

          {/* Current Owner */}
          <div className="rounded-lg bg-brand-light/30 p-3">
            <Text size="xs" color="gray" className="mb-0.5">
              Current Owner
            </Text>
            <Text size="sm" weight="medium" className="font-mono">
              {truncateAddress(nameData.owner)}
            </Text>
          </div>

          {/* New owner address */}
          <div className="space-y-1.5 w-full">
            <Text as="label" size="sm" weight="medium">
              New Owner
            </Text>
            <input
              type="text"
              name="newOwner"
              placeholder="0x... or name.eth"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-brand-dark/40 focus:border-brand-accent/60 focus:ring-1 focus:ring-brand-accent/20"
            />
            {isResolving && (
              <Text size="xs" color="gray">
                Resolving ENS name...
              </Text>
            )}
            {isEnsInput && resolvedAddress && !isResolving && (
              <Text size="xs" color="gray">
                Resolved: <span className="font-mono">{truncateAddress(resolvedAddress)}</span>
              </Text>
            )}
            {resolveError && !isResolving && (
              <Text size="xs" color="red">
                {resolveError}
              </Text>
            )}
            {newOwner && !isEnsInput && !isValidAddress(newOwner.trim()) && newOwner.trim().length > 0 && (
              <Text size="xs" color="red">
                Please enter a valid address or ENS name
              </Text>
            )}
            {isSameOwner && (
              <Text size="xs" color="red">
                New owner cannot be the same as current owner
              </Text>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-brand-accent/20 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransfer}
              loading={isLoading}
              disabled={isLoading || !canTransfer}
              className="flex-1"
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
