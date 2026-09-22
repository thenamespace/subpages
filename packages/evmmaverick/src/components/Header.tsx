"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { useSoundContext } from "@/components/SoundProvider";
import { PARENT_NAME } from "@/lib/config";

export function Header() {
  const { enabled, toggle } = useSoundContext();

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
      <div className="flex items-center gap-1">
        <SoundToggle enabled={enabled} onToggle={toggle} />
        <ConnectButton
          showBalance={false}
          accountStatus="address"
          chainStatus="none"
        />
      </div>
    </header>
  );
}
