'use client';

import { IndexerSubname, formatExpiry, isExpired } from '@/types/indexer';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { truncateAddress } from '@/lib/utils';

interface OwnershipTabProps {
  nameData: IndexerSubname;
  isOwner: boolean;
  onTransferClick: () => void;
}

export function OwnershipTab({ nameData, isOwner, onTransferClick }: OwnershipTabProps) {
  return (
    <div className="space-y-6">
      {/* Owner Info */}
      <div className="rounded-lg border border-brand-orange/20 bg-brand-light/50 p-4">
        <Text size="xs" weight="medium" color="gray" className="mb-2 uppercase">
          Owner
        </Text>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
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
            <Text size="sm" weight="medium">
              {truncateAddress(nameData.owner)}
            </Text>
            {isOwner && (
              <Text size="xs" color="orange">
                (You)
              </Text>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(nameData.owner)}
            className="ml-auto rounded p-2 text-brand-dark/40 hover:bg-brand-light hover:text-brand-dark"
            title="Copy address"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expiry Info */}
      <div className="rounded-lg border border-brand-orange/20 bg-brand-light/50 p-4">
        <Text size="xs" weight="medium" color="gray" className="mb-2 uppercase">
          Registration
        </Text>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Text size="sm" color="gray">
              Expiry
            </Text>
            <Text
              size="sm"
              weight="medium"
              color={isExpired(nameData.expiry) ? 'red' : 'dark'}
            >
              {nameData.expiry > 0 ? formatExpiry(nameData.expiry) : 'No expiry'}
            </Text>
          </div>
          {isExpired(nameData.expiry) && (
            <div className="rounded bg-red-100 p-2">
              <Text size="xs" color="red">
                This name has expired. It may be available for re-registration.
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Chain Info */}
      <div className="rounded-lg border border-brand-orange/20 bg-brand-light/50 p-4">
        <Text size="xs" weight="medium" color="gray" className="mb-2 uppercase">
          Network
        </Text>
        <div className="flex items-center gap-3">
          <img src="/chains/base.svg" alt="Base" className="h-6 w-6" />
          <Text size="sm" weight="medium">
            Base
          </Text>
          <Text size="xs" color="gray">
            (Chain ID: {nameData.chainId})
          </Text>
        </div>
      </div>

      {/* Transfer Button (only for owner) */}
      {isOwner && (
        <div className="border-t border-brand-orange/20 pt-6">
          <Text size="sm" color="gray" className="mb-4">
            Transfer this name to another address. This action cannot be undone.
          </Text>
          <Button variant="outline" onClick={onTransferClick}>
            Transfer Ownership
          </Button>
        </div>
      )}
    </div>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
