import { createMintClient } from "@namespacesdk/mint-manager";
import { MINT_SOURCE } from "./config";

// Lazily constructed so the SDK doesn't initialise (or log) during SSR and
// the production build.
let singleton: ReturnType<typeof createMintClient> | undefined;

export const getMintClient = () =>
  (singleton ??= createMintClient({ mintSource: MINT_SOURCE }));
