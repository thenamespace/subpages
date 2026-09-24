import Image from "next/image";
import { ClaimCard } from "@/components/claim/ClaimCard";
import { Header } from "@/components/Header";
import { PreviewBar } from "@/components/PreviewBar";
import { GATE_TOKEN_NAME, PARENT_NAME } from "@/lib/config";
import { parsePreviewState } from "@/lib/preview";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawPreview = params.preview;
  const preview = parsePreviewState(
    Array.isArray(rawPreview) ? rawPreview[0] : (rawPreview ?? null),
  );

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Amber cabinet glow. Sits behind everything and never intercepts
          clicks — a full-bleed decorative layer that swallows pointer events
          is a classic way to break a page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, oklch(0.291 0.044 44 / 0.55), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
        <Header />

        <main className="flex flex-1 flex-col items-center justify-center gap-10 py-4">
          <div className="flex flex-col items-center gap-6 text-center">
            <Image
              src="/evmavericks.png"
              alt={`${GATE_TOKEN_NAME} lion`}
              width={96}
              height={96}
              className="size-24"
              priority
            />

            <div className="flex flex-col gap-4">
              <h1 className="font-display text-amber-300 text-lg leading-snug sm:text-2xl">
                Claim your name
              </h1>
              <p className="text-ink-300 mx-auto max-w-[40ch] text-sm leading-relaxed text-balance">
                Free{" "}
                <span className="text-amber-200">.{PARENT_NAME}</span> ENS
                subnames for {GATE_TOKEN_NAME} holders.
              </p>
            </div>
          </div>

          <ClaimCard preview={preview} />
        </main>

        <footer className="flex justify-center pb-2">
          <a
            href="https://namespace.ninja"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by Namespace"
            className="text-ink-400 hover:text-ink-200 flex items-center gap-2 text-xs opacity-80 transition-[color,opacity] duration-150 hover:opacity-100"
          >
            <span>Powered by</span>
            <Image
              src="/namespace-logo.png"
              alt=""
              width={690}
              height={106}
              className="h-4 w-auto"
            />
          </a>
        </footer>

        <PreviewBar active={preview} />
      </div>
    </div>
  );
}
