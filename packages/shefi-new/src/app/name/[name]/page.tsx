'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { Tabs } from '@/components/Tabs';
import { useIndexer } from '@/hooks/useIndexer';
import { usePrimaryName } from '@/contexts/PrimaryNameContext';
import { IndexerSubname, getAvatarFromSubname, formatExpiry, isExpired } from '@/types/indexer';
import { truncateAddress, equalsIgnoreCase } from '@/lib/utils';
import { RecordsTab } from '@/components/name-profile/RecordsTab';
import { AddressesTab } from '@/components/name-profile/AddressesTab';
import { OwnershipTab } from '@/components/name-profile/OwnershipTab';
import { SetPrimaryNameModal } from '@/components/SetPrimaryNameModal';
import { UpdateRecordsModal } from '@/components/UpdateRecordsModal';
import { TransferOwnershipModal } from '@/components/TransferOwnershipModal';
import { PARENT_NAME } from '@/constants';
import { zeroAddress } from 'viem';

type TabType = 'records' | 'addresses' | 'ownership';

const tabs = [
  { id: 'records' as const, label: 'Records' },
  { id: 'addresses' as const, label: 'Addresses' },
  { id: 'ownership' as const, label: 'Ownership' },
];

export default function NameProfilePage() {
  const params = useParams();
  const nameLabel = (params?.name as string) || '';
  const fullName = `${nameLabel}.${PARENT_NAME}`;

  const { address } = useAccount();
  const { getNameByLabel, loading, error } = useIndexer();
  const { primaryName, refreshPrimaryName } = usePrimaryName();

  const [nameData, setNameData] = useState<IndexerSubname | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [showPrimaryNameModal, setShowPrimaryNameModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (nameLabel) {
      fetchName();
    }
  }, [nameLabel]);

  const fetchName = async () => {
    const data = await getNameByLabel(nameLabel);
    setNameData(data);
  };

  const isNameOwner = useMemo(() => {
    if (!address || !nameData?.owner) return false;
    return equalsIgnoreCase(address, nameData.owner);
  }, [address, nameData?.owner]);

  const isAlreadyPrimary = useMemo(() => {
    if (!nameData?.name || !primaryName) return false;
    return equalsIgnoreCase(nameData.name, primaryName);
  }, [nameData?.name, primaryName]);

  const handlePrimaryNameSet = async () => {
    setShowPrimaryNameModal(false);
    await refreshPrimaryName(true);
  };

  const handleRecordsUpdated = () => {
    setShowRecordsModal(false);
    fetchName();
  };

  const handleTransferComplete = () => {
    setShowTransferModal(false);
    fetchName();
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <Spinner />
          <p className="mt-4 text-lg text-brand-dark/70">Loading name...</p>
        </div>
      </main>
    );
  }

  // Error or not found state
  if (error || (!loading && !nameData)) {
    return (
      <main className="min-h-screen bg-brand-light">
        <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="mb-4 text-4xl sm:text-5xl">Name Not Found</h1>
          <p className="mb-8 text-lg text-brand-dark/70">
            The name &quot;{fullName}&quot; could not be found.
          </p>
          <Link href="/">
            <Button>Register a Name</Button>
          </Link>
        </div>
      </main>
    );
  }

  const avatar = getAvatarFromSubname(nameData!);

  return (
    <main className="min-h-screen bg-brand-light">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Profile Header */}
        <div className="mb-8 overflow-hidden rounded-2xl border-2 border-brand-orange bg-white shadow-sm">
          {/* Cover/Avatar Section */}
          <div className="relative h-40 bg-gradient-card sm:h-48">
            {avatar && (
              <img
                src={avatar}
                alt={nameData!.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {/* Avatar overlay */}
            <div className="absolute -bottom-12 left-6">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-brand-yellowBtn text-3xl font-bold text-brand-orange shadow-lg">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={nameData!.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).innerHTML = nameLabel.charAt(0).toUpperCase();
                    }}
                  />
                ) : (
                  nameLabel.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>

          {/* Name Info */}
          <div className="px-6 pb-6 pt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-brand-dark sm:text-3xl">
                  {nameData!.name}
                </h1>
                <p className="mt-1 text-sm text-brand-dark/60">
                  Owner: {truncateAddress(nameData!.owner)}
                </p>
                {nameData!.expiry > 0 && (
                  <p
                    className={`mt-1 text-sm ${
                      isExpired(nameData!.expiry)
                        ? 'text-red-500'
                        : 'text-brand-dark/60'
                    }`}
                  >
                    {isExpired(nameData!.expiry)
                      ? 'Expired'
                      : `Expires: ${formatExpiry(nameData!.expiry)}`}
                  </p>
                )}
                {isAlreadyPrimary && (
                  <span className="mt-2 inline-block rounded-full bg-brand-yellowBtn px-3 py-1 text-xs font-medium text-brand-orange">
                    Primary Name
                  </span>
                )}
              </div>

              {/* Action Buttons (only for owner) */}
              {isNameOwner && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setShowRecordsModal(true)}>
                    Edit Profile
                  </Button>
                  {!isAlreadyPrimary && (
                    <Button onClick={() => setShowPrimaryNameModal(true)}>
                      Set as Primary
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />

        {/* Tab Content */}
        <div className="mt-6 rounded-2xl border-2 border-brand-orange bg-white p-6 shadow-sm">
          {activeTab === 'records' && <RecordsTab nameData={nameData!} />}
          {activeTab === 'addresses' && <AddressesTab nameData={nameData!} />}
          {activeTab === 'ownership' && (
            <OwnershipTab
              nameData={nameData!}
              isOwner={isNameOwner}
              onTransferClick={() => setShowTransferModal(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <SetPrimaryNameModal
        isOpen={showPrimaryNameModal}
        onClose={() => setShowPrimaryNameModal(false)}
        onSuccess={handlePrimaryNameSet}
        mintedName={fullName}
      />

      <UpdateRecordsModal
        isOpen={showRecordsModal}
        onClose={() => setShowRecordsModal(false)}
        onSuccess={handleRecordsUpdated}
        nameData={nameData!}
      />

      <TransferOwnershipModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleTransferComplete}
        nameData={nameData!}
      />
    </main>
  );
}
