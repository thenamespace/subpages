import { PropsWithChildren } from "react";
import merge from "lodash.merge";
import {
  getDefaultConfig,
  RainbowKitProvider,
  Theme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base, baseSepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const myTheme = merge(lightTheme(), {
  colors: {
    accentColor: "#4E9A2E",
    modalBackground: "rgba(44, 18, 79, 0.9)",
    modalBorder: "#FFB819",
    modalText: "#FFB819",
    modalTextSecondary: "#FFB819",
  },
} as Theme);
const config = getDefaultConfig({
  appName: "LSU",
  projectId: "a5f353014d529c8f85633e3c6250ac28",
  chains: [mainnet, polygon, optimism, arbitrum, base, baseSepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export const WalletConnector = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={myTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
