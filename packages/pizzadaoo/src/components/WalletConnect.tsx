import { PropsWithChildren } from "react";
import {
  getDefaultConfig,
  RainbowKitProvider,
  Theme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { http, WagmiProvider } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const baseTheme = lightTheme();
const myTheme: Theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    accentColor: "#0B8766",
    modalBackground: "black",
    modalBorder: "#FFB819",
    modalText: "#FFB819",
    modalTextSecondary: "#FFB819",
  },
};

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;

// Prefer a dedicated Alchemy RPC over viem's rate-limited public default.
// Falls back to the chain's default transport when no key is configured.
const alchemyTransport = (subdomain: string) =>
  alchemyKey
    ? http(`https://${subdomain}.g.alchemy.com/v2/${alchemyKey}`)
    : http();

// WalletConnect Cloud project id is required. A shared/hardcoded fallback
// previously shipped to the browser, which would route relay traffic
// through whichever account owned that id — fail loud on the client if
// the env is missing instead of silently using a foreign account's id.
// During SSG/build (no `window`) we pass a sentinel so static pages
// still render; the client throw catches the misconfiguration before
// any wallet interaction.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!walletConnectProjectId && typeof window !== "undefined") {
  throw new Error(
    "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. " +
      "Create one at https://cloud.walletconnect.com and set it in .env",
  );
}

// mainnet is required for ENS name/avatar resolution (ENS lives on L1);
// base is the network subnames are minted on.
const config = getDefaultConfig({
  appName: "PizzaDAO",
  // SSG sentinel — never reaches the client; the throw above guards that.
  projectId: walletConnectProjectId ?? "ssg-build-placeholder",
  chains: [base, mainnet],
  transports: {
    [base.id]: alchemyTransport("base-mainnet"),
    [mainnet.id]: alchemyTransport("eth-mainnet"),
  },
  ssr: true,
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
