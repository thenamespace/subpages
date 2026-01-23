'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';
import { Input } from './Input';
import { useRegistry, TextRecord } from '@/hooks/useRegistry';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { IndexerSubname } from '@/types/indexer';
import { L2_CHAIN_ID } from '@/constants';

interface UpdateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nameData: IndexerSubname | null;
}

// Common record fields to show
const RECORD_FIELDS = [
  { key: 'avatar', label: 'Avatar URL', placeholder: 'https://...' },
  { key: 'description', label: 'Description', placeholder: 'A short bio about yourself' },
  { key: 'com.twitter', label: 'Twitter', placeholder: 'username (without @)' },
  { key: 'com.github', label: 'GitHub', placeholder: 'username' },
  { key: 'org.telegram', label: 'Telegram', placeholder: 'username' },
  { key: 'url', label: 'Website', placeholder: 'https://yourwebsite.com' },
];

export function UpdateRecordsModal({
  isOpen,
  onClose,
  onSuccess,
  nameData,
}: UpdateRecordsModalProps) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { updateTextRecords, isOnTargetChain, switchToTargetChain } = useRegistry();
  const {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage: 'Your records have been updated successfully!',
    explorerUrl: 'https://basescan.org/tx/',
    explorerName: 'Basescan',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen && nameData) {
      const initialData: Record<string, string> = {};
      RECORD_FIELDS.forEach(({ key }) => {
        initialData[key] = nameData.texts?.[key] || '';
      });
      setFormData(initialData);
    }
  }, [isOpen, nameData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isConnected || !nameData) {
      toast.error('Wallet not connected');
      return;
    }

    // Get changed records
    const changedRecords: TextRecord[] = [];
    RECORD_FIELDS.forEach(({ key }) => {
      const newValue = formData[key] || '';
      const oldValue = nameData.texts?.[key] || '';
      if (newValue !== oldValue) {
        changedRecords.push({ key, value: newValue });
      }
    });

    if (changedRecords.length === 0) {
      toast('No changes to save');
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      // Switch to Base if needed
      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      // Execute the transaction
      const txHash = await updateTextRecords(nameData.name, changedRecords);
      showTransactionModal(txHash);

      // Wait for confirmation
      await waitForTransaction(publicClient, txHash);
      updateTransactionStatus('success');

      toast.success('Records updated successfully!');

      // Close modals and callback after delay
      setTimeout(() => {
        closeTransactionModal();
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      console.error('Error updating records:', err);
      const error = err as Error;

      // Don't show toast for user rejection
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied')) {
        setIsLoading(false);
        return;
      }

      updateTransactionStatus('failed', error?.message || 'Failed to update records');
      toast.error(error?.message || 'Failed to update records');
    } finally {
      setIsLoading(false);
    }
  };

  if (!nameData) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Profile"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <Text size="sm" color="gray">
            Update the records for {nameData.name}
          </Text>

          <div className="max-h-96 space-y-4 overflow-y-auto">
            {RECORD_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Text as="label" size="sm" weight="medium">
                  {label}
                </Text>
                <Input
                  name={key}
                  placeholder={placeholder}
                  value={formData[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

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
              onClick={handleSave}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
