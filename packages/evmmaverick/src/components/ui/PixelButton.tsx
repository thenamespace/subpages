"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

/**
 * The arcade button.
 *
 * Depth comes from a hard offset shadow, and pressing moves the button into
 * that shadow — `translate(3px,3px)` paired with the shadow shrinking to zero.
 * That's the whole trick, and it's why the transition is 70ms: a button that
 * eases into a press feels mushy, an arcade button does not.
 *
 * Disabled uses a dedicated muted token rather than `opacity`, so contrast is
 * predictable instead of depending on whatever sits behind it.
 */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  function PixelButton(
    { variant = "primary", loading, disabled, className, children, ...props },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "font-display relative inline-flex items-center justify-center gap-2",
          "px-5 py-3.5 text-[11px] uppercase tracking-[0.12em] select-none",
          "border-2 transition-[transform,box-shadow,background-color] duration-[70ms] ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          !isDisabled && [
            "cursor-pointer",
            "shadow-[4px_4px_0_var(--color-ink-950)]",
            "active:translate-x-[3px] active:translate-y-[3px]",
            "active:shadow-[1px_1px_0_var(--color-ink-950)]",
          ],
          variant === "primary" &&
            !isDisabled && [
              "bg-amber-400 text-ink-950 border-amber-200",
              "hover:bg-amber-300",
            ],
          variant === "secondary" &&
            !isDisabled && [
              "bg-ink-800 text-ink-200 border-ink-600",
              "hover:bg-ink-700 hover:border-ink-500",
            ],
          variant === "ghost" &&
            !isDisabled && [
              "bg-transparent text-ink-300 border-transparent shadow-none",
              "hover:text-amber-300 active:translate-x-0 active:translate-y-0",
              "active:shadow-none",
            ],
          isDisabled && [
            "cursor-not-allowed bg-ink-800 text-ink-400 border-ink-700",
            "shadow-none",
          ],
          className,
        )}
        {...props}
      >
        {loading && <PixelSpinner />}
        {children}
      </button>
    );
  },
);

/**
 * Four blocks chasing each other around a square. No SVG, no blur, no
 * sub-pixel rotation — a spinning circle next to pixel type looks imported
 * from a different website.
 */
function PixelSpinner() {
  return (
    <span
      aria-hidden
      className="relative inline-block size-3 shrink-0"
      style={{ animation: "pixel-spin 640ms steps(4) infinite" }}
    >
      <span className="absolute left-0 top-0 size-1.5 bg-current" />
      <style>{`
        @keyframes pixel-spin {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}
