"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { mainnet } from "wagmi/chains";
import { ChainName, type EnsRecords } from "@namespacesdk/mint-manager";
import { EXPIRY_IN_YEARS, PARENT_NAME } from "@/lib/config";
import { getMintClient } from "@/lib/mintClient";
import { resolveNameChain, type NameChain } from "@/lib/nameChain";
import { wagmiConfig } from "@/lib/wagmi";
import { getTxErrorMessage, isUserRejection } from "@/lib/txError";

export type MintStep = "idle" | "signing" | "pending" | "success";

export interface MintState {
  step: MintStep;
  /** Frozen at submit so editing the input mid-flight can't rewrite history. */
  mintedName: string | null;
  txHash: `0x${string}` | null;
  error: string | null;
}

const INITIAL: MintState = {
  step: "idle",
  mintedName: null,
  txHash: null,
  error: null,
};

/**
 * The chain the mint transaction lands on: mainnet for an L1 listing, the
 * registry's chain (Base) for an L2 one. getListing is cached, so the extra
 * round-trip only costs the first mint.
 */
async function resolveMintChain(): Promise<NameChain["chain"]> {
  try {
    return (await resolveNameChain()).chain;
  } catch {
    // Fall through to mainnet — the mint-manager's own pre-flight will still
    // block an unlistable name with a readable error.
    return mainnet;
  }
}

export function useMint(onMinted: () => void) {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<MintState>(INITIAL);

  // Guards every setState after an await — the success screen must not be
  // painted onto an unmounted tree if the user navigates mid-transaction.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const mint = useCallback(
    async (label: string, records?: EnsRecords) => {
      if (!address) return;

      const mintChain = await resolveMintChain();
      const fullName = `${label}.${PARENT_NAME}`;
      setState({ step: "signing", mintedName: fullName, txHash: null, error: null });

      // The mint lands on the listing's registry chain — mainnet for an L1
      // listing, Base for an L2 one — regardless of the wallet's current
      // network. The wallet must actually be on it before the clients are
      // fetched: a hook-captured wallet client for a chain the wallet hasn't
      // switched to is undefined, and returning silently here reads as
      // "the button does nothing".
      if (chain?.id !== mintChain.id) {
        try {
          await switchChainAsync({ chainId: mintChain.id });
        } catch (err) {
          if (!mounted.current) return;
          setState({
            ...INITIAL,
            error: isUserRejection(err)
              ? null
              : `Switch to ${mintChain.name} to claim.`,
          });
          return;
        }
      }

      // Fresh clients for the chain the wallet is now on — not hook data
      // captured before the switch.
      const walletClient = await getWalletClient(wagmiConfig, {
        chainId: mintChain.id,
      });
      const publicClient = getPublicClient(wagmiConfig, { chainId: mintChain.id });
      if (!walletClient || !publicClient) {
        if (!mounted.current) return;
        setState({
          ...INITIAL,
          error: `Couldn't reach ${mintChain.name}. Try again.`,
        });
        return;
      }

      let request: Parameters<typeof walletClient.writeContract>[0];

      try {
        // Authoritative pre-flight. `canMint` folds in the token gate, the
        // allowlist, reserved labels and listing expiry — everything our own
        // checks approximate.
        const details = await getMintClient().getMintDetails({
          parentName: PARENT_NAME,
          label,
          minterAddress: address,
          expiryInYears: EXPIRY_IN_YEARS,
        });

        if (!details.canMint) {
          const code = details.validationErrors[0] ?? "";
          if (!mounted.current) return;
          setState({
            ...INITIAL,
            error:
              getTxErrorMessage(code, "This name can't be claimed right now.") ??
              "This name can't be claimed right now.",
          });
          return;
        }

        const params = await getMintClient().getMintTransactionParameters({
          parentName: PARENT_NAME,
          label,
          minterAddress: address,
          owner: address,
          expiryInYears: EXPIRY_IN_YEARS,
          // The ETH address always points at the claimer. Anything the user
          // set in the records step is merged on top, so they can override it
          // deliberately but never end up with a name resolving nowhere.
          records: {
            ...records,
            addresses: [
              { value: address, chain: ChainName.Ethereum },
              ...(records?.addresses ?? []).filter(
                (a) => a.chain !== ChainName.Ethereum,
              ),
            ],
          },
        });

        // Simulating first surfaces a revert as a readable error instead of a
        // wallet prompt the user pays for and then loses.
        const simulation = await publicClient.simulateContract({
          abi: params.abi,
          address: params.contractAddress,
          functionName: params.functionName,
          args: params.args,
          account: address,
          value: params.value,
        });
        request = simulation.request as typeof request;
      } catch (err) {
        if (!mounted.current) return;
        setState({ ...INITIAL, error: getTxErrorMessage(err) });
        return;
      }

      try {
        const hash = await walletClient.writeContract(request);
        if (!mounted.current) return;
        setState((prev) => ({ ...prev, step: "pending", txHash: hash }));

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });
        if (!mounted.current) return;

        // waitForTransactionReceipt resolves for reverted transactions too, so
        // the status has to be read — otherwise a failed mint shows "claimed".
        if (receipt.status !== "success") {
          setState({
            ...INITIAL,
            error: "The transaction failed, so the name wasn't claimed. Try again.",
          });
          return;
        }

        setState((prev) => ({ ...prev, step: "success" }));
        onMinted();
      } catch (err) {
        if (!mounted.current) return;
        setState({ ...INITIAL, error: getTxErrorMessage(err) });
      }
    },
    [address, chain?.id, onMinted, switchChainAsync],
  );

  return { state, mint, reset };
}
