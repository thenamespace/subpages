"use client";

import { useEffect, useState } from "react";
import { mainnet } from "wagmi/chains";
import { PARENT_NAME } from "@/lib/config";
import { getMintClient } from "@/lib/mintClient";
import { resolveNameChain } from "@/lib/nameChain";

export type Availability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error" };

type Verdict = {
  label: string;
  status: "available" | "taken" | "error";
};

const DEBOUNCE_MS = 350;

/**
 * Debounced availability check for a normalised label.
 *
 * The stored verdict carries the label it was about, and the returned status
 * is derived by comparing that label to the current one. Anything that
 * doesn't match reads as "checking", so a slow response for "ma" can never
 * paint "available" next to "maverick". That comparison also means idle and
 * checking are computed during render rather than pushed through state.
 */
export function useAvailability(label: string | null): Availability {
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    if (!label) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          // L2 names live in their registry, not in mainnet ENS, so the SDK
          // exposes a separate check that takes the registry's chain id. A
          // listing that can't be read throws, which surfaces as RETRY.
          const { chain } = await resolveNameChain();
          const client = getMintClient();
          const fullName = `${label}.${PARENT_NAME}`;
          const available =
            chain.id === mainnet.id
              ? await client.isL1SubnameAvailable(fullName)
              : await client.isL2SubnameAvailable(fullName, chain.id);
          if (!cancelled) {
            setVerdict({ label, status: available ? "available" : "taken" });
          }
        } catch {
          if (!cancelled) setVerdict({ label, status: "error" });
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [label]);

  if (!label) return { status: "idle" };
  if (verdict?.label === label) return { status: verdict.status };
  return { status: "checking" };
}
