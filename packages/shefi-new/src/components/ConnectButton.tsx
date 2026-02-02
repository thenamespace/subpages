'use client';

import { useAccount } from 'wagmi';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/Button';
import { EnsNameDisplay } from '@/components/EnsNameDisplay';
import { usePrimaryName } from '@/contexts/PrimaryNameContext';
import { truncateAddress } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ConnectedButton() {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { isConnected, address } = useAccount();
  const { primaryName } = usePrimaryName();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (!isConnected) {
    return <Button onClick={() => openConnectModal?.()}>Connect Wallet</Button>;
  }

  return (
    <Button
      onClick={() => openAccountModal?.()}
      className="normal-case"
    >
      <span className="min-w-0 flex-1 overflow-hidden">
        {primaryName ? (
          <EnsNameDisplay name={primaryName} buffer={8} />
        ) : address ? (
          truncateAddress(address)
        ) : (
          'Wallet'
        )}
      </span>
    </Button>
  );
}