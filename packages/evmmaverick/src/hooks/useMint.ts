"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { ChainName } from "@namespacesdk/mint-manager";
import { EXPIRY_IN_YEARS, PARENT_NAME } from "@/lib/config";
import { getMintClient } from "@/lib/mintClient";
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

export function useMint(onMinted: () => void) {
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: mainnet.id });
  const publicClient = usePublicClient({ chainId: mainnet.id });
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
    async (label: string) => {
      if (!address || !walletClient || !publicClient) return;

      const fullName = `${label}.${PARENT_NAME}`;
      setState({ step: "signing", mintedName: fullName, txHash: null, error: null });

      // The gate NFT and the parent name are both on mainnet, so this is the
      // only network hop in the whole flow.
      if (chain?.id !== mainnet.id) {
        try {
          await switchChainAsync({ chainId: mainnet.id });
        } catch (err) {
          if (!mounted.current) return;
          setState({
            ...INITIAL,
            error: isUserRejection(err)
              ? null
              : "Switch to Ethereum mainnet to claim.",
          });
          return;
        }
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
          records: {
            addresses: [{ value: address, chain: ChainName.Ethereum }],
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
            error: "The transaction reverted — the name wasn't claimed.",
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
    [address, chain?.id, onMinted, publicClient, switchChainAsync, walletClient],
  );

  return { state, mint, reset };
}
