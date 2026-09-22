"use client";

import { PixelButton } from "@/components/ui/PixelButton";
import { GATE_TOKEN_NAME, GATE_TOKEN_URL, PARENT_NAME } from "@/lib/config";
import type { ListingResult } from "@/lib/listing";
import type { Quota } from "@/lib/quota";

/**
 * Every blocked state, in one place, each saying why and what to do next.
 *
 * Deliberately a plain function rather than a component: the caller needs to
 * know whether anything is blocking so it can render the claim form instead.
 * A component always returns a truthy element, even when it renders null, so
 * `<GateNotice/> ?? form` would silently render an empty card forever.
 */
export function gateNotice({
  listing,
  quota,
  connected,
  onRetry,
}: {
  listing: ListingResult | null;
  quota: Quota;
  connected: boolean;
  onRetry: () => void;
}): React.ReactNode | null {
  if (listing === null) {
    return <Notice title="Loading" body="Checking whether minting is open…" />;
  }

  if (listing.state === "error") {
    return (
      <Notice
        title="Couldn't reach Namespace"
        body="We can't confirm whether minting is open, so claiming is paused. This is usually brief."
        action={
          <PixelButton variant="secondary" onClick={onRetry}>
            Try again
          </PixelButton>
        }
      />
    );
  }

  if (listing.state === "not-listed") {
    return (
      <Notice
        title="Not open yet"
        body={`${PARENT_NAME} hasn't been listed for minting. Once it is, ${GATE_TOKEN_NAME} holders can claim a name here.`}
      />
    );
  }

  if (!connected) return null;

  switch (quota.status) {
    case "error":
      return (
        <Notice
          title="Couldn't check your wallet"
          body="We read your NFT balance and your existing names before unlocking a claim. One of those didn't answer, so claiming is paused rather than letting you pay for a transaction that would fail."
          detail={quota.error}
          action={
            <PixelButton variant="secondary" onClick={onRetry}>
              Try again
            </PixelButton>
          }
        />
      );

    case "no-token":
      return (
        <Notice
          title={`No ${GATE_TOKEN_NAME} here`}
          body={`Names are for ${GATE_TOKEN_NAME} holders. This wallet doesn't hold one — if yours is in a different wallet, switch to it.`}
          action={
            <PixelButton
              variant="secondary"
              onClick={() => window.open(GATE_TOKEN_URL, "_blank", "noopener")}
            >
              View collection
            </PixelButton>
          }
        />
      );

    case "spent":
      return (
        <Notice
          title="All claimed"
          body={
            quota.claimed > quota.held
              ? `You hold ${quota.held} ${GATE_TOKEN_NAME} and already own ${quota.claimed} names. Your names are yours to keep — there's just no claim left.`
              : `One name per ${GATE_TOKEN_NAME}, and you've used all ${quota.held}. Pick up another NFT to claim another name.`
          }
        />
      );

    default:
      return null;
  }
}

function Notice({
  title,
  body,
  detail,
  action,
}: {
  title: string;
  body: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-amber-300 text-xs uppercase">
          {title}
        </h2>
        {/* Capped measure — full-width body text is exhausting to read. */}
        <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
          {body}
        </p>
        {detail && (
          <p className="text-ink-400 max-w-[52ch] text-xs">{detail}</p>
        )}
      </div>
      {action}
    </div>
  );
}
