'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { useIndexer } from '@/hooks/useIndexer';
import { IndexerSubname, getAvatarFromSubname, formatExpiry, isExpired } from '@/types/indexer';
import { truncateAddress } from '@/lib/utils';

export default function MyNamesPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { getOwnerNames, loading, error } = useIndexer();
  const [names, setNames] = useState<IndexerSubname[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (address && isConnected) {
      fetchNames();
    } else {
      setNames([]);
      setHasFetched(false);
    }
  }, [address, isConnected]);

  const fetchNames = async () => {
    if (!address) return;
    const ownerNames = await getOwnerNames(address);
    setNames(ownerNames);
    setHasFetched(true);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="mb-4 text-4xl sm:text-5xl">My Names</h1>
          <p className="mb-8 text-lg text-brand-dark/70">
            Connect your wallet to view your shefi.eth names
          </p>
          <Button onClick={() => openConnectModal?.()}>Connect Wallet</Button>
        </div>
      </main>
    );
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <Spinner />
          <p className="mt-4 text-lg text-brand-dark/70">Loading your names...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="mb-4 text-4xl sm:text-5xl">Oops!</h1>
          <p className="mb-8 text-lg text-brand-dark/70">
            Something went wrong while loading your names.
          </p>
          <Button onClick={fetchNames}>Try Again</Button>
        </div>
      </main>
    );
  }

  // Empty state
  if (hasFetched && names.length === 0) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="mb-4 text-4xl sm:text-5xl">No Names Yet</h1>
          <p className="mb-8 text-lg text-brand-dark/70">
            You don&apos;t have any shefi.eth names yet. Register one to get started!
          </p>
          <Link href="/">
            <Button>Register a Name</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Names list
  return (
    <main className="min-h-screen bg-brand-light">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl sm:text-5xl">My Names</h1>
          <p className="text-lg text-brand-dark/70">
            Manage your shefi.eth names
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {names.map((name, index) => (
            <Link
              key={name.namehash || index}
              href={`/name/${name.label}`}
              className="group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-brand-accent/30 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-brand-accent/10 hover:-translate-y-1 hover:border-brand-accent/50">
                {/* Avatar section */}
                <div className="relative h-32 bg-gradient-card">
                  {getAvatarFromSubname(name) ? (
                    <img
                      src={getAvatarFromSubname(name)!}
                      alt={name.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-brand-accent/30">
                      {name.label.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info section */}
                <div className="flex flex-col gap-1 p-4">
                  <h3 className="truncate text-lg font-bold text-brand-dark">
                    {name.name}
                  </h3>
                  <p className="text-sm text-brand-dark/60">
                    Owner: {truncateAddress(name.owner)}
                  </p>
                  {name.expiry > 0 && (
                    <p
                      className={`text-sm ${
                        isExpired(name.expiry)
                          ? 'text-red-500'
                          : 'text-brand-dark/60'
                      }`}
                    >
                      {isExpired(name.expiry) ? 'Expired' : `Expires: ${formatExpiry(name.expiry)}`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
