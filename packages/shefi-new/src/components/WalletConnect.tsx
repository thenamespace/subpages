"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  mainnet,
  base,
} from "wagmi/chains";
import { PropsWithChildren } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "viem";

// Get Alchemy key for mainnet transport
const alchemyKey = "yeCZajILCLvofy6lRC6mJ";
const mainnetTransport = alchemyKey
  ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();

const baseTransport = alchemyKey
  ? http(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();

const config = getDefaultConfig({
  appName: "LSU",
  projectId: "a5f353014d529c8f85633e3c6250ac28",
  chains: [mainnet, base],
  ssr: true,
  transports: {
    [mainnet.id]: mainnetTransport,
    [base.id]: baseTransport,
  },
});

const queryClient = new QueryClient();
export const WalletConnector = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
