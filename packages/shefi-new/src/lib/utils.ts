import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function equalsIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

const DEFAULT_AVATAR_CID = 'bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene';

/**
 * Extracts an IPFS CID from various URL formats.
 * Returns null if the URL is not IPFS-related.
 */
function extractIpfsCid(url: string): string | null {
  if (url.startsWith('ipfs://')) return url.slice(7);
  if (url.startsWith('baf') || url.startsWith('Qm')) return url;
  // Extract CID from gateway URLs like https://ipfs.io/ipfs/{cid}
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Resolves avatar URLs for display.
 * - IPFS content is routed through /api/ipfs/[cid] proxy for production reliability.
 * - The known default shefi avatar uses the local static asset.
 * - HTTP/HTTPS non-IPFS URLs pass through as-is.
 */
export function resolveAvatarUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  const cid = extractIpfsCid(url);
  if (cid) {
    if (cid === DEFAULT_AVATAR_CID) return '/default-avatar.jpg';
    return `/api/ipfs/${cid}`;
  }

  // Non-IPFS http(s) URL — pass through
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return null;
}

export function isUserRejection(err: unknown): boolean {
  if (!err) return false;

  const error = err as { message?: string; details?: string; cause?: { details?: string } };
  const message = error?.message?.toLowerCase() || '';
  const details = error?.details?.toLowerCase() || '';
  const causeDetails = error?.cause?.details?.toLowerCase() || '';

  return (
    message.includes('user rejected') ||
    message.includes('denied') ||
    details.includes('user denied transaction') ||
    details.includes('user rejected') ||
    details.includes('denied') ||
    causeDetails.includes('user denied transaction') ||
    causeDetails.includes('user rejected') ||
    causeDetails.includes('denied')
  );
}
