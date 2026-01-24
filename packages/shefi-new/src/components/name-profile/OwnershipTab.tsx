'use client';

import { IndexerSubname, formatExpiry } from '@/types/indexer';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { truncateAddress } from '@/lib/utils';

interface OwnershipTabProps {
  nameData: IndexerSubname;
  isOwner: boolean;
  onTransferClick: () => void;
}

export function OwnershipTab({ nameData, isOwner, onTransferClick }: OwnershipTabProps) {
  const explorerUrl = `https://basescan.org/address/${nameData.owner}`;

  return (
    <div className="space-y-6">
      {/* Owner label */}
      <Text size="sm" color="gray">
        Owner
      </Text>

      {/* Owner and Expiry cards - side by side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Address Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <Text size="sm" color="gray">
                Address
              </Text>
              <div className="mt-1 flex items-center gap-2">
                <Text size="sm" weight="medium" className="font-mono">
                  {truncateAddress(nameData.owner)}
                </Text>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                  title="View on Basescan"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Expires Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <Text size="sm" color="gray">
                Expires
              </Text>
              <Text size="sm" weight="medium" className="mt-1">
                {nameData.expiry > 0 ? formatExpiry(nameData.expiry) : 'No expiry'}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Button (only for owner) */}
      {isOwner && (
        <Button
          onClick={onTransferClick}
          className="w-full"
        >
          Transfer Ownership
        </Button>
      )}
    </div>
  );
}
