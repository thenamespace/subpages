"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { isPreviewEnabled, PREVIEW_STATES, type PreviewState } from "@/lib/preview";

/**
 * Design-review switcher. Renders only when previews are enabled, which is
 * dev by default — in production it needs NEXT_PUBLIC_ENABLE_PREVIEW=true.
 *
 * It exists because we fail closed: with no listing on the parent name yet,
 * a real wallet can only ever see the blocked states.
 */
export function PreviewBar({ active }: { active: PreviewState | null }) {
  if (!isPreviewEnabled()) return null;

  return (
    <div className="border-edge bg-panel/90 flex flex-wrap items-center gap-1.5 border-2 p-2 backdrop-blur">
      <span className="text-ink-500 mr-1 text-[10px] uppercase tracking-wider">
        Preview
      </span>
      <Link
        href="/"
        className={cn(
          "border px-2 py-1 text-[10px] transition-colors",
          active === null
            ? "border-amber-400 text-amber-300"
            : "border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200",
        )}
      >
        live
      </Link>
      {PREVIEW_STATES.map((state) => (
        <Link
          key={state}
          href={`/?preview=${state}`}
          className={cn(
            "border px-2 py-1 text-[10px] transition-colors",
            active === state
              ? "border-amber-400 text-amber-300"
              : "border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200",
          )}
        >
          {state}
        </Link>
      ))}
    </div>
  );
}
