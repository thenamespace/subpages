"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

/**
 * Modal shell for the record editors.
 *
 * Radix handles the parts that are genuinely hard and easy to get wrong:
 * focus trap, restoring focus to the trigger on close, Escape, scroll lock,
 * and marking the rest of the page inert for screen readers. The pixel
 * styling is ours.
 *
 * The overlay is solid rather than blurred — a backdrop-filter behind
 * pixel-rendered art smears it.
 */
export function PixelDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-[oklch(0.064_0.032_312_/_0.78)]",
            "data-[state=open]:animate-[dialog-fade_180ms_ease-out]",
          )}
        />
        <Dialog.Content
          className={cn(
            // Pinned with a max height so a long record list scrolls inside
            // the dialog rather than growing it off-screen.
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl",
            "-translate-x-1/2 -translate-y-1/2",
            "max-h-[calc(100dvh-2rem)] overflow-y-auto",
            "border-edge bg-panel scanlines border-2",
            "shadow-[8px_8px_0_var(--color-ink-950)]",
            "data-[state=open]:animate-[dialog-in_200ms_cubic-bezier(0.32,0.72,0,1)]",
            className,
          )}
        >
          <div className="border-edge flex items-start justify-between gap-4 border-b-2 p-4 sm:p-5">
            <div className="flex min-w-0 flex-col gap-2">
              <Dialog.Title className="font-display text-amber-300 text-xs break-all uppercase">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-ink-300 max-w-[52ch] text-xs leading-relaxed">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className={cn(
                // 40px target around a 14px glyph, pulled into the header's
                // padding so the glyph still lines up with the title.
                "text-ink-400 hover:text-amber-300 focus-visible:text-amber-300",
                "-mr-2 -mt-2.5 grid size-10 shrink-0 cursor-pointer place-items-center",
                "transition-colors duration-150",
              )}
            >
              <svg viewBox="0 0 12 12" className="size-3.5" shapeRendering="crispEdges" aria-hidden>
                <path
                  fill="currentColor"
                  d="M1 1h2v2H1zM3 3h2v2H3zM5 5h2v2H5zM7 3h2v2H7zM9 1h2v2H9zM7 7h2v2H7zM9 9h2v2H9zM3 7h2v2H3zM1 9h2v2H1z"
                />
              </svg>
            </Dialog.Close>
          </div>

          <div className="p-4 sm:p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
