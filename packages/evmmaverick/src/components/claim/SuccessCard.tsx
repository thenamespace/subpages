"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useSoundContext } from "@/components/SoundProvider";
import { playRoar } from "@/lib/roar";
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
  const { enabled: soundEnabled } = useSoundContext();
  const [roaring, setRoaring] = useState(false);
  // The card can re-render for reasons that have nothing to do with the mint
  // (quota refresh, a parent state change). Without this guard the roar fires
  // again on each one.
  const roared = useRef(false);

  useEffect(() => {
    if (roared.current) return;
    roared.current = true;

    setRoaring(true);
    if (soundEnabled) playRoar();

    const timer = setTimeout(() => setRoaring(false), 1400);
    return () => clearTimeout(timer);
    // Deliberately runs once on mount: the success card only mounts when a
    // mint confirms, and toggling sound afterwards shouldn't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="size-12 text-jade-400"
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

      <div className="flex flex-col gap-2">
        <p className="font-display text-jade-400 text-[10px] uppercase tracking-[0.14em]">
          Claimed
        </p>
        {/* Breaks on the dot rather than mid-label on narrow screens. */}
        <h2 className="font-display text-amber-300 text-sm leading-relaxed break-all">
          {name}
        </h2>
        <p className="text-ink-400 max-w-[46ch] text-sm leading-relaxed">
          It resolves to your wallet already. Set an avatar and other records
          any time from the ENS manager.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <PixelButton
          variant="secondary"
          onClick={() =>
            window.open(
              `https://app.ens.domains/${encodeURIComponent(name)}`,
              "_blank",
              "noopener",
            )
          }
        >
          Manage name
        </PixelButton>
        {canClaimMore && (
          <PixelButton variant="primary" onClick={onClaimAnother}>
            Claim another
          </PixelButton>
        )}
      </div>

      {txHash && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-500 hover:text-amber-300 text-xs underline underline-offset-4 transition-colors"
        >
          Transaction {shortAddress(txHash, 10, 8)}
        </a>
      )}
    </motion.div>
  );
}
