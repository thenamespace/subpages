'use client'

import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig, lightTheme, RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia, base, optimism, arbitrum, baseSepolia } from "wagmi/chains";
import { PropsWithChildren } from "react";
import { merge } from "lodash";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";





const config = getDefaultConfig({
  appName: "LSU",
  projectId: "a5f353014d529c8f85633e3c6250ac28",
  chains: [mainnet, sepolia, base, optimism, arbitrum, baseSepolia],
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