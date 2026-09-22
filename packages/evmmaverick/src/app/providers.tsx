"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * RainbowKit is the one surface we don't fully control. Squaring off the
 * radius and pushing the mane amber through as the accent gets it most of the
 * way to the pixel look; the modal's own typography stays RainbowKit's.
 */
const pixelTheme = {
  ...darkTheme({
    accentColor: "oklch(0.768 0.143 59)",
    accentColorForeground: "oklch(0.145 0.012 50)",
    borderRadius: "none",
    overlayBlur: "small",
  }),
  // RainbowKit writes its theme onto the [data-rk] element as inline custom
  // properties, which beat anything in our stylesheet. The font has to be set
  // here or the connect button keeps its system sans and reads as a piece of
  // someone else's site.
  fonts: { body: "var(--font-jetbrains), ui-monospace, monospace" },
};

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state so a Fast Refresh doesn't blow away the cache mid-session.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Quota is re-read explicitly after a mint; background refetching
            // on window focus would make the pip counter flicker.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={pixelTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
