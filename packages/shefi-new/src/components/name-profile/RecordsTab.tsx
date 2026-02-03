'use client';

import { IndexerSubname } from '@/types/indexer';
import { Text } from '@/components/Text';

interface RecordsTabProps {
  nameData: IndexerSubname;
}

// Common text record keys to display
const DISPLAY_RECORDS = [
  { key: 'avatar', label: 'Avatar' },
  { key: 'description', label: 'Description' },
  { key: 'display', label: 'Display Name' },
  { key: 'email', label: 'Email' },
  { key: 'url', label: 'Website' },
  { key: 'com.twitter', label: 'Twitter' },
  { key: 'com.github', label: 'GitHub' },
  { key: 'com.discord', label: 'Discord' },
  { key: 'org.telegram', label: 'Telegram' },
  { key: 'xyz.farcaster', label: 'Farcaster' },
];

export function RecordsTab({ nameData }: RecordsTabProps) {
  const textRecords = nameData.texts || {};
  const recordKeys = Object.keys(textRecords);

  if (recordKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Text size="lg" color="gray">
          No records set
        </Text>
        <Text size="sm" color="gray" className="mt-2">
          Text records like avatar, description, and social links will appear here.
        </Text>
      </div>
    );
  }

  // Sort records: known keys first, then others
  const sortedRecords = [
    ...DISPLAY_RECORDS.filter((r) => textRecords[r.key]),
    ...recordKeys
      .filter((key) => !DISPLAY_RECORDS.find((r) => r.key === key))
      .map((key) => ({ key, label: key })),
  ];

  return (
    <div className="space-y-4">
      {sortedRecords.map(({ key, label }) => {
        const value = textRecords[key];
        if (!value) return null;

        return (
          <div
            key={key}
            className="flex flex-col gap-1 overflow-hidden rounded-lg border border-brand-orange/20 bg-brand-light/50 p-3 sm:p-4"
          >
            <Text size="xs" weight="medium" color="gray" className="uppercase">
              {label}
            </Text>
            {key === 'avatar' && value.startsWith('http') ? (
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={value}
                  alt="Avatar"
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Text size="sm" className="truncate min-w-0">
                  {value}
                </Text>
              </div>
            ) : key === 'url' ||
              key.startsWith('com.') ||
              key.startsWith('org.') ||
              key.startsWith('xyz.') ? (
              <a
                href={formatRecordUrl(key, value)}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-brand-orange hover:underline block truncate"
              >
                {value}
              </a>
            ) : (
              <Text size="sm" className="break-words">
                {value}
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRecordUrl(key: string, value: string): string {
  // If already a URL, return as is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Format based on platform
  switch (key) {
    case 'com.twitter':
      return `https://twitter.com/${value.replace('@', '')}`;
    case 'com.github':
      return `https://github.com/${value}`;
    case 'org.telegram':
      return `https://t.me/${value.replace('@', '')}`;
    case 'xyz.farcaster':
      return `https://warpcast.com/${value}`;
    case 'url':
      return value.startsWith('http') ? value : `https://${value}`;
    default:
      return value;
  }
}
