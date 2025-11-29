'use client';

import { useEffect, useState } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import Image from 'next/image';

interface CreatedEvent {
  signature: string;
  mint: string;
  user: string;
  userFull: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  timestamp: number;
}

// Colori CREATED (verde/giallo/azzurro)
const CREATED_COLORS = [
  '#A4F4B6',  // Verde
  '#EFFE16',  // Giallo
  '#93EAEB'   // Azzurro
];

/**
 * Validates if a string is a valid image URL for next/image
 * Must be absolute URL (http/https) or start with /
 */
function isValidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

export function CreatedTicker() {
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreatedTokens() {
      try {
        const allTokens = await fetchAllBonkTokens();

        if (allTokens.length > 0) {
          // Crea eventi "created" da TUTTI i token
          const events = allTokens.map(token => {
            const mintStr = token.mint.toString();
            // ⭐ V2 FIX: creator might be undefined, fallback to mint
            const creatorStr = token.creator?.toString() || mintStr;
            const creatorShort = creatorStr.slice(0, 5);

            return {
              signature: `created-${mintStr}`,
              mint: mintStr,
              user: creatorShort,
              userFull: creatorStr,
              tokenName: token.name || token.symbol || mintStr.slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              timestamp: token.creationTimestamp || Date.now(),
            };
          });

          // Ordina per timestamp decrescente (più recente prima)
          events.sort((a, b) => b.timestamp - a.timestamp);

          setCreatedEvents(events);
        }
      } catch (error) {
        console.error('❌ Error loading created tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCreatedTokens();
    const interval = setInterval(loadCreatedTokens, 30000); // Refresh ogni 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (createdEvents.length === 0) return;

    const timer = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 400);

      setCurrentIndex((prev) => (prev + 1) % createdEvents.length);
    }, 5000); // Cambia ogni 5 secondi

    return () => clearInterval(timer);
  }, [createdEvents]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="w-full px-2 py-0">
          <div className="flex justify-start">
            <div
              className="px-4 py-2 font-bold text-sm text-black animate-pulse truncate"
              style={{ backgroundColor: '#93EAEB', borderRadius: 0 }}
            >
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (createdEvents.length === 0) {
    return (
      <div className="w-full">
        <div className="w-full px-2 py-0">
          <Link href="/create">
            <div
              className="px-4 py-2 font-bold text-sm text-black hover:opacity-80 transition-opacity cursor-pointer truncate"
              style={{ backgroundColor: '#93EAEB', borderRadius: 0 }}
            >
              No tokens yet. Create the first one!
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Safety check: reset index if out of bounds
  const safeIndex = currentIndex >= createdEvents.length ? 0 : currentIndex;
  const currentEvent = createdEvents[safeIndex];

  // Extra safety: if still no event, show loading
  if (!currentEvent) {
    return (
      <div className="w-full">
        <div className="w-full px-2 py-0">
          <div
            className="px-4 py-2 font-bold text-sm text-black animate-pulse truncate"
            style={{ backgroundColor: '#93EAEB', borderRadius: 0 }}
          >
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 lg:mb-0">
      <div className="px-0 py-0">
        <div className="flex justify-start items-center">
          <Link
            href={`/token/${currentEvent.mint}`}
            className={'ticker-content flex items-center gap-1.5 lg:gap-1 px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal hover:opacity-90 transition-opacity cursor-pointer ' + (shake ? 'ticker-shake' : '')}
            style={{
              backgroundColor: CREATED_COLORS[safeIndex % CREATED_COLORS.length],
              borderRadius: 0,
            }}
          >
            {/* Token Image LEFT */}
            {isValidImageUrl(currentEvent.tokenImage) && (
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/30">
                <Image
                  src={currentEvent.tokenImage!}
                  alt={currentEvent.tokenSymbol}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}

            <span className="whitespace-nowrap font-normal uppercase text-base lg:text-sm">
              {currentEvent.user}
            </span>

            <span className="whitespace-nowrap text-base lg:text-sm font-normal">
              CREATED
            </span>

            <span className="whitespace-nowrap font-normal uppercase text-base lg:text-sm">
              {currentEvent.tokenSymbol}
            </span>

            {/* User Avatar RIGHT */}
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/30">
              <Image
                src="/profilo.png"
                alt={currentEvent.user}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}