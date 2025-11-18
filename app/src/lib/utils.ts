import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  return address.slice(0, chars) + '...' + address.slice(-chars);
}

export function formatSOL(lamports: number | bigint): string {
  const sol = Number(lamports) / 1e9;
  return sol.toFixed(4) + ' SOL';
}

export function formatUSD(cents: number | bigint): string {
  const dollars = Number(cents) / 1_000_000;
  if (dollars < 1000) return '$' + dollars.toFixed(0);
  if (dollars < 1_000_000) return '$' + (dollars / 1000).toFixed(1) + 'K';
  return '$' + (dollars / 1_000_000).toFixed(2) + 'M';
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return days + 'd ' + hours + 'h';
  if (hours > 0) return hours + 'h ' + minutes + 'm';
  return minutes + 'm';
}

export function calculateProgress(raised: number | bigint, target: number | bigint): number {
  const raisedNum = Number(raised);
  const targetNum = Number(target);
  if (targetNum === 0) return 0;
  return Math.min(100, (raisedNum / targetNum) * 100);
}