"use client";

import { useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { EnsRecordsForm } from "@/components/ens/client";
import { EnsScope } from "@/components/ens/EnsScope";
import { PixelButton } from "@/components/ui/PixelButton";
import type { NameChain } from "@/lib/nameChain";
import type { FormRecords } from "@/lib/records";

/**
 * EnsRecordsForm with the wallet client made ready before it's needed.
 *
 * The library writes with `useWalletClient({ chainId })` and never checks that
 * it resolved. That query first runs while the wallet is still on the wrong
 * chain, fails with a chain mismatch, and isn't retried after the switch
 * because its key doesn't change, so "save" hits an undefined client. This
 * subscribes to the same query (same parameters, so the same cache entry),
 * refetches it once the wallet is on the right chain, and holds the form back
 * until it has data. Off-chain, the form renders as-is so its own switch
 * prompt shows.
 */
export function RecordsEditor({
  name,
  records,
  nameChain,
  onCancel,
  onUpdated,
}: {
  name: string;
  records: FormRecords;
  nameChain: NameChain;
  onCancel: () => void;
  onUpdated: () => void;
}) {
  const chainId = nameChain.chain.id;
  const { chain } = useAccount();
  const onChain = chain?.id === chainId;
  const { data: walletClient, error, refetch, isFetching } = useWalletClient({
    chainId,
  });

  useEffect(() => {
    if (onChain && !walletClient && !isFetching) void refetch();
    // isFetching is left out on purpose: re-running on it would retry in a
    // loop when the wallet keeps refusing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChain, walletClient, refetch]);

  if (onChain && !walletClient) {
    return error && !isFetching ? (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-rose-400 text-sm leading-relaxed">
          Couldn&apos;t reach your wallet on {nameChain.chain.name}.
        </p>
        <PixelButton variant="secondary" onClick={() => void refetch()}>
          Try again
        </PixelButton>
      </div>
    ) : (
      <p className="text-ink-400 text-sm">Connecting to your wallet…</p>
    );
  }

  return (
    <EnsScope>
      <EnsRecordsForm
        name={name}
        existingRecords={records}
        // Unset for L1 names, where the form finds the resolver through
        // mainnet ENS. L2 names aren't in mainnet ENS at all.
        resolverChainId={chainId}
        resolverAddress={nameChain.resolver}
        // Enables avatar and header uploads. The library authenticates with a
        // SIWE signature against the name, which is why this can only be
        // offered here: on the claim page the name does not exist on-chain
        // yet, so there is no ownership to prove.
        avatarUploadDomain={
          typeof window === "undefined" ? undefined : window.location.hostname
        }
        onCancel={onCancel}
        onRecordsUpdated={onUpdated}
      />
    </EnsScope>
  );
}
