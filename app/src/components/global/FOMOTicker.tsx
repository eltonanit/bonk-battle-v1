'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { RPC_ENDPOINT } from '@/config/solana';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import Image from 'next/image';

interface RealEvent {
  signature: string;
  mint: string;
  type: 'bought' | 'created';
  user: string;
  userFull: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  amount: number;
  tier: number;
  timestamp: number;
}

const FOMO_TIER_COLORS = [
  { tier: 1, color: '#FFFE03' },     // Giallo
  { tier: 2, color: '#88EEAD' },    // Verde
  { tier: 3, color: '#97C7FC' }       // Azzurro
];

const CREATION_COLORS = [
  { color: '#FFFE03' },   // Giallo
  { color: '#FF4500' }    // Arancio
];

export function FOMOTicker() {
  const [buyEvents, setBuyEvents] = useState<RealEvent[]>([]);
  const [createEvents, setCreateEvents] = useState<RealEvent[]>([]);
  const [fomoIndex, setFomoIndex] = useState(0);
  const [creationIndex, setCreationIndex] = useState(0);
  const [fomoShake, setFomoShake] = useState(false);
  const [creationShake, setCreationShake] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExistingTokens() {
      try {
        const allTokens = await fetchAllBonkTokens();

        if (allTokens.length > 0) {
          const createdEvents: RealEvent[] = allTokens.map(token => {
            const mintStr = token.mint.toString();
            const creatorShort = mintStr.slice(0, 4); // 4 characters from address

            return {
              signature: mintStr,
              mint: mintStr,
              type: 'created' as const,
              user: creatorShort,
              userFull: mintStr,
              tokenName: token.name || mintStr.slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              amount: 0,
              tier: 2,
              timestamp: token.creationTimestamp * 1000,
            };
          });

          createdEvents.sort((a, b) => b.timestamp - a.timestamp);
          setCreateEvents(createdEvents.slice(0, 20));

          // Create mock buy events from recent tokens with activity
          const mockBuyEvents: RealEvent[] = allTokens
            .filter(token => token.totalTradeVolume > 0)
            .slice(0, 5)
            .map((token, idx) => ({
              signature: 'mock-buy-' + idx,
              mint: token.mint.toString(),
              type: 'bought' as const,
              user: token.mint.toString().slice(0, 4), // 4 characters from address
              userFull: token.mint.toString(),
              tokenName: token.name || token.mint.toString().slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              amount: (token.totalTradeVolume / 1e9) / 10, // Show a portion of volume
              tier: 2,
              timestamp: Date.now() - (idx * 1000),
            }));

          setBuyEvents(mockBuyEvents);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    loadExistingTokens();
  }, []);

  useEffect(() => {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    const subscriptionId = connection.onLogs(
      BONK_BATTLE_PROGRAM_ID,
      async (logs) => {
        try {
          const tx = await connection.getParsedTransaction(logs.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) return;

          // Check for BONK BATTLE events
          const isBuy = logs.logs.some(log => log.includes('TokensPurchased') || log.includes('buy'));
          const isCreate = logs.logs.some(log => log.includes('TokenCreated') || log.includes('initialize'));

          if (!isBuy && !isCreate) return;

          const userFull = tx.transaction.message.accountKeys[0].pubkey.toString();
          const userShort = userFull.slice(0, 4); // 4 characters from address

          let solAmount = 0;
          if (isBuy) {
            const preBalance = tx.meta.preBalances[0] || 0;
            const postBalance = tx.meta.postBalances[0] || 0;
            solAmount = (preBalance - postBalance) / 1e9;
          }

          const newEvent: RealEvent = {
            signature: logs.signature,
            mint: 'NEW',
            type: isBuy ? 'bought' : 'created',
            user: userShort,
            userFull: userFull,
            tokenName: 'NEW TOKEN',
            tokenSymbol: 'NEW',
            tokenImage: undefined,
            amount: solAmount,
            tier: 2,
            timestamp: Date.now(),
          };

          if (isBuy) {
            setBuyEvents(prev => [newEvent, ...prev].slice(0, 50));
          } else {
            setCreateEvents(prev => [newEvent, ...prev].slice(0, 50));
          }
        } catch (error) {
          console.error('Error parsing event:', error);
        }
      },
      'confirmed'
    );

    return () => {
      connection.removeOnLogsListener(subscriptionId);
    };
  }, []);

  useEffect(() => {
    if (buyEvents.length === 0) return;

    const interval = setInterval(() => {
      const element = document.querySelector('.fomo-ticker-content');
      if (element) {
        void (element as HTMLElement).offsetWidth;
      }

      setFomoShake(true);
      setFomoIndex(prev => (prev + 1) % buyEvents.length);
      setTimeout(() => setFomoShake(false), 600);
    }, 3000);

    return () => clearInterval(interval);
  }, [buyEvents.length]);

  useEffect(() => {
    if (createEvents.length === 0) return;

    const interval = setInterval(() => {
      const element = document.querySelector('.creation-ticker-content');
      if (element) {
        void (element as HTMLElement).offsetWidth;
      }

      setCreationShake(true);
      setCreationIndex(prev => (prev + 1) % createEvents.length);
      setTimeout(() => setCreationShake(false), 600);
    }, 4000);

    return () => clearInterval(interval);
  }, [createEvents.length]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="w-full px-4 lg:px-6 py-3">
          <div className="flex flex-col lg:flex-row gap-4 justify-center lg:justify-start">
            <div
              className="flex-1 lg:max-w-md px-5 py-3 font-bold text-sm text-black animate-pulse truncate"
              style={{ backgroundColor: '#3b82f6', borderRadius: 0 }}
            >
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (buyEvents.length === 0 && createEvents.length === 0) {
    return (
      <div className="w-full">
        <div className="w-full px-4 lg:px-6 py-3">
          <Link href="/create">
            <div
              className="px-5 py-3 font-bold text-sm text-black hover:opacity-80 transition-opacity cursor-pointer truncate"
              style={{ backgroundColor: '#3b82f6', borderRadius: 0 }}
            >
              No tokens yet. Create the first one!
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const fomoEvent = buyEvents[fomoIndex];
  const creationEvent = createEvents[creationIndex];

  const fomoColor = fomoEvent
    ? FOMO_TIER_COLORS.find(t => t.tier === fomoEvent.tier) || FOMO_TIER_COLORS[1]
    : FOMO_TIER_COLORS[1];

  const creationColor = CREATION_COLORS[creationIndex % CREATION_COLORS.length];

  return (
    <div className="mb-4 lg:mb-0">
      <div className="px-4 lg:px-6 py-2">
        <div className="flex flex-col lg:flex-row gap-3 justify-start">

          {buyEvents.length > 0 && fomoEvent && (
            <Link
              href={'/token/' + fomoEvent.mint}
              className={'fomo-ticker-content flex items-center gap-1 lg:gap-1.5 px-1.5 py-0.5 lg:px-2 lg:py-1 text-xs lg:text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ' + (fomoShake ? 'fomo-shake' : '')}
              style={{
                background: fomoColor.color,
                borderRadius: 0,
              }}
            >
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border-2 border-black/10">
                <Image
                  src="/profilo.png"
                  alt={fomoEvent.user}
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="whitespace-nowrap font-bold">
                {fomoEvent.user}
              </span>

              <span className="whitespace-nowrap">
                bought
              </span>

              <span className="whitespace-nowrap font-bold">
                {fomoEvent.tokenSymbol}
              </span>

              {fomoEvent.tokenImage && (
                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                  <Image
                    src={fomoEvent.tokenImage}
                    alt={fomoEvent.tokenSymbol}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </Link>
          )}

          {createEvents.length > 0 && creationEvent && (
            <Link
              href={'/token/' + creationEvent.mint}
              className={'creation-ticker-content hidden lg:flex items-center gap-1 lg:gap-1.5 px-1.5 py-0.5 lg:px-2 lg:py-1 text-xs lg:text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ' + (creationShake ? 'creation-shake' : '')}
              style={{
                backgroundColor: creationColor.color,
                borderRadius: 0,
              }}
            >
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border-2 border-black/10">
                <Image
                  src="/profilo.png"
                  alt={creationEvent.user}
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="whitespace-nowrap font-bold">
                {creationEvent.user}
              </span>

              <span className="whitespace-nowrap">
                created
              </span>

              <span className="whitespace-nowrap font-bold">
                {creationEvent.tokenSymbol}
              </span>

              {creationEvent.tokenImage && (
                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                  <Image
                    src={creationEvent.tokenImage}
                    alt={creationEvent.tokenSymbol}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}