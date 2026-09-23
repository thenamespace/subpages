"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ROAR_DURATION_MS } from "@/lib/roar";
import { PixelButton } from "@/components/ui/PixelButton";
import { shortAddress } from "@/lib/format";

export function SuccessCard({
  name,
  txHash,
  canClaimMore,
  onClaimAnother,
}: {
  name: string;
  txHash: string | null;
  canClaimMore: boolean;
  onClaimAnother: () => void;
}) {
  const router = useRouter();
  // Visual only. The sound is played by ClaimCard when the mint's receipt
  // confirms, so a preview or a re-mount of this card stays silent.
  const [roaring, setRoaring] = useState(false);
  // The card can re-render for reasons that have nothing to do with the mint
  // (quota refresh, a parent state change). Without this guard the flash
  // replays on each one.
  const flashed = useRef(false);

  useEffect(() => {
    if (flashed.current) return;
    flashed.current = true;

    setRoaring(true);
    // Hold the visual for as long as the roar lasts.
    const timer = setTimeout(() => setRoaring(false), ROAR_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className={`relative flex flex-col items-center gap-6 text-center ${
        roaring ? "animate-roar-shake" : ""
      }`}
    >
      {roaring && (
        <span
          aria-hidden
          className="animate-roar-flash pointer-events-none absolute -inset-16 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, oklch(0.768 0.143 59 / 0.55), transparent 65%)",
          }}
        />
      )}

      {/* A pixel tick, not the lion: the sprite already sits in the hero
          directly above this card, and showing it twice reads as a bug. */}
      <motion.svg
        aria-hidden
        viewBox="0 0 12 12"
        className="size-10 text-jade-400"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: [0.7, 1.1, 1], opacity: 1 }}
        transition={{ duration: 0.28, ease: "linear", times: [0, 0.6, 1] }}
        shapeRendering="crispEdges"
      >
        <path
          fill="currentColor"
          d="M1 6h2v2H1zM3 8h2v2H3zM5 6h2v2H5zM7 4h2v2H7zM9 2h2v2H9z"
        />
      </motion.svg>

      <div className="flex flex-col gap-3">
        <p className="font-display text-jade-400 text-[10px] uppercase tracking-[0.14em]">
          Claimed
        </p>
        {/* Prefers breaking at the dots on narrow screens; `break-all` is
            only the backstop for a label too long to fit on its own. */}
        <h2 className="font-display text-amber-300 text-sm leading-relaxed break-all sm:text-base">
          {name.split(".").map((part, i, parts) => (
            <Fragment key={i}>
              {part}
              {i < parts.length - 1 && <>.<wbr /></>}
            </Fragment>
          ))}
        </h2>
        <p className="text-ink-300 mx-auto max-w-[40ch] text-sm leading-relaxed text-balance">
          It resolves to your wallet now. Add an avatar and records whenever
          you like.
        </p>
      </div>

      {/* Primary first. When there's nothing left to claim, managing the
          name is the next step, so it takes the primary slot. */}
      <div className="flex w-full flex-col gap-3">
        {canClaimMore && (
          <PixelButton variant="primary" onClick={onClaimAnother}>
            Claim another
          </PixelButton>
        )}
        <PixelButton
          variant={canClaimMore ? "secondary" : "primary"}
          onClick={() => router.push("/manage")}
        >
          Manage records
        </PixelButton>
      </div>

      {txHash && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-400 hover:text-amber-300 text-xs underline underline-offset-4 transition-colors duration-150"
        >
          Transaction {shortAddress(txHash, 10, 8)}
        </a>
      )}
    </motion.div>
  );
}
