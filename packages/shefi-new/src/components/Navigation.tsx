'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { Button } from './Button';
import { ConnectedButton } from './ConnectButton';
import { usePrimaryName } from '@/contexts/PrimaryNameContext';

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { primaryName } = usePrimaryName();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: '/', label: 'Register' },
    { href: '/my-names', label: 'My Names' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
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

        {/* Right Section - Wallet (deferred until mount to avoid hydration mismatch) */}
        <div className="flex items-center gap-3">
          {mounted && (
            <>
              {/* Primary Name Badge (if set) */}
              {isConnected && primaryName && (
                <span className="hidden rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-accent sm:inline-block">
                  {primaryName}
                </span>
              )}

              {/* Connect/Connected Button */}
              {!isConnected ? (
                <Button onClick={() => openConnectModal?.()}>Connect</Button>
              ) : (
                <ConnectedButton />
              )}
            </>
          )}
          {!mounted && (
            <div className="h-10 min-w-[120px] rounded-full border border-gray-200 bg-gray-50" aria-hidden />
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-gray-100 bg-white sm:hidden">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 items-center justify-center py-4 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent text-white'
                    : 'text-brand-dark/70'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
