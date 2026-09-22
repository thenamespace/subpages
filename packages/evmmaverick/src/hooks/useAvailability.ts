"use client";

import { useEffect, useState } from "react";
import { PARENT_NAME } from "@/lib/config";
import { getMintClient } from "@/lib/mintClient";

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
          const available = await getMintClient().isL1SubnameAvailable(
            `${label}.${PARENT_NAME}`,
          );
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
