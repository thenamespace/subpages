'use client';

import { IndexerSubname } from '@/types/indexer';
import { Text } from '@/components/Text';
import { truncateAddress } from '@/lib/utils';

interface AddressesTabProps {
  nameData: IndexerSubname;
}

// Common coin types and their display info
const COIN_INFO: Record<string, { name: string; symbol: string; icon: string }> = {
  '60': { name: 'Ethereum', symbol: 'ETH', icon: '/chains/eth.svg' },
  '0': { name: 'Bitcoin', symbol: 'BTC', icon: '/chains/bitcoin.svg' },
  '2147483785': { name: 'Base', symbol: 'ETH', icon: '/chains/base.svg' },
  '2147483658': { name: 'Optimism', symbol: 'ETH', icon: '/chains/op.svg' },
  '2147492101': { name: 'Arbitrum', symbol: 'ETH', icon: '/chains/arb.svg' },
  '2147484614': { name: 'Polygon', symbol: 'MATIC', icon: '/chains/matic.svg' },
};

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

  // Sort: known coins first, then others
  const sortedAddresses = [
    ...addressKeys.filter((key) => COIN_INFO[key]),
    ...addressKeys.filter((key) => !COIN_INFO[key]),
  ];

  return (
    <div className="space-y-4">
      {sortedAddresses.map((coinType) => {
        const value = addresses[coinType];
        const coinInfo = COIN_INFO[coinType];

        return (
          <div
            key={coinType}
            className="flex items-center gap-4 rounded-lg border border-brand-orange/20 bg-brand-light/50 p-4"
          >
            {/* Chain Icon */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
              {coinInfo?.icon ? (
                <img
                  src={coinInfo.icon}
                  alt={coinInfo.name}
                  className="h-6 w-6"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs font-bold text-brand-dark/40">
                  {coinType}
                </span>
              )}
            </div>

            {/* Chain Info */}
            <div className="flex-1 min-w-0">
              <Text size="sm" weight="medium">
                {coinInfo?.name || `Coin Type ${coinType}`}
              </Text>
              <div className="flex items-center gap-2">
                <Text size="xs" color="gray" className="truncate">
                  {value}
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
}
