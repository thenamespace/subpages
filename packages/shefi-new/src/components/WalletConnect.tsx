"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  getDefaultWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import type { Wallet } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  mainnet,
  sepolia,
  base,
  optimism,
  arbitrum,
  baseSepolia,
} from "wagmi/chains";
import { PropsWithChildren, useState, useEffect } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "viem";

// Get MetaMask provider from window.ethereum or ethereum.providers (EIP-5740).
// When Base Wallet / Nightly inject first, window.ethereum is not MetaMask;
// MetaMask is then in ethereum.providers and would not be detected by RainbowKit's default metaMaskWallet.
function getMetaMaskProvider(): unknown {
  if (typeof window === "undefined" || !window.ethereum) return undefined;
  const ethereum = window.ethereum as {
    providers?: unknown[];
    isMetaMask?: boolean;
  };
  if (ethereum.providers?.length) {
    const found = ethereum.providers.find(
      (p: unknown) => (p as { isMetaMask?: boolean })?.isMetaMask
    );
    if (found) return found;
  }
  return ethereum.isMetaMask ? ethereum : undefined;
}

const META_MASK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect width='28' height='28' rx='6' fill='%23fff'/%3E%3Cpath fill='%23E2761B' d='M20.5 6l-1.4 2.8-1.5.6.9 1-.9.5.4.6.6-.2 1-1 .5.5.7.3.2 1.4-.9.6-1.3-.2-.7.5-.6-.2-.3-.6.2-.2.5-.6-.1-.4-.5.2-.3-.5-.1z'/%3E%3C/svg%3E";

// Custom MetaMask wallet that uses the injected connector with the MetaMask provider
// from ethereum.providers when another wallet (e.g. Base, Nightly) is window.ethereum.
function metaMaskInjectedWallet(): Wallet {
  return {
    id: "metaMask",
    name: "MetaMask",
    iconUrl: META_MASK_ICON,
    iconBackground: "#fff",
    iconAccent: "#f6851a",
    installed: !!getMetaMaskProvider(),
    downloadUrls: {
      chrome:
        "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      browserExtension: "https://metamask.io/download",
    },
    createConnector: () => (config) =>
      injected({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target: (() => {
          const p = getMetaMaskProvider();
          return p ? { id: "metaMask", name: "MetaMask", provider: p } : undefined;
        }) as any,
      })(config),
  };
}

// CreateWalletFn: use our custom MetaMask (injected from ethereum.providers) when available,
// otherwise use the original metaMaskWallet from the default list (WalletConnect/QR).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMetaMaskWalletWithProviders(originalMetaMask: (p: any) => Wallet) {
  return (params: any): Wallet =>
    getMetaMaskProvider() ? metaMaskInjectedWallet() : originalMetaMask(params);
}

// Get Alchemy key for mainnet transport
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const mainnetTransport = alchemyKey
  ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();

const baseTransport = alchemyKey
  ? http(`https://eth-base.g.alchemy.com/v2/${alchemyKey}`)
  : http();

const chains = [mainnet, sepolia, base, optimism, arbitrum, baseSepolia] as const;

// Index of metaMaskWallet in getDefaultWallets() Popular group
const META_MASK_WALLET_INDEX = 3;

// Build wagmi config only on the client so window.ethereum (and ethereum.providers)
// are available. Use custom MetaMask wallet that detects MetaMask from ethereum.providers.
function createWalletConfig() {
  const { wallets: defaultWallets } = getDefaultWallets();
  const originalMetaMask = defaultWallets[0].wallets[META_MASK_WALLET_INDEX];
  const customWallets = [
    {
      ...defaultWallets[0],
      wallets: defaultWallets[0].wallets.map((walletFn, idx) =>
        idx === META_MASK_WALLET_INDEX
          ? createMetaMaskWalletWithProviders(originalMetaMask)
          : walletFn
      ),
    },
  ];
  return getDefaultConfig({
    appName: "LSU",
    projectId: "a5f353014d529c8f85633e3c6250ac28",
    chains,
    transports: {
      [mainnet.id]: mainnetTransport,
      [base.id]: baseTransport,
    },
    wallets: customWallets,
  });
}

const queryClient = new QueryClient();

export const WalletConnector = ({ children }: PropsWithChildren) => {
  const [config, setConfig] = useState<ReturnType<
    typeof createWalletConfig
  > | null>(null);

  useEffect(() => {
    setConfig(createWalletConfig());
  }, []);

  if (!config) {
    return <div className="min-h-screen" aria-hidden />;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
