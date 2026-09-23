"use client";

import { PixelButton } from "@/components/ui/PixelButton";
import { PixelPanel } from "@/components/ui/PixelPanel";

/**
 * Route-level error boundary. Without it an uncaught render error (a wallet
 * provider throwing, a malformed indexer response) replaces the page with
 * Next's bare "Application error" screen. Deliberately free of wallet hooks
 * and the header, since those are the likeliest things to have thrown.
 */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-ink-100 text-xs uppercase">
              Something broke
            </h1>
            <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
              This page hit an error and couldn&apos;t finish loading. Try
              again, or reload the page.
            </p>
          </div>
          <PixelButton variant="secondary" onClick={reset}>
            Try again
          </PixelButton>
        </div>
      </PixelPanel>
    </main>
  );
}
