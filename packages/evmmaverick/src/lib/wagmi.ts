import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base, mainnet } from "wagmi/chains";

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const walletConnectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectId) {
  // Loud at build time rather than a silent half-working connect modal.
  // Never borrow someone else's project id — relay metadata routes through
  // whoever owns it.
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Register a project at " +
      "https://cloud.reown.com and add it to .env.local (see .env.example).",
  );
}

/**
 * Mainnet carries the gate NFT and L1 listings. Base is here for L2 listings:
 * their subnames are minted into and edited on Namespace's Base registry, so
 * the wallet switches to Base for those writes. Which one applies comes from
 * the listing at runtime — see lib/nameChain.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "EVMaverick Names",
  projectId: walletConnectId,
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: alchemyKey
      ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
      : // Falls back to viem's public RPC. Fine for local dev, rate-limited
        // enough in production that a missing key shows up as quota errors.
        http(),
    [base.id]: alchemyKey
      ? http(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`)
      : http(),
  },
  ssr: true,
});
