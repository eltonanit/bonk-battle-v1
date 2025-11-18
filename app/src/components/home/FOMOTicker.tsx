'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';
import { fetchAllTokens } from '@/lib/solana/fetch-all-tokens';
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
  { tier: 1, color: '#3b82f6', target: '$50k' },
  { tier: 2, color: '#fb923c', target: '$500k' },
  { tier: 3, color: '#10b981', target: '$5M' },
  { tier: 4, isGradient: true, color: 'linear-gradient(135deg, #fbbf24, #f59e0b)', target: '$50M' }
];

const CREATION_COLORS = [
  { color: '#22D3EE', target: '$50k' },
  { color: '#FCD34D', target: '$50M' }
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
        const allTokens = await fetchAllTokens();

        if (allTokens.length > 0) {
          const createdEvents: RealEvent[] = allTokens.map(token => {
            const creatorFull = token.creator.toString();
            const creatorShort = creatorFull.slice(0, 4);

            return {
              signature: token.pubkey.toString(),
              mint: token.mint.toString(),
              type: 'created' as const,
              user: creatorShort,
              userFull: creatorFull,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenImage: token.imageUrl,
              amount: 0,
              tier: token.tier || 2,
              timestamp: token.createdAt * 1000,
            };
          });

          createdEvents.sort((a, b) => b.timestamp - a.timestamp);
          setCreateEvents(createdEvents.slice(0, 20));

          const mockBuyEvents: RealEvent[] = allTokens.slice(0, 5).map((token, idx) => ({
            signature: 'mock-buy-' + idx,
            mint: token.mint.toString(),
            type: 'bought' as const,
            user: token.creator.toString().slice(0, 4),
            userFull: token.creator.toString(),
            tokenName: token.name,
            tokenSymbol: token.symbol,
            tokenImage: token.imageUrl,
            amount: 0.05 + (idx * 0.02),
            tier: token.tier || 2,
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
      new PublicKey(PROGRAM_ID),
      async (logs) => {
        try {
          const tx = await connection.getParsedTransaction(logs.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) return;

          const isBuy = logs.logs.some(log => log.includes('TokensPurchased'));
          const isCreate = logs.logs.some(log => log.includes('TokenCreated'));

          if (!isBuy && !isCreate) return;

          const userFull = tx.transaction.message.accountKeys[0].pubkey.toString();
          const userShort = userFull.slice(0, 4);

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
    <div className="w-full">
      <style jsx>{`
        @keyframes shakeCollision {
          0% { 
            transform: translateX(0) scale(1);
            box-shadow: 0 0 0 rgba(251, 146, 60, 0);
          }
          10% { 
            transform: translateX(15px) scale(1.03);
            box-shadow: 0 0 15px rgba(251, 146, 60, 0.4);
          }
          20% { 
            transform: translateX(-20px) scale(1.05);
            box-shadow: 0 0 25px rgba(251, 146, 60, 0.6);
          }
          30% { 
            transform: translateX(50px) scale(1.07);
            box-shadow: 0 0 30px rgba(251, 146, 60, 0.8);
          }
          40% { 
            transform: translateX(-15px) scale(1.05);
            box-shadow: 0 0 25px rgba(251, 146, 60, 0.6);
          }
          50% { 
            transform: translateX(60px) scale(1.08);
            box-shadow: 0 0 40px rgba(251, 146, 60, 1);
          }
          60% { 
            transform: translateX(-20px) scale(1.05);
            box-shadow: 0 0 25px rgba(251, 146, 60, 0.6);
          }
          70% { 
            transform: translateX(40px) scale(1.04);
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.5);
          }
          80% { 
            transform: translateX(-10px) scale(1.02);
            box-shadow: 0 0 10px rgba(251, 146, 60, 0.3);
          }
          90% { 
            transform: translateX(20px) scale(1.01);
            box-shadow: 0 0 5px rgba(251, 146, 60, 0.2);
          }
          100% { 
            transform: translateX(0) scale(1);
            box-shadow: 0 0 0 rgba(251, 146, 60, 0);
          }
        }

        @keyframes shakeHorizontal {
          0% { 
            transform: translateX(0) scale(1);
            box-shadow: 0 0 0 rgba(34, 211, 238, 0);
          }
          10% { 
            transform: translateX(-15px) scale(1.02);
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
          }
          20% { 
            transform: translateX(15px) scale(1.03);
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
          }
          30% { 
            transform: translateX(-15px) scale(1.03);
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
          }
          40% { 
            transform: translateX(15px) scale(1.04);
            box-shadow: 0 0 25px rgba(34, 211, 238, 0.6);
          }
          50% { 
            transform: translateX(-12px) scale(1.03);
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
          }
          60% { 
            transform: translateX(12px) scale(1.02);
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
          }
          70% { 
            transform: translateX(-8px) scale(1.01);
            box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
          }
          80% { 
            transform: translateX(8px) scale(1.01);
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.2);
          }
          90% { 
            transform: translateX(-4px);
            box-shadow: 0 0 0 rgba(34, 211, 238, 0);
          }
          100% { 
            transform: translateX(0) scale(1);
            box-shadow: 0 0 0 rgba(34, 211, 238, 0);
          }
        }

        .fomo-shake {
          animation: shakeCollision 0.7s ease-out;
          z-index: 10;
          position: relative;
        }

        .creation-shake {
          animation: shakeHorizontal 0.7s ease-out;
          z-index: 5;
          position: relative;
        }
      `}</style>

      <div className="w-full px-4 lg:px-6 py-3">
        <div className="flex flex-col lg:flex-row gap-4 justify-center lg:justify-start">

          {buyEvents.length > 0 && fomoEvent && (
            <Link
              href={'/token/' + fomoEvent.mint}
              className={'fomo-ticker-content flex items-center gap-3 flex-1 lg:max-w-md px-5 py-3 font-bold text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ' + (fomoShake ? 'fomo-shake' : '')}
              style={{
                background: fomoColor.isGradient ? fomoColor.color : fomoColor.color,
                borderRadius: 0,
              }}
            >
              {fomoEvent.tokenImage ? (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border-2 border-black/10">
                  <Image
                    src={fomoEvent.tokenImage}
                    alt={fomoEvent.user}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-black/10 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {fomoEvent.user.toUpperCase()}
                </div>
              )}

              <span className="truncate">
                {fomoEvent.user} bought {fomoEvent.amount.toFixed(4)} SOL of {fomoEvent.tokenSymbol} Target:{fomoColor.target}
              </span>
            </Link>
          )}

          {createEvents.length > 0 && creationEvent && (
            <Link
              href={'/token/' + creationEvent.mint}
              className={'creation-ticker-content hidden lg:flex items-center gap-3 flex-1 lg:max-w-md px-5 py-3 font-bold text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ' + (creationShake ? 'creation-shake' : '')}
              style={{
                backgroundColor: creationColor.color,
                borderRadius: 0,
              }}
            >
              {creationEvent.tokenImage ? (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border-2 border-black/10">
                  <Image
                    src={creationEvent.tokenImage}
                    alt={creationEvent.user}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-black/10 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {creationEvent.user.toUpperCase()}
                </div>
              )}

              <span className="truncate">
                {creationEvent.user} Created {creationEvent.tokenSymbol} Target:{creationColor.target}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}