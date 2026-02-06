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
  const [isSwitching, setIsSwitching] = useState(false);

  const useManualFlow =
    balanceData !== undefined &&
    balanceData.value >= parseEther(MIN_ETH_FOR_SPONSORSHIP);

  // For manual flow, user must be on mainnet; gasless flow doesn't need chain switch
  const needsChainSwitch = useManualFlow && !isOnTargetChain;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setIsSwitching(false);
      resetSponsored();
    }
  }, [isOpen, resetSponsored]);

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
      if (useManualFlow) {
        txHash = await setName(mintedName);
      } else {
        txHash = await sponsoredSetPrimaryName(mintedName);
      }

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
              disabled={isLoading || isSwitching}
              className="flex-1"
            >
              Cancel
            </Button>
            {needsChainSwitch ? (
              <Button
                size="sm"
                onClick={handleSwitchChain}
                loading={isSwitching}
                disabled={isSwitching}
                className="flex-1"
              >
                {isSwitching ? 'Switching...' : `Switch to ${targetChainName}`}
              </Button>
            ) : (
              <Button
                size="sm"
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
