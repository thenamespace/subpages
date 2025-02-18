import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig, lightTheme, RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia, base, optimism, arbitrum, baseSepolia } from "viem/chains";
import { PropsWithChildren } from "react";
import { merge } from "lodash";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { themeVariables } from "@/styles/themeVariables";


const myTheme = merge(lightTheme(), {
  colors: {
    accentColor: themeVariables.accent,
    profileActionHover: themeVariables.accent,
    profileAction: themeVariables.accent,
    modalBackground: themeVariables.main,
    modalBorder: themeVariables.accent,
    modalText: themeVariables.light,
    modalTextSecondary: themeVariables.accent,
  },
} as Theme);

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
        <RainbowKitProvider theme={myTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};