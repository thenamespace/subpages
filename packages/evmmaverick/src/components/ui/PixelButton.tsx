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
    // Loading keeps the variant's colours so an in-flight action doesn't
    // read as a disabled or failed one; only a truly disabled button greys out.
    const showVariant = !disabled || loading;
    const ghost = variant === "ghost";

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "font-display relative inline-flex items-center justify-center gap-2",
          "px-5 py-3.5 text-[11px] uppercase tracking-[0.12em] select-none",
          "border-2 transition-[transform,box-shadow,background-color,border-color,color] duration-[70ms] ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          !isDisabled && "cursor-pointer",
          loading && "cursor-wait",
          // Depth and the press, for the raised variants only.
          !ghost && !isDisabled && [
            "shadow-[4px_4px_0_var(--color-ink-950)]",
            "active:translate-x-[3px] active:translate-y-[3px]",
            "active:shadow-[1px_1px_0_var(--color-ink-950)]",
          ],
          variant === "primary" &&
            showVariant && [
              "bg-amber-400 text-ink-950 border-amber-200",
              !isDisabled && "hover:bg-amber-300",
            ],
          variant === "secondary" &&
            showVariant && [
              "bg-ink-800 text-ink-200 border-ink-600",
              !isDisabled && "hover:bg-ink-700 hover:border-ink-500",
            ],
          ghost && [
            "bg-transparent border-transparent",
            showVariant ? "text-ink-300" : "text-ink-500",
            !isDisabled && "hover:text-amber-300",
          ],
          !ghost &&
            !showVariant && [
              "cursor-not-allowed bg-ink-800 text-ink-400 border-ink-700",
            ],
          !ghost && loading && "shadow-[4px_4px_0_var(--color-ink-950)]",
          ghost && disabled && "cursor-not-allowed",
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
