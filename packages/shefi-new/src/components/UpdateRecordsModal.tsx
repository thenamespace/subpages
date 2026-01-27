'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain } from 'wagmi';
import toast from 'react-hot-toast';
import { zeroHash, type Hash } from 'viem';
import axios from 'axios';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { L2_CHAIN_ID, PARENT_NAME } from '@/constants';
import { deepCopy, sleep } from '@/lib/resolver-utils';
import {
  SelectRecordsForm,
  getEnsRecordsDiff,
  getSupportedAddressByCoin,
  type EnsRecords,
} from '@thenamespace/ens-components';

const USER_DENIED_TX_ERROR = 'User denied transaction';

interface UpdateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nameLabel: string;
  initialRecords: EnsRecords;
  ensRecords: EnsRecords;
  onRecordsUpdated: (records: EnsRecords) => void;
  onUpdate: () => void;
}

export function UpdateRecordsModal({
  isOpen,
  onClose,
  nameLabel,
  initialRecords,
  ensRecords,
  onRecordsUpdated,
  onUpdate,
}: UpdateRecordsModalProps) {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { updateRecords } = useRegistry();
  const {
    showTransactionModal,
    updateTransactionStatus,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage: 'Your records have been updated successfully!',
    explorerUrl: 'https://basescan.org/tx/',
    explorerName: 'Basescan',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCancel = () => {
    onRecordsUpdated(deepCopy(initialRecords));
    onClose();
  };

  // Validate text record
  const isValidTextRecord = (text: { key: string; value: string }) => {
    return text.value.length > 0;
  };

  // Validate address record
  const isValidAddressRecord = (address: { coinType: number; value: string }) => {
    if (address.value.length === 0) return false;

    const supportedAddress = getSupportedAddressByCoin(address.coinType);
    if (!supportedAddress) return false;

    return supportedAddress.validateFunc?.(address.value) || false;
  };

  // Check if there are any valid changes between initial and current records
  const hasValidChanges = () => {
    const diff = getEnsRecordsDiff(initialRecords, ensRecords);

    // Check if there are any changes
    const hasAnyChanges =
      diff.textsAdded.length > 0 ||
      diff.textsModified.length > 0 ||
      diff.textsRemoved.length > 0 ||
      diff.addressesAdded.length > 0 ||
      diff.addressesModified.length > 0 ||
      diff.addressesRemoved.length > 0 ||
      diff.contenthashRemoved ||
      diff.contenthashModified;

    if (!hasAnyChanges) return false;

    // Validate all text records that are being added or modified
    const allTextsValid = [...diff.textsAdded, ...diff.textsModified].every((text) =>
      isValidTextRecord(text)
    );

    // Validate all address records that are being added or modified
    const allAddressesValid = [...diff.addressesAdded, ...diff.addressesModified].every(
      (address) => isValidAddressRecord(address)
    );

    return allTextsValid && allAddressesValid;
  };

  const handleContractErr = (err: unknown) => {
    const contractErr = err as { details?: string; message?: string };
    if (contractErr?.details?.includes(USER_DENIED_TX_ERROR)) {
      // User denied transaction - no toast needed
    } else if (contractErr?.details?.includes('insufficient funds')) {
      toast.error('Insufficient funds. Please add ETH to your wallet.');
    } else if (contractErr?.message?.includes('User rejected') || contractErr?.message?.includes('denied')) {
      // User rejected - no toast
    } else {
      // Generic error message
      toast.error('Update failed. Please try again.');
      console.error('Update error:', err);
    }
  };

  const handleUpdateRecords = async () => {
    if (!hasValidChanges()) {
      toast.error('No valid changes to update');
      return;
    }

    setIsUpdating(true);

    // Ensure Base chain; do not throw or toast on user cancel
    if (chain?.id !== L2_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: L2_CHAIN_ID });
        await sleep(500);
      } catch (_err) {
        setIsUpdating(false);
        return; // silently exit if user cancels or switch fails
      }
    }

    let txHash: Hash = zeroHash;
    try {
      const { data } = await axios.post<{ tx: Hash }>('/api/update-records', {
        owner: address,
        label: nameLabel,
        oldRecords: initialRecords,
        newRecords: ensRecords,
      });

      txHash = data.tx;
    } catch (err: any) {
      console.error('Update error:', err);
      if (err?.response?.data?.error) {
        toast.error(err.response.data.error);
      } else if (err?.message) {
        toast.error(err.message);
      } else {
        toast.error('Update failed. Please try again.');
      }
      setIsUpdating(false);
      return;
    }

    // Show transaction modal
    showTransactionModal(txHash);

    try {
      // Wait for transaction confirmation
      await waitForTransaction(publicClient, txHash);

      updateTransactionStatus('success');
      toast.success('Records updated successfully!');
      onUpdate();
      onClose();
    } catch (err: unknown) {
      console.error('Tx confirmation error:', err);
      // Transaction is already on-chain, so still show success
      updateTransactionStatus('success');
      toast.success('Records updated successfully!');
      onUpdate();
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Profile" className="max-w-lg">
        <div className="max-h-[60vh] overflow-y-auto">
          <SelectRecordsForm records={ensRecords} onRecordsUpdated={onRecordsUpdated} />
        </div>
        <div className="mt-4 flex gap-3 border-t border-brand-accent/20 pt-4">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRecords}
            disabled={!hasValidChanges() || isUpdating}
            loading={isUpdating}
            className="flex-1"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
