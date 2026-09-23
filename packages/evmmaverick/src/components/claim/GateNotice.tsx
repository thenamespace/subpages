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
  onManage,
}: {
  listing: ListingResult | null;
  quota: Quota;
  connected: boolean;
  onRetry: () => void;
  onManage: () => void;
}): React.ReactNode | null {
  if (listing === null) {
    return <Notice title="Loading" body="Checking whether claims are open…" />;
  }

  if (listing.state === "error") {
    return (
      <Notice
        title="Couldn't reach Namespace"
        body="Namespace didn't answer, so we can't tell whether claims are open. Give it a moment and try again."
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
        body={`Claims for .${PARENT_NAME} haven't opened. When they do, you can claim your name here with any ${GATE_TOKEN_NAME} NFT.`}
      />
    );
  }

  if (!connected) return null;

  switch (quota.status) {
    case "error":
      return (
        <Notice
          title="Couldn't check your wallet"
          body="Before you claim, we count your NFTs and the names you already own. One of those lookups failed. Claiming stays paused so you don't pay gas for a transaction that would fail."
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
          body={`Names are for ${GATE_TOKEN_NAME} holders, and this wallet doesn't hold one. If your Maverick lives in another wallet, switch to it.`}
          action={
            <PixelButton
              variant="secondary"
              onClick={() => window.open(GATE_TOKEN_URL, "_blank", "noopener")}
            >
              View on OpenSea
            </PixelButton>
          }
        />
      );

    case "spent":
      return (
        <Notice
          title="All claimed"
          body="Every NFT in this wallet has its name. Set an avatar, addresses and other records on yours."
          action={<PixelButton onClick={onManage}>Manage names</PixelButton>}
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-ink-100 text-xs uppercase">
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
