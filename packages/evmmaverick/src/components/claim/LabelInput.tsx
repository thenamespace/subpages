"use client";

import { PARENT_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";
import type { Availability } from "@/hooks/useAvailability";

interface LabelInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  availability: Availability;
  /** Client-side validation message, shown before availability is consulted. */
  validationError: string | null;
  disabled: boolean;
}

/**
 * The name field.
 *
 * `.evmaverick.eth` is rendered as a static suffix rather than left in the
 * input, so there's nothing to delete by accident and no ambiguity about what
 * the user is actually naming. 16px minimum font size — anything smaller and
 * iOS Safari zooms the viewport on focus.
 */
export function LabelInput({
  value,
  onChange,
  onSubmit,
  availability,
  validationError,
  disabled,
}: LabelInputProps) {
  const hint = describe(availability, validationError, value);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="label"
        className="font-display text-ink-300 text-[10px] uppercase tracking-[0.14em]"
      >
        Choose your name
      </label>

      <div
        className={cn(
          "flex items-stretch border-2 bg-raised transition-colors duration-150",
          "focus-within:border-amber-400",
          hint?.tone === "bad" ? "border-rose-600" : "border-edge-strong",
          disabled && "opacity-100 border-ink-700 bg-ink-900",
        )}
      >
        <input
          id="label"
          name="label"
          value={value}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder="yourname"
          aria-describedby="label-hint"
          aria-invalid={hint?.tone === "bad" || undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          className={cn(
            // 16px floor: smaller and iOS zooms the page on focus.
            "min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base",
            "text-ink-100 placeholder:text-ink-500",
            "outline-none disabled:text-ink-500 disabled:cursor-not-allowed",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center border-l-2 border-edge-strong px-3",
            "text-sm text-ink-400 select-none",
          )}
        >
          .{PARENT_NAME}
        </span>
      </div>

      {/* Reserved height stops the card jumping as hints appear and clear. */}
      <p
        id="label-hint"
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-[1.25rem] text-xs",
          hint?.tone === "bad" && "text-rose-400",
          hint?.tone === "good" && "text-jade-400",
          hint?.tone === "neutral" && "text-ink-400",
        )}
      >
        {hint?.text ?? ""}
      </p>
    </div>
  );
}

type Hint = { text: string; tone: "good" | "bad" | "neutral" };

function describe(
  availability: Availability,
  validationError: string | null,
  value: string,
): Hint | null {
  if (validationError) return { text: validationError, tone: "bad" };
  if (value.length === 0) return null;

  switch (availability.status) {
    case "checking":
      return { text: "Checking…", tone: "neutral" };
    case "available":
      return { text: "Available.", tone: "good" };
    case "taken":
      return { text: "Already taken. Try another.", tone: "bad" };
    case "error":
      return { text: "Couldn't check that name. Try again.", tone: "bad" };
    default:
      return null;
  }
}
