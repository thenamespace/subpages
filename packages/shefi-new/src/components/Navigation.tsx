'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from './Button';
import { ConnectedButton } from './ConnectButton';

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const navLinks = [
    { href: '/', label: 'Register' },
    { href: '/my-names', label: 'My Names' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-transparent">
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

        {/* Right Section - Wallet */}
        <div className="flex items-center gap-3">
          {/* Connect/Connected Button */}
          {!isConnected ? (
            <Button onClick={() => openConnectModal?.()}>Connect</Button>
          ) : (
            <ConnectedButton />
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="fixed bottom-4 left-4 right-4 z-50 flex gap-2 rounded-full bg-brand-dark p-1.5 shadow-lg sm:hidden">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 items-center justify-center rounded-full py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent text-white'
                    : 'text-white/60'
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
