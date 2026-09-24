"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { RecordsEditor } from "@/components/manage/RecordsEditor";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelPanel } from "@/components/ui/PixelPanel";
import { PixelDialog } from "@/components/ui/PixelDialog";
import { SetPrimaryButton } from "@/components/claim/SetPrimaryButton";
import { fetchOwnedNames, type OwnedName } from "@/lib/ownedNames";
import { L1_NAME_CHAIN, nameChainFor, type NameChain } from "@/lib/nameChain";
import { readRecords } from "@/lib/readRecords";
import { EMPTY_RECORDS, type FormRecords } from "@/lib/records";
import { GATE_TOKEN_NAME, PARENT_NAME } from "@/lib/config";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * Stored with the address it was fetched for. Comparing that against the
 * connected address derives "loading" without ever calling setState
 * synchronously inside the effect, and makes it impossible to show one
 * wallet's names to another after an account switch.
 */
type ListResult = { address: string; names?: OwnedName[]; error?: string };

type RecordState =
  | { status: "loading" }
  | { status: "ready"; records: FormRecords; nameChain: NameChain }
  | { status: "error"; message: string };

export function ManageView({ preview }: { preview: boolean }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const router = useRouter();

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
  //
  // Which chain to read from comes from where the indexer says the name was
  // minted: mainnet ENS, or Namespace's Base resolver for L2 names. The editor
  // gets the same chain and resolver, so reads and writes land in one place.
  const openName = useCallback(
    (name: OwnedName) => {
      setSelected(name);
      if (preview) {
        setRecordState({
          status: "ready",
          records: EMPTY_RECORDS,
          nameChain: L1_NAME_CHAIN,
        });
        return;
      }
      setRecordState({ status: "loading" });
      const nameChain = nameChainFor(name.chainId);
      const client = getPublicClient(wagmiConfig, {
        chainId: nameChain.chain.id,
      });
      if (!client) {
        setRecordState({
          status: "error",
          message: `No client for ${nameChain.chain.name}`,
        });
        return;
      }
      readRecords(client, name.name, nameChain.resolver)
        .then((records) =>
          setRecordState({ status: "ready", records, nameChain }),
        )
        .catch((err: unknown) =>
          setRecordState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Couldn't read records",
          }),
        );
    },
    [preview],
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
        { name: `roar.${PARENT_NAME}`, label: "roar", chainId: 1 },
        { name: `mane.${PARENT_NAME}`, label: "mane", chainId: 1 },
      ]
    : (current?.names ?? []);

  if (!isConnected && !preview) {
    return (
      <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-ink-100 text-xs uppercase">
              Connect to manage
            </h2>
            <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
              Connect the wallet that holds your .{PARENT_NAME} names.
            </p>
          </div>
          <PixelButton onClick={() => openConnectModal?.()}>
            Connect wallet
          </PixelButton>
        </div>
      </PixelPanel>
    );
  }

  return (
    <>
      <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-ink-100 text-xs uppercase">
              Your names
            </h2>
            <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
              Pick one to set its avatar, addresses and other records.
            </p>
          </div>

          {listStatus === "loading" && (
            // Holds roughly two name rows so the panel doesn't jump when the
            // list resolves — the same fixed-space rule the name plate follows.
            <p className="text-ink-400 min-h-[7rem] text-sm">
              Loading your names…
            </p>
          )}

          {listStatus === "error" && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-rose-400 text-sm leading-relaxed">
                {current?.error}
              </p>
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
                No .{PARENT_NAME} names in this wallet yet. If you hold an{" "}
                {GATE_TOKEN_NAME} NFT, you can claim one for free.
              </p>
              {/* A button, not a button inside a link: nested interactive
                  elements give keyboard users two tab stops for one action. */}
              <PixelButton className="w-full" onClick={() => router.push("/")}>
                Claim a name
              </PixelButton>
            </div>
          )}

          {names.length > 0 && (
            <ul className="flex flex-col gap-2">
              {names.map((n) => (
                <li key={n.name}>
                  <button
                    type="button"
                    onClick={() => openName(n)}
                    className="group border-edge bg-raised hover:border-amber-400 flex w-full cursor-pointer items-center gap-3 border-2 px-4 py-3 text-left transition-colors duration-150"
                  >
                    <span className="text-ink-100 min-w-0 flex-1 truncate text-sm">
                      {n.name}
                    </span>
                    <span className="font-display text-ink-400 group-hover:text-amber-300 shrink-0 text-[10px] uppercase tracking-[0.14em] transition-colors duration-150">
                      Edit
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PixelPanel>

      <PixelDialog
        open={Boolean(selected)}
        onOpenChange={(next) => {
          if (!next) closeName();
        }}
        title={selected?.name ?? ""}
        description="All changes save in one transaction."
      >
        {selected && (
          <SetPrimaryButton
            name={selected.name}
            preview={preview}
            className="mb-6"
          />
        )}

        {recordState?.status === "loading" && (
          <p className="text-ink-400 text-sm">Reading current records…</p>
        )}

        {recordState?.status === "error" && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-rose-400 text-sm leading-relaxed">
              Couldn&apos;t load this name&apos;s records. The editor stays
              closed so an empty form can&apos;t wipe what&apos;s already set.
            </p>
            <p className="text-ink-400 text-xs">{recordState.message}</p>
            <PixelButton
              variant="secondary"
              onClick={() => selected && openName(selected)}
            >
              Try again
            </PixelButton>
          </div>
        )}

        {recordState?.status === "ready" && selected && (
          <RecordsEditor
            name={selected.name}
            records={recordState.records}
            nameChain={recordState.nameChain}
            onCancel={closeName}
            onUpdated={() => {
              setNonce((n) => n + 1);
              openName(selected);
            }}
          />
        )}
      </PixelDialog>
    </>
  );
}
