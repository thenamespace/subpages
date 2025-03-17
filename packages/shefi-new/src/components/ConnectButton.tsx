'use client'
import { useAccount } from "wagmi";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";


import { Button } from '@/components/Button'
import { useEffect, useState } from "react";

export function ConnectedButton({}) {

    const { openConnectModal } = useConnectModal();
    const { isConnected } = useAccount();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);
  
    if (!isClient) {
      return null;
    }

    return (
      <>
    {!isConnected ? (
        <Button onClick={() => openConnectModal?.()} >Connect Wallet</Button>
      ) : (
        <ConnectButton chainStatus="none" showBalance={false} accountStatus="address"/>
      )}
      </>
    );
};