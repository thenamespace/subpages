"use client";

import { PixelButton } from "@/components/ui/PixelButton";
import { usePrimaryName } from "@/hooks/usePrimaryName";
import { cn } from "@/lib/cn";

/**
 * Sets `name` as the wallet's primary ENS name, so apps show it in place of
 * the 0x address. Once it's primary the button gives way to a quiet badge —
 * there's nothing left to do, and a disabled button would look broken.
 */
export function SetPrimaryButton({
  name,
  preview = false,
  variant = "secondary",
  className,
}: {
  name: string;
  preview?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { state, setPrimary } = usePrimaryName(name, preview);
  const { step, error } = state;

  if (step === "done") {
    return (
      <p
        role="status"
        className={cn(
          "font-display text-jade-400 border-jade-400/40 border-2 px-4 py-3 text-center text-[10px] uppercase tracking-[0.14em]",
          className,
        )}
      >
        Primary name set
      </p>
    );
  }

  const busy = step === "signing" || step === "pending";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PixelButton
        variant={variant}
        loading={busy}
        // Checking is a quick read; the button stays put so nothing jumps.
        disabled={step === "checking"}
        onClick={() => void setPrimary()}
      >
        {step === "signing"
          ? "Confirm in wallet"
          : step === "pending"
            ? "Setting primary…"
            : "Set as primary name"}
      </PixelButton>
      {error && (
        <p role="alert" className="text-rose-400 text-xs leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
