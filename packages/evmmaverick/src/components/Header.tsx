"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { useSoundContext } from "@/components/SoundProvider";
import { PARENT_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";

export function Header() {
  const { enabled, toggle } = useSoundContext();
  const pathname = usePathname();

  return (
    <header className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Image
          src="/maverick-lion.png"
          alt=""
          width={32}
          height={32}
          className="pixelated size-8 shrink-0"
          priority
        />
        <span className="font-display text-ink-200 hidden text-[10px] uppercase sm:inline">
          {PARENT_NAME}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Cross-navigation. Each page links to the other, never to itself. */}
        <HeaderNav
          href={pathname === "/manage" ? "/" : "/manage"}
          label={pathname === "/manage" ? "Claim" : "Manage"}
        />
        <SoundToggle enabled={enabled} onToggle={toggle} />
        <WalletButton />
      </div>
    </header>
  );
}

/**
 * The other page, as a quiet text link. Amber is reserved for the card's
 * primary action, so this only ever warms on hover.
 */
function HeaderNav({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      // Same treatment as the sound toggle: a 40px grid box around small
      // display type, so the touch target doesn't depend on the text size.
      className={cn(
        "font-display grid h-10 cursor-pointer place-items-center px-1 text-[10px] uppercase tracking-[0.14em]",
        "text-ink-400 hover:text-amber-300 transition-colors duration-150",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * The header's wallet control stays secondary. The claim card owns the one
 * primary action; an amber "Connect" up here would compete with it.
 */
function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const connected = mounted && account;
        const wrongChain = connected && chain?.unsupported;
        return (
          <button
            type="button"
            onClick={
              wrongChain
                ? openChainModal
                : connected
                  ? openAccountModal
                  : openConnectModal
            }
            // Hidden until RainbowKit has hydrated, so the label doesn't
            // flash "Connect" for a wallet that is already connected.
            aria-hidden={!mounted || undefined}
            className={cn(
              "border-edge-strong text-ink-200 cursor-pointer border-2 px-3 py-2 text-sm",
              "hover:border-ink-500 hover:bg-raised transition-colors duration-150",
              !mounted && "invisible",
            )}
          >
            {wrongChain
              ? "Wrong network"
              : connected
                ? account.displayName
                : "Connect"}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
