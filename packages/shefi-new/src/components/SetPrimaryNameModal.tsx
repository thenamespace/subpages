'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';
import { useMainnetPrimaryName } from '@/hooks/useMainnetPrimaryName';
import { useSponsoredPrimaryName } from '@/hooks/useSponsoredPrimaryName';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { L1_CHAIN_ID, MIN_ETH_FOR_SPONSORSHIP } from '@/constants';

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
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: L1_CHAIN_ID });
  const { setName, switchToTargetChain, isOnTargetChain, targetChainName } =
    useMainnetPrimaryName();
  const {
    setPrimaryName: sponsoredSetPrimaryName,
    reset: resetSponsored,
  } = useSponsoredPrimaryName();
  const {
    showTransactionModal,
    updateTransactionStatus,
    closeTransactionModal,
    waitForTransaction,
    TransactionModal,
  } = useTransactionModal({
    successMessage: 'Your primary name has been set successfully!',
    explorerUrl: 'https://etherscan.io/tx/',
    explorerName: 'Etherscan',
  });

  const { data: balanceData } = useBalance({
    address,
    chainId: L1_CHAIN_ID,
  });

  const [isLoading, setIsLoading] = useState(false);

  const useManualFlow =
    balanceData !== undefined &&
    balanceData.value >= parseEther(MIN_ETH_FOR_SPONSORSHIP);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      resetSponsored();
    }
  }, [isOpen, resetSponsored]);

  const handleSetPrimaryName = async () => {
    if (!isConnected || !address) {
      toast.error('Wallet not connected');
      return;
    }

    setIsLoading(true);

    let txHash: `0x${string}` | undefined;

    try {
      if (useManualFlow) {
        // Direct flow: user pays gas on Ethereum mainnet
        if (!isOnTargetChain) {
          await switchToTargetChain();
        }
        txHash = await setName(mintedName);
      } else {
        // Sponsored flow: user only signs, server pays gas on mainnet
        txHash = await sponsoredSetPrimaryName(mintedName);
      }

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
        <div className="flex flex-col gap-1">
          <Text size="sm" color="gray">
            This will set your primary name to:
          </Text>

          <Text size="base" weight="bold" className="mt-1">
            {mintedName}
          </Text>

          <Text size="sm" className="mt-1 italic text-brand-accent">
            {useManualFlow
              ? 'Requires gas on Ethereum'
              : 'This is a gasless transaction'}
          </Text>

          <div className="mt-4 flex gap-3 border-t border-brand-accent/20 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSetPrimaryName}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading
                ? 'Setting...'
                : 'Set Primary Name'}
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionModal />
    </>
  );
}
