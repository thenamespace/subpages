"use client";

import { useEffect, useRef, useState } from "react";
import {
  labelErrorMessage,
  stripWhitespace,
  type LabelError,
} from "@/lib/normalize";
import type { Availability } from "@/hooks/useAvailability";

/** How long typing has to stop before "too short" is fair to mention. */
export const PAUSE_MS = 700;

/**
 * How long a check has to run before the loader appears. The availability
 * hook debounces 350ms, so this leaves ~150ms of network time: a fast answer
 * goes straight from nothing to a verdict with no loader flashing in between.
 */
export const CHECKING_REVEAL_MS = 500;

export type NameStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "check-failed" }
  | { kind: "invalid"; message: string; error: LabelError };

/**
 * Behaviour of the name field, separate from how it looks: whitespace
 * stripping with the caret kept in place, "too short" held back until the
 * user pauses, and a loader that only appears for a slow check.
 *
 * Returns the status to render and the props to spread onto the <input>.
 */
export function useNameFieldStatus({
  value,
  onChange,
  availability,
  labelError,
}: {
  value: string;
  onChange: (value: string) => void;
  availability: Availability;
  labelError: LabelError | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "Too short" waits until the user pauses, leaves the field or presses
  // Enter. Once they have, it stays live, so fixing it clears the error on
  // the very next keystroke. Clearing the field starts over.
  const [lateErrorsOn, setLateErrorsOn] = useState(false);
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => setLateErrorsOn(true), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // The loader only appears for a check that's actually slow. Keyed on the
  // value it was armed for, so a stale timer can't reveal it for a new name.
  const [slowCheckFor, setSlowCheckFor] = useState<string | null>(null);
  const checking = availability.status === "checking";
  useEffect(() => {
    if (!checking) return;
    const timer = setTimeout(() => setSlowCheckFor(value), CHECKING_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [checking, value]);

  const status = deriveStatus({
    availability,
    labelError,
    showLateErrors: lateErrorsOn,
    showChecking: checking && slowCheckFor === value,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const raw = el.value;
    const cleaned = stripWhitespace(raw);

    if (cleaned !== raw) {
      // Keep the caret where the user left it: move it back by however many
      // spaces were removed in front of it. Written to the DOM directly and
      // synchronously — if React's state doesn't change (a single space
      // typed mid-word), it would otherwise restore the value and throw the
      // caret to the end.
      const caret = el.selectionStart ?? raw.length;
      const nextCaret = stripWhitespace(raw.slice(0, caret)).length;
      el.value = cleaned;
      el.setSelectionRange(nextCaret, nextCaret);
    }

    if (!cleaned) setLateErrorsOn(false);
    onChange(cleaned);
  }

  const isBad = status.kind === "invalid" || status.kind === "taken";

  const inputProps = {
    ref: inputRef,
    id: "label",
    name: "label",
    type: "text",
    value,
    // A username-like slug: autofill, capitalisation, autocorrect and
    // spellcheck would all rewrite what the user meant to type.
    autoComplete: "off",
    autoCapitalize: "none",
    autoCorrect: "off",
    spellCheck: false,
    inputMode: "text",
    enterKeyHint: "go",
    "data-1p-ignore": true,
    "data-lpignore": "true",
    placeholder: "yourname",
    "aria-describedby": "label-hint",
    "aria-invalid": isBad || undefined,
    onChange: handleChange,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter can't submit while the button is disabled, so at least say
      // why: pressing it counts as "done typing".
      if (e.key === "Enter" && value) setLateErrorsOn(true);
    },
    onBlur: () => {
      if (value) setLateErrorsOn(true);
    },
  } as const;

  /** For a decorated frame: clicking the decoration focuses the input. */
  function focusFromFrame(e: React.MouseEvent) {
    if (e.target === inputRef.current || inputRef.current?.disabled) return;
    e.preventDefault();
    inputRef.current?.focus();
  }

  return { status, isBad, inputProps, focusFromFrame };
}

function deriveStatus({
  availability,
  labelError,
  showLateErrors,
  showChecking,
}: {
  availability: Availability;
  labelError: LabelError | null;
  showLateErrors: boolean;
  showChecking: boolean;
}): NameStatus {
  if (labelError) {
    // A definite problem (a dot, a banned character, too long) is worth
    // saying at once. "Too short" is just an unfinished name, so it waits.
    if (labelError === "too-short" && !showLateErrors) return { kind: "idle" };
    return {
      kind: "invalid",
      message: labelErrorMessage(labelError),
      error: labelError,
    };
  }

  switch (availability.status) {
    case "checking":
      return showChecking ? { kind: "checking" } : { kind: "idle" };
    case "available":
      return { kind: "available" };
    case "taken":
      return { kind: "taken" };
    case "error":
      return { kind: "check-failed" };
    default:
      return { kind: "idle" };
  }
}
