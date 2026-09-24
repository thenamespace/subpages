"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { PixelButton } from "@/components/ui/PixelButton";
import { fetchOwnedNames } from "@/lib/ownedNames";
import { PARENT_NAME } from "@/lib/config";
import { SetPrimaryButton } from "./SetPrimaryButton";

/** Past this, the rest live on the manage page rather than a long card. */
const MAX_SHOWN = 3;

const PREVIEW_NAMES = [`roar.${PARENT_NAME}`, `mane.${PARENT_NAME}`];

/**
 * The "spent" state. The holder has nothing left to claim, so the useful
 * next steps are making a name primary or editing its records.
 */
export function AlreadyClaimed({
  preview,
  onManage,
}: {
  preview: boolean;
  onManage: () => void;
}) {
  const { address } = useAccount();
  // Keyed by address, same as ManageView, so an account switch can't show
  // one wallet's names to another.
  const [result, setResult] = useState<{
    address: string;
    names: string[] | null;
  } | null>(null);

  useEffect(() => {
    if (preview || !address) return;
    let cancelled = false;
    fetchOwnedNames(address)
      .then((owned) => {
        if (!cancelled) setResult({ address, names: owned.map((n) => n.name) });
      })
      // The list is a convenience here. If it fails, the manage button still
      // gets them to their names.
      .catch(() => {
        if (!cancelled) setResult({ address, names: null });
      });
    return () => {
      cancelled = true;
    };
  }, [address, preview]);

  const names = preview
    ? PREVIEW_NAMES
    : result && result.address === address
      ? result.names
      : undefined;
  const shown = names?.slice(0, MAX_SHOWN) ?? [];
  const hidden = (names?.length ?? 0) - shown.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-ink-100 text-xs uppercase">
          Already claimed
        </h2>
        <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
          You&apos;ve already claimed your name. Set it as your primary name so
          apps show it instead of your address, or add an avatar and records.
        </p>
      </div>

      {names === undefined && (
        <p className="text-ink-400 min-h-[7rem] text-sm">Loading your names…</p>
      )}

      {shown.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shown.map((name) => (
            <li
              key={name}
              className="border-edge bg-raised flex flex-col gap-3 border-2 p-4"
            >
              <span className="text-ink-100 truncate text-sm">{name}</span>
              <SetPrimaryButton
                name={name}
                preview={preview}
                variant="primary"
              />
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="text-ink-400 text-xs">
          {hidden} more in Manage names.
        </p>
      )}

      <PixelButton variant="secondary" onClick={onManage}>
        Manage names
      </PixelButton>
    </div>
  );
}
