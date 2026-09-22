import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";

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
 * Mainnet only. The parent is an L1 listing, and the gate NFT is on mainnet,
 * so there is no second chain to switch to — which removes a whole class of
 * wrong-network states from the UI.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "EVMaverick Names",
  projectId: walletConnectId,
  chains: [mainnet],
  transports: {
    [mainnet.id]: alchemyKey
      ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
      : // Falls back to viem's public RPC. Fine for local dev, rate-limited
        // enough in production that a missing key shows up as quota errors.
        http(),
  },
  ssr: true,
});
