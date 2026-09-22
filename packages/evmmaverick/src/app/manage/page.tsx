import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ManageView } from "@/components/manage/ManageView";
import { isPreviewEnabled } from "@/lib/preview";
import { PARENT_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Manage your names",
  description: `Set the avatar, addresses and records on your ${PARENT_NAME} names.`,
};

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.preview;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Same escape hatch as the claim page: the real view needs a wallet that
  // already owns a name, which nobody does until the listing exists.
  const preview = isPreviewEnabled() && value === "names";

  return (
    <div className="relative min-h-dvh overflow-hidden">
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

        <main className="flex flex-1 flex-col items-center gap-8 py-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-display text-amber-300 text-base leading-relaxed sm:text-lg">
              Manage your names
            </h1>
            <p className="text-ink-300 mx-auto max-w-[46ch] text-sm leading-relaxed">
              Records are stored on Ethereum. Changes cost gas, and all of them
              save in one transaction.
            </p>
          </div>

          <ManageView preview={preview} />

          <Link
            href="/"
            className="text-ink-500 hover:text-amber-300 text-xs underline underline-offset-4 transition-colors"
          >
            Back to claiming
          </Link>
        </main>
      </div>
    </div>
  );
}
