"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useEnsName, useSwitchChain } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { mainnet } from "wagmi/chains";
import { parseAbi } from "viem";
import { normalize } from "viem/ens";
import { wagmiConfig } from "@/lib/wagmi";
import { getTxErrorMessage, isUserRejection } from "@/lib/txError";

/** Mainnet ENS ReverseRegistrar — the same address ensjs uses for `setPrimaryName`. */
const REVERSE_REGISTRAR = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb" as const;
const REVERSE_ABI = parseAbi([
  "function setName(string name) returns (bytes32)",
]);

export type PrimaryStep = "checking" | "idle" | "signing" | "pending" | "done";

export interface PrimaryState {
  step: PrimaryStep;
  error: string | null;
}

/**
 * Reads whether `name` is already the connected wallet's primary name, and
 * sets it when asked. In preview mode nothing touches a wallet: the button
 * flips straight to done so the screen can be reviewed.
 */
export function usePrimaryName(name: string, preview = false) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Shared through wagmi's query cache, so every button on the page reads the
  // same answer and all of them update when one sets a new primary name.
  // getEnsName verifies the forward record too, so a stale reverse record
  // that no longer resolves back doesn't count.
  const current = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !preview && Boolean(address) },
  });

  const [tx, setTx] = useState<{
    step: "idle" | "signing" | "pending";
    error: string | null;
  }>({ step: "idle", error: null });
  const [previewDone, setPreviewDone] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const isPrimary = preview
    ? previewDone
    : current.data?.toLowerCase() === name.toLowerCase();

  // A failed read only hides the "already primary" badge; the button still
  // works, so it isn't surfaced as an error.
  const state: PrimaryState =
    tx.step !== "idle"
      ? tx
      : isPrimary
        ? { step: "done", error: null }
        : !preview && current.isPending && current.fetchStatus !== "idle"
          ? { step: "checking", error: null }
          : tx;

  const inFlight = useRef(false);
  const { refetch } = current;

  const setPrimary = useCallback(async () => {
    if (preview) {
      setPreviewDone(true);
      return;
    }
    if (!address || inFlight.current) return;
    inFlight.current = true;

    const fail = (error: string | null) => {
      if (mounted.current) setTx({ step: "idle", error });
    };

    try {
      setTx({ step: "signing", error: null });

      if (chainId !== mainnet.id) {
        try {
          await switchChainAsync({ chainId: mainnet.id });
        } catch (err) {
          fail(isUserRejection(err) ? null : "Switch to Ethereum to continue.");
          return;
        }
      }

      const publicClient = getPublicClient(wagmiConfig, {
        chainId: mainnet.id,
      });
      const walletClient = await getWalletClient(wagmiConfig, {
        chainId: mainnet.id,
      });
      if (!publicClient || !walletClient) {
        fail("Couldn't reach Ethereum. Try again.");
        return;
      }

      // A primary name only takes effect when the name points back at the
      // wallet. setName itself never reverts on a mismatch, so without this
      // check the user pays gas for a reverse record nothing will honour.
      let resolved: string | null;
      try {
        resolved = await publicClient.getEnsAddress({ name: normalize(name) });
      } catch {
        resolved = null;
      }
      if (resolved?.toLowerCase() !== address.toLowerCase()) {
        fail(
          `${name} doesn't point to this wallet yet. Give it a minute and try again, or set its ETH address under Manage records.`,
        );
        return;
      }

      let request: Parameters<typeof walletClient.writeContract>[0];
      try {
        const sim = await publicClient.simulateContract({
          address: REVERSE_REGISTRAR,
          abi: REVERSE_ABI,
          functionName: "setName",
          args: [name],
          account: address,
        });
        request = sim.request as typeof request;
      } catch (err) {
        fail(getTxErrorMessage(err));
        return;
      }

      const hash = await walletClient.writeContract(request);
      if (!mounted.current) return;
      setTx({ step: "pending", error: null });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!mounted.current) return;
      if (receipt.status !== "success") {
        fail("The transaction failed, so your primary name didn't change.");
        return;
      }
      // Stay "pending" until the shared read catches up, so the button
      // doesn't flash back to "Set as primary" before the badge appears.
      await refetch();
      if (mounted.current) setTx({ step: "idle", error: null });
    } catch (err) {
      fail(getTxErrorMessage(err));
    } finally {
      inFlight.current = false;
    }
  }, [address, chainId, name, preview, refetch, switchChainAsync]);

  return { state, setPrimary };
}
