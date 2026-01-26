'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from './Button';
import { ConnectedButton } from './ConnectButton';
import { usePrimaryName } from '@/contexts/PrimaryNameContext';

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { primaryName } = usePrimaryName();

  const navLinks = [
    { href: '/', label: 'Register' },
    { href: '/my-names', label: 'My Names' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-brand-orange/20 bg-brand-light/95 backdrop-blur-sm">
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
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-yellowBtn text-brand-dark'
                    : 'text-brand-dark/70 hover:bg-brand-yellowBtn/50 hover:text-brand-dark'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Section - Wallet */}
        <div className="flex items-center gap-3">
          {/* Primary Name Badge (if set) */}
          {isConnected && primaryName && (
            <span className="hidden rounded-full bg-brand-pink/30 px-3 py-1 text-xs font-medium text-brand-dark sm:inline-block">
              {primaryName}
            </span>
          )}

          {/* Connect/Connected Button */}
          {!isConnected ? (
            <Button onClick={() => openConnectModal?.()}>Connect</Button>
          ) : (
            <ConnectedButton />
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-brand-orange/20 bg-brand-light sm:hidden">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 items-center justify-center py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-yellowBtn text-brand-dark'
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
