"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EnsRecordsForm } from "@/components/ens/client";
import { EnsScope } from "@/components/ens/EnsScope";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelPanel } from "@/components/ui/PixelPanel";
import { fetchOwnedNames, type OwnedName } from "@/lib/ownedNames";
import { readRecords } from "@/lib/readRecords";
import { EMPTY_RECORDS, type FormRecords } from "@/lib/records";
import { PARENT_NAME } from "@/lib/config";

/**
 * Stored with the address it was fetched for. Comparing that against the
 * connected address derives "loading" without ever calling setState
 * synchronously inside the effect, and makes it impossible to show one
 * wallet's names to another after an account switch.
 */
type ListResult = { address: string; names?: OwnedName[]; error?: string };

type RecordState =
  | { status: "loading" }
  | { status: "ready"; records: FormRecords }
  | { status: "error"; message: string };

export function ManageView({ preview }: { preview: boolean }) {
  const { address, isConnected } = useAccount();
  const client = usePublicClient({ chainId: mainnet.id });
  const { openConnectModal } = useConnectModal();

  const [result, setResult] = useState<ListResult | null>(null);
  const [selected, setSelected] = useState<OwnedName | null>(null);
  const [recordState, setRecordState] = useState<RecordState | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (preview) return;
    if (!address) return;

    let cancelled = false;

    fetchOwnedNames(address)
      .then((names) => {
        if (!cancelled) setResult({ address, names });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          address,
          error: err instanceof Error ? err.message : "Couldn't load names",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [address, preview, nonce]);

  // Records are read before the editor opens. The form diffs against what it's
  // given, so opening it with a failed read would show a blank form whose
  // "save" wipes records that are actually set.
  const openName = useCallback(
    (name: OwnedName) => {
      setSelected(name);
      if (preview || !client) {
        setRecordState({ status: "ready", records: EMPTY_RECORDS });
        return;
      }
      setRecordState({ status: "loading" });
      readRecords(client, name.name)
        .then((records) => setRecordState({ status: "ready", records }))
        .catch((err: unknown) =>
          setRecordState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Couldn't read records",
          }),
        );
    },
    [client, preview],
  );

  const closeName = useCallback(() => {
    setSelected(null);
    setRecordState(null);
  }, []);

  const current = result?.address === address ? result : null;
  const listStatus: "loading" | "ready" | "error" = preview
    ? "ready"
    : !current
      ? "loading"
      : current.error
        ? "error"
        : "ready";

  const names: OwnedName[] = preview
    ? [
        { name: `roar.${PARENT_NAME}`, label: "roar" },
        { name: `mane.${PARENT_NAME}`, label: "mane" },
      ]
    : (current?.names ?? []);

  if (!isConnected && !preview) {
    return (
      <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-amber-300 text-xs uppercase">
            Connect to manage
          </h2>
          <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
            Your names and their records live on-chain. Connect the wallet that
            holds them.
          </p>
          <PixelButton onClick={() => openConnectModal?.()}>
            Connect wallet
          </PixelButton>
        </div>
      </PixelPanel>
    );
  }

  if (selected) {
    return (
      <PixelPanel className="w-full max-w-2xl p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-amber-300 text-xs break-all uppercase">
            {selected.name}
          </h2>
          <PixelButton variant="ghost" onClick={closeName}>
            All names
          </PixelButton>
        </div>

        {recordState?.status === "loading" && (
          <p className="text-ink-400 text-sm">Reading current records…</p>
        )}

        {recordState?.status === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-rose-400 text-sm leading-relaxed">
              Couldn&apos;t read this name&apos;s current records, so the editor
              stays closed — opening it blank would risk clearing records that
              are already set.
            </p>
            <p className="text-ink-500 text-xs">{recordState.message}</p>
            <PixelButton variant="secondary" onClick={() => openName(selected)}>
              Try again
            </PixelButton>
          </div>
        )}

        {recordState?.status === "ready" && (
          <EnsScope>
            <EnsRecordsForm
              name={selected.name}
              existingRecords={recordState.records}
              onCancel={closeName}
              onRecordsUpdated={() => {
                // Re-read after a save so the list and the next open reflect
                // what actually landed on-chain.
                setNonce((n) => n + 1);
                openName(selected);
              }}
            />
          </EnsScope>
        )}
      </PixelPanel>
    );
  }

  return (
    <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-amber-300 text-xs uppercase">
            Your names
          </h2>
          <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
            Pick one to set its avatar, addresses and other records.
          </p>
        </div>

        {listStatus === "loading" && (
          <p className="text-ink-400 text-sm">Loading…</p>
        )}

        {listStatus === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-rose-400 text-sm">{current?.error}</p>
            <PixelButton
              variant="secondary"
              onClick={() => setNonce((n) => n + 1)}
            >
              Try again
            </PixelButton>
          </div>
        )}

        {names.length === 0 && listStatus === "ready" && (
          <div className="flex flex-col gap-4">
            <p className="text-ink-300 text-sm leading-relaxed">
              This wallet doesn&apos;t hold any {PARENT_NAME} names yet.
            </p>
            <Link href="/">
              <PixelButton className="w-full">Claim one</PixelButton>
            </Link>
          </div>
        )}

        {names.length > 0 && (
          <ul className="flex flex-col gap-2">
            {names.map((n) => (
              <li key={n.name}>
                <button
                  type="button"
                  onClick={() => openName(n)}
                  className="border-edge bg-raised hover:border-amber-400 flex w-full cursor-pointer items-center gap-3 border-2 p-3 text-left transition-colors duration-150"
                >
                  <span className="text-ink-100 min-w-0 flex-1 truncate text-sm">
                    {n.name}
                  </span>
                  <span className="font-display text-ink-500 shrink-0 text-[9px] uppercase">
                    Edit
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PixelPanel>
  );
}
