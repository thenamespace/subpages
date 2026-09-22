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

        <main className="flex flex-1 flex-col items-center justify-center gap-8 py-4">
          <div className="flex flex-col items-center gap-5 text-center">
            <Image
              src="/maverick-lion.png"
              alt={`${GATE_TOKEN_NAME} pixel lion`}
              width={128}
              height={128}
              className="pixelated size-32"
              priority
            />

            <div className="flex flex-col gap-3">
              <h1 className="font-display text-amber-300 text-base leading-relaxed sm:text-xl">
                Claim your name
              </h1>
              <p className="text-ink-300 mx-auto max-w-[46ch] text-sm leading-relaxed">
                Every {GATE_TOKEN_NAME} NFT gets one{" "}
                <span className="text-amber-200">.{PARENT_NAME}</span> name.
                Hold more, claim more.
              </p>
            </div>
          </div>

          <ClaimCard preview={preview} />
        </main>

        <footer className="flex flex-col items-center gap-2 pb-2 text-center">
          <p className="text-ink-400 text-xs">
            Names are ENS subnames on Ethereum mainnet. You pay gas; the name is
            yours.
          </p>
          <a
            href="https://namespace.ninja"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-400 hover:text-amber-300 text-xs underline underline-offset-4 transition-colors duration-150"
          >
            Powered by Namespace
          </a>
        </footer>

        <PreviewBar active={preview} />
      </div>
    </div>
  );
}
