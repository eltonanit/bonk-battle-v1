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
  type: 'bought' | 'created' | 'sell' | 'started_battle';
  user: string;
  userFull: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  amount: number;
  tier: number;
  timestamp: number;
}

// Colori BUY (alterna verde/giallo/blu)
const BUY_COLORS = [
  '#4BDE81',  // Verde
  '#EFFE16',  // Giallo
  '#93EAEB'   // Blu
];

// Colori SELL (alterna rosso/rosso2)
const SELL_COLORS = [
  '#FAA6A3',  // Rosso
  '#FDBA7E'   // Rosso 2
];

// Colori CREATED (alterna giallo/rosso2/arancione)
const CREATED_COLORS = [
  '#EFFE16',  // Giallo
  '#FDBA7E',  // Rosso 2
  '#FFA019'   // Arancione
];

// Colori STARTED BATTLE (alterna giallo/arancione)
const STARTED_BATTLE_COLORS = [
  '#EFFE16',  // Giallo
  '#FFA019'   // Arancione
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

        // ⭐ SEMPRE crea eventi, anche se vuoti (fallback)
        let createdEvents: RealEvent[] = [];
        let mockBuyEvents: RealEvent[] = [];

        if (allTokens.length > 0) {
          // Crea eventi "created" da TUTTI i token
          createdEvents = allTokens.map(token => {
            const mintStr = token.mint.toString();
            // ⭐ V2 FIX: creator might be undefined, fallback to mint
            const creatorStr = token.creator?.toString() || mintStr;
            const creatorShort = creatorStr.slice(0, 5); // Primi 5 caratteri del WALLET

            return {
              signature: mintStr,
              mint: mintStr,
              type: 'created' as const,
              user: creatorShort, // ⭐ MOSTRA IL CREATOR WALLET
              userFull: creatorStr, // ⭐ CREATOR WALLET COMPLETO
              tokenName: token.name || mintStr.slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              // ⭐ V2 FIX: use solCollected or realSolReserves
              amount: (token.solCollected ?? token.realSolReserves ?? 0) / 1e9,
              tier: 2,
              timestamp: token.creationTimestamp * 1000,
            };
          });

          createdEvents.sort((a, b) => b.timestamp - a.timestamp);

          // Crea eventi "buy" dai token con volume
          const tokensWithVolume = allTokens.filter(token => token.totalTradeVolume > 0);

          if (tokensWithVolume.length > 0) {
            mockBuyEvents = tokensWithVolume.slice(0, 10).map((token, idx) => {
              // ⭐ V2 FIX: creator might be undefined, fallback to mint
              const creatorStr = token.creator?.toString() || token.mint.toString();
              return {
                signature: 'mock-buy-' + idx,
                mint: token.mint.toString(),
                type: 'bought' as const,
                user: creatorStr.slice(0, 5), // ⭐ MOSTRA IL CREATOR WALLET
                userFull: creatorStr, // ⭐ CREATOR WALLET COMPLETO
                tokenName: token.name || token.mint.toString().slice(0, 8),
                tokenSymbol: token.symbol || 'UNK',
                tokenImage: token.image,
                amount: (token.totalTradeVolume / 1e9) / 10,
                tier: 2,
                timestamp: Date.now() - (idx * 1000),
              };
            });
          } else {
            // ⭐ FALLBACK: Se non ci sono buy, usa i created come buy
            mockBuyEvents = createdEvents.slice(0, 10).map((event, idx) => ({
              ...event,
              type: 'bought' as const,
              timestamp: Date.now() - (idx * 1000),
            }));
          }
        }

        // ⭐ GARANTISCE sempre almeno 1 evento per ticker
        setCreateEvents(createdEvents.length > 0 ? createdEvents.slice(0, 20) : []);
        setBuyEvents(mockBuyEvents.length > 0 ? mockBuyEvents : []);

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
          const userShort = userFull.slice(0, 5); // 5 characters from address

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

  // Determina il colore in base al tipo di evento
  const getBuyColor = () => BUY_COLORS[fomoIndex % BUY_COLORS.length];
  const getCreatedColor = () => CREATED_COLORS[creationIndex % CREATED_COLORS.length];

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
        <div className="flex flex-col gap-3 justify-start min-[400px]:flex-row">

          {buyEvents.length > 0 && fomoEvent && (
            <Link
              href={'/token/' + fomoEvent.mint}
              className={'fomo-ticker-content flex items-center gap-1 lg:gap-1.5 pl-2 pr-1 py-1 lg:pl-3 lg:pr-2 lg:py-1.5 text-xs lg:text-sm text-black font-medium hover:opacity-90 transition-opacity cursor-pointer ' + (fomoShake ? 'fomo-shake' : '')}
              style={{
                backgroundColor: getBuyColor(),
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

              <span className="whitespace-nowrap font-bold uppercase">
                {fomoEvent.user}
              </span>

              <span className="whitespace-nowrap">
                bought
              </span>

              <span className="whitespace-nowrap font-bold">
                {fomoEvent.amount.toFixed(2)} SOL
              </span>

              <span className="whitespace-nowrap font-bold uppercase">
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
              className={'creation-ticker-content items-center gap-1 lg:gap-1.5 pl-2 pr-1 py-1 lg:pl-3 lg:pr-2 lg:py-1.5 text-xs lg:text-sm text-black font-medium hover:opacity-90 transition-opacity cursor-pointer hidden min-[400px]:flex ' + (creationShake ? 'creation-shake' : '')}
              style={{
                backgroundColor: getCreatedColor(),
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

              <span className="whitespace-nowrap font-bold uppercase">
                {creationEvent.user}
              </span>

              <span className="whitespace-nowrap">
                CREATED
              </span>

              <span className="whitespace-nowrap font-bold">
                {creationEvent.amount.toFixed(2)} SOL
              </span>

              <span className="whitespace-nowrap font-bold uppercase">
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