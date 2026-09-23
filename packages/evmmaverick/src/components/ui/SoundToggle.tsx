"use client";

import { cn } from "@/lib/cn";

/**
 * Speaker toggle, drawn as pixels rather than an icon font so it sits level
 * with the rest of the type. The cone is the same shape in both states; only
 * the waves and the slash change, so it doesn't jump when clicked.
 */
export function SoundToggle({
  enabled,
  onToggle,
  className,
}: {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute the roar" : "Unmute the roar"}
      title={enabled ? "Sound on" : "Sound off"}
      className={cn(
        // Generous hit area around a small glyph — the visual size is 16px but
        // the target is 44px, which is what a thumb actually needs.
        "grid size-11 place-items-center",
        "text-ink-400 transition-colors duration-150",
        "hover:text-amber-300 focus-visible:text-amber-300",
        "cursor-pointer",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <path fill="currentColor" d="M2 6h2v4H2zM4 6h2v4H4zM6 4h2v8H6z" />
        {enabled ? (
          <path
            fill="currentColor"
            d="M10 6h1v4h-1zM12 4h1v8h-1zM14 2h1v12h-1z"
            opacity="0.9"
          />
        ) : (
          <path fill="currentColor" d="M10 5h1v1h-1zM11 6h1v1h-1zM12 7h1v1h-1zM13 8h1v1h-1zM13 5h1v1h-1zM12 6h1v1h-1zM11 8h1v1h-1zM10 9h1v1h-1z" />
        )}
      </svg>
    </button>
  );
}
