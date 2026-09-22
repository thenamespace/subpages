"use client";

import { PARENT_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";
import type { LabelError } from "@/lib/normalize";
import type { Availability } from "@/hooks/useAvailability";
import {
  useNameFieldStatus,
  type NameStatus,
} from "@/hooks/useNameFieldStatus";

export interface LabelInputProps {
  value: string;
  onChange: (value: string) => void;
  availability: Availability;
  /** Raw validation result for the current value; the field decides when
   *  it's fair to show it. `null` when valid or empty. */
  labelError: LabelError | null;
  /** The normalised `label.evmaverick.eth`, or null while invalid. */
  fullName: string | null;
  disabled: boolean;
}

/**
 * The name field, with its name plate.
 *
 * `.evmaverick.eth` is rendered as a static suffix rather than left in the
 * input, so there's nothing to delete by accident and no ambiguity about what
 * the user is actually naming. 16px minimum font size — anything smaller and
 * iOS Safari zooms the viewport on focus.
 *
 * Under the field, a fixed-height arcade plate spells out the full
 * NAME.EVMAVERICK.ETH as it's typed, and a verdict is stamped onto it: WAIT,
 * FREE, TAKEN, SHORT, NOPE, RETRY. The status is always a word in a box,
 * never colour alone. The plate is decorative; the same status is announced
 * in words through a visually hidden live region.
 */
export function LabelInput({
  value,
  onChange,
  availability,
  labelError,
  fullName,
  disabled,
}: LabelInputProps) {
  const { status, isBad, inputProps, focusFromFrame } = useNameFieldStatus({
    value,
    onChange,
    availability,
    labelError,
  });

  const stamp = stampFor(status);
  // Live preview of what's being claimed. Uses the normalised name once it's
  // valid, so the plate shows what the registry will actually see.
  const shown = fullName ?? `${value || "yourname"}.${PARENT_NAME}`;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="label"
        className="font-display text-ink-300 text-[10px] uppercase tracking-[0.14em]"
      >
        Choose your name
      </label>

      <div
        // The suffix is part of the field visually, so clicking it should
        // behave like clicking the field. Mouse-only nicety: keyboard and
        // screen-reader users reach the input directly.
        onMouseDown={focusFromFrame}
        className={cn(
          "flex cursor-text items-stretch border-2 bg-raised transition-colors duration-150",
          // An error keeps its border while the field is focused, so the
          // problem stays visible as the user corrects it.
          isBad
            ? "border-rose-600"
            : [
                "border-edge-strong focus-within:border-amber-400",
                "not-focus-within:hover:border-ink-500",
              ],
          disabled && "cursor-not-allowed border-ink-700 bg-ink-900",
        )}
      >
        <input
          {...inputProps}
          disabled={disabled}
          className={cn(
            // 16px floor: smaller and iOS zooms the page on focus.
            "min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base",
            "text-ink-100 placeholder:text-ink-500",
            "outline-none disabled:text-ink-500 disabled:cursor-not-allowed",
          )}
        />
        <span
          aria-hidden
          className="text-ink-400 flex shrink-0 items-center border-l-2 border-inherit px-3 text-sm select-none"
        >
          .{PARENT_NAME}
        </span>
      </div>

      {/* The plate. Fixed height, two fixed lines: nothing below it moves. */}
      <div
        aria-hidden
        data-name-plate
        className="border-edge bg-canvas flex h-16 items-center gap-3 border-2 px-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            className={cn(
              "font-display truncate text-[10px] uppercase leading-none",
              value ? "text-amber-300" : "text-ink-500",
            )}
          >
            {shown}
          </span>
          <span className="text-ink-400 truncate text-xs leading-none">
            {detail(status)}
          </span>
        </div>

        {/* Fixed-width stamp slot so the name's truncation point never
            jumps as the verdict changes length. */}
        <span className="grid w-[5.5rem] shrink-0 place-items-center">
          {stamp && (
            <span
              key={status.kind}
              className={cn(
                "font-display border-2 px-1.5 py-1 text-[10px] leading-none uppercase",
                status.kind !== "checking" && "animate-stamp -rotate-4",
                stamp.className,
              )}
            >
              {stamp.text}
              {status.kind === "checking" && (
                <span className="animate-cursor-blink ml-0.5 inline-block">
                  _
                </span>
              )}
            </span>
          )}
        </span>
      </div>

      {/* The accessible status, in words. The plate above is decorative. */}
      <p id="label-hint" role="status" aria-live="polite" className="sr-only">
        {announcement(status, fullName)}
      </p>
    </div>
  );
}

function stampFor(status: NameStatus) {
  switch (status.kind) {
    case "checking":
      return { text: "Wait", className: "border-ink-600 text-ink-300" };
    case "available":
      return { text: "Free", className: "border-jade-400 text-jade-400" };
    case "taken":
      return { text: "Taken", className: "border-rose-400 text-rose-400" };
    case "check-failed":
      return { text: "Retry", className: "border-amber-400 text-amber-300" };
    case "invalid":
      return {
        text: status.error === "too-short" ? "Short" : "Nope",
        className: "border-rose-400 text-rose-400",
      };
    default:
      return null;
  }
}

function detail(status: NameStatus) {
  switch (status.kind) {
    case "checking":
      return "Checking availability…";
    case "available":
      return "Yours to claim.";
    case "taken":
      return "Someone got here first. Try another.";
    case "check-failed":
      return "Couldn't check. Edit the name to retry.";
    case "invalid":
      return status.message;
    default:
      return "This is how your name will read.";
  }
}

function announcement(status: NameStatus, fullName: string | null) {
  switch (status.kind) {
    case "checking":
      return "Checking availability…";
    case "available":
      return `Available: ${fullName}`;
    case "taken":
      return "Taken. Try another name.";
    case "check-failed":
      return "Couldn't check this name. Edit it to try again.";
    case "invalid":
      return status.message;
    default:
      return "";
  }
}
