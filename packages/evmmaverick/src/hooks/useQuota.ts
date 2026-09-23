"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { PARENT_NAME } from "@/lib/config";
import { computeQuota, IDLE_QUOTA, type Quota } from "@/lib/quota";
import { previewQuota, type PreviewState } from "@/lib/preview";

export interface UseQuota {
  quota: Quota;
  /** Re-read both sources. Called on retry and after a confirmed mint. */
  refresh: () => void;
  /**
   * Count a mint we've seen confirm but the indexer hasn't picked up yet.
   * Without this the button unlocks for the ~10s indexing gap — precisely
   * when an impatient user clicks again.
   */
  registerLocalMint: () => void;
}

export function useQuota(preview: PreviewState | null): UseQuota {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: mainnet.id });

  // Stored with the address it was read for. Deriving the returned value from
  // that comparison handles disconnect, account switching and the first load
  // without any of them needing a setState inside the effect body — and it
  // makes it impossible to show wallet A's numbers to wallet B.
  const [live, setLive] = useState<{ address: string; quota: Quota } | null>(
    null,
  );
  const [nonce, setNonce] = useState(0);
  const pendingLocal = useRef(0);

  // Pending mints belong to one wallet. Switching accounts must clear them,
  // or wallet B inherits wallet A's phantom claim.
  useEffect(() => {
    pendingLocal.current = 0;
  }, [address]);

  useEffect(() => {
    if (preview || !address || !client) return;

    let cancelled = false;
    void computeQuota(PARENT_NAME, address, client, pendingLocal.current).then(
      (next) => {
        if (!cancelled) setLive({ address, quota: next });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [address, client, nonce, preview]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const registerLocalMint = useCallback(() => {
    pendingLocal.current += 1;
    // Applied immediately so the pip row and the button update on the same
    // frame the success screen appears, then reconciled on the next read.
    setLive((prev) => {
      if (!prev) return prev;
      const { quota } = prev;
      if (quota.status === "error" || quota.status === "idle") return prev;
      const claimed = quota.claimed + 1;
      const remaining = Math.max(0, quota.held - claimed);
      return {
        ...prev,
        quota: {
          ...quota,
          claimed,
          remaining,
          status: remaining === 0 ? "spent" : "ready",
        },
      };
    });
  }, []);

  let quota: Quota;
  if (preview) {
    quota = previewQuota(preview);
  } else if (!address || !client) {
    quota = IDLE_QUOTA;
  } else if (live?.address === address) {
    quota = live.quota;
  } else {
    // Connected, but this wallet's first read hasn't landed. Report checking
    // rather than idle, which the UI would render as "not connected".
    quota = { ...IDLE_QUOTA, status: "checking" };
  }

  return { quota, refresh, registerLocalMint };
}
