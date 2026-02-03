'use client';

import { IndexerSubname } from '@/types/indexer';
import { Text } from '@/components/Text';
import { truncateAddress } from '@/lib/utils';
import { ChainIcon, getSupportedAddressByCoin } from '@thenamespace/ens-components';
import toast from 'react-hot-toast';

interface AddressesTabProps {
  nameData: IndexerSubname;
}

export function AddressesTab({ nameData }: AddressesTabProps) {
  const addresses = nameData.addresses || {};
  const addressKeys = Object.keys(addresses);

  if (addressKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Text size="lg" color="gray">
          No addresses set
        </Text>
        <Text size="sm" color="gray" className="mt-2">
          Multi-chain addresses like ETH, BTC, and others will appear here.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addressKeys.map((coinType) => {
        const value = addresses[coinType];
        const coinTypeNum = parseInt(coinType, 10);
        const supportedAddress = getSupportedAddressByCoin(coinTypeNum);

        // Get chain name for icon
        const chainName = supportedAddress?.chainName || 'eth';

        return (
          <div
            key={coinType}
            className="flex items-center gap-3 sm:gap-4 rounded-lg border border-brand-orange/20 bg-brand-light/50 p-3 sm:p-4"
          >
            {/* Chain Icon */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
              <ChainIcon chain={chainName} size={24} />
            </div>

            {/* Chain Info */}
            <div className="flex-1 min-w-0">
              <Text size="sm" weight="medium">
                {supportedAddress?.label || `Coin Type ${coinType}`}
              </Text>
              <div className="flex items-center gap-2">
                <Text size="xs" color="gray" className="truncate">
                  {truncateAddress(value)}
                </Text>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="flex-shrink-0 rounded p-1 text-brand-dark/40 hover:bg-brand-light hover:text-brand-dark"
                  title="Copy address"
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Address copied!');
}
