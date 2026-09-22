import { cn } from "@/lib/cn";
import type { Quota } from "@/lib/quota";

const MAX_PIPS = 12;

/**
 * One pip per gate NFT: filled = a name already claimed against it, hollow =
 * still available. Reads at a glance in a way "2 of 3 claimed" doesn't.
 *
 * The pips are decorative; the sentence beside them is the accessible label,
 * so a screen reader gets the count once rather than twelve unlabelled boxes.
 */
export function QuotaPips({ quota }: { quota: Quota }) {
  if (quota.status === "idle" || quota.status === "error") return null;

  // Over-quota is real: mint three names, sell two NFTs, and claimed exceeds
  // held. Render every claim so the row still adds up to what happened.
  const total = Math.max(quota.held, quota.claimed);
  const shown = Math.min(total, MAX_PIPS);
  const overflow = total - shown;

  const sentence =
    quota.status === "no-token"
      ? "No EVMavericks NFT in this wallet."
      : quota.claimed > quota.held
        ? `${quota.claimed} claimed against ${quota.held} NFT${quota.held === 1 ? "" : "s"}.`
        : `${quota.remaining} of ${quota.held} name${quota.held === 1 ? "" : "s"} left.`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: shown }, (_, i) => {
          const used = i < quota.claimed;
          return (
            <span
              key={i}
              className={cn(
                "size-3 border-2",
                used
                  ? "border-amber-600 bg-amber-400"
                  : "border-ink-600 bg-transparent",
              )}
            />
          );
        })}
        {overflow > 0 && (
          <span className="text-ink-400 ml-1 text-xs">+{overflow}</span>
        )}
      </div>
      <p
        className={cn(
          "text-xs",
          quota.status === "spent" || quota.status === "no-token"
            ? "text-ink-300"
            : "text-amber-200",
        )}
      >
        {sentence}
      </p>
    </div>
  );
}
