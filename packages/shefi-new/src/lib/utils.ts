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
