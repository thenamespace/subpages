'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { Button } from './Button';
import { ConnectedButton } from './ConnectButton';

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: '/', label: 'Register' },
    { href: '/my-names', label: 'My Names' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img src="/logo.webp" alt="SheFi" className="h-10 w-auto sm:h-12" />
        </Link>

        {/* Center Navigation */}
        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent text-white'
                    : 'text-brand-dark/70 hover:bg-gray-100 hover:text-brand-dark'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Section - Wallet (desktop & tablet only; mobile wallet lives in bottom nav) */}
        <div className="hidden items-center gap-3 sm:flex">
          {mounted && (
            !isConnected ? (
              <Button onClick={() => openConnectModal?.()}>Connect</Button>
            ) : (
              <ConnectedButton />
            )
          )}
          {!mounted && (
            <div className="h-10 min-w-[120px] rounded-full border border-brand-accent/30 bg-transparent" aria-hidden />
          )}
        </div>

        {/* Mobile Navigation (bottom bar with nav links + wallet) */}
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-brand-accent/40 bg-black/40 px-2 py-2 backdrop-blur-md sm:hidden">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent text-white shadow-sm'
                    : 'text-white/80'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Mobile Wallet Button */}
          <div className="ml-2 flex flex-none items-center">
            {mounted && (
              !isConnected ? (
                <Button size="sm" onClick={() => openConnectModal?.()}>Connect</Button>
              ) : (
                <ConnectedButton />
              )
            )}
            {!mounted && (
              <div className="h-9 min-w-[96px] rounded-full border border-brand-accent/30 bg-transparent" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
