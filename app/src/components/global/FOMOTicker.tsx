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
            const creatorStr = token.creator.toString(); // ⭐ USA IL CREATOR
            const creatorShort = creatorStr.slice(0, 5); // Primi 5 caratteri del WALLET

            // console.log('🔍 Token:', {
            //   mint: mintStr.slice(0, 8),
            //   creator: creatorStr.slice(0, 8),
            //   isSame: mintStr === creatorStr,
            // });

            return {
              signature: mintStr,
              mint: mintStr,
              type: 'created' as const,
              user: creatorShort, // ⭐ MOSTRA IL CREATOR WALLET
              userFull: creatorStr, // ⭐ CREATOR WALLET COMPLETO
              tokenName: token.name || mintStr.slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              amount: (token.solCollected || 0) / 1e9,
              tier: 2,
              timestamp: token.creationTimestamp * 1000,
            };
          });

          createdEvents.sort((a, b) => b.timestamp - a.timestamp);

          // Crea eventi "buy" dai token con volume
          const tokensWithVolume = allTokens.filter(token => token.totalTradeVolume > 0);

          if (tokensWithVolume.length > 0) {
            mockBuyEvents = tokensWithVolume.slice(0, 10).map((token, idx) => {
              const creatorStr = token.creator.toString(); // ⭐ USA IL CREATOR
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
    }, 2500); // ✅ Aumentata frequenza: 3000ms → 2500ms

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
    }, 3500); // ✅ Aumentata frequenza: 4000ms → 3500ms

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

  // Debug log (disabled - causes spam)
  // console.log('🎯 FOMOTicker DEBUG:', {
  //   buyEventsCount: buyEvents.length,
  //   createEventsCount: createEvents.length,
  //   hasFomoEvent: !!fomoEvent,
  //   hasCreationEvent: !!creationEvent,
  // });

  // Determina il colore in base al tipo di evento
  const getBuyColor = () => BUY_COLORS[fomoIndex % BUY_COLORS.length];
  const getCreatedColor = () => CREATED_COLORS[creationIndex % CREATED_COLORS.length];

  return (
    <div className="mb-2 lg:mb-0">
      <div className="px-1 lg:px-4 py-1 lg:py-1.5">
        <div className="flex flex-col min-[400px]:flex-row gap-2 lg:gap-2 justify-center lg:justify-start items-center lg:items-start">

          {buyEvents.length > 0 && fomoEvent && (
            <Link
              href={'/token/' + fomoEvent.mint}
              className={'fomo-ticker-content flex items-center gap-1.5 lg:gap-1.5 px-2 py-1 lg:px-2 lg:py-1 text-sm lg:text-sm text-black font-medium hover:opacity-90 transition-opacity cursor-pointer ' + (fomoShake ? 'fomo-shake' : '')}
              style={{
                backgroundColor: getBuyColor(),
                borderRadius: 0,
              }}
            >
              <div className="w-5 h-5 lg:w-5 lg:h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                <Image
                  src="/profilo.png"
                  alt={fomoEvent.user}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                {fomoEvent.user}
              </span>

              <span className="whitespace-nowrap text-xs lg:text-xs">
                bought
              </span>

              <span className="whitespace-nowrap font-bold text-xs lg:text-xs">
                {fomoEvent.amount.toFixed(2)} SOL
              </span>

              <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                {fomoEvent.tokenSymbol}
              </span>

              {fomoEvent.tokenImage && (
                <div className="w-4 h-4 lg:w-4 lg:h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                  <Image
                    src={fomoEvent.tokenImage}
                    alt={fomoEvent.tokenSymbol}
                    width={16}
                    height={16}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </Link>
          )}

          {createEvents.length > 0 && creationEvent && (
            <Link
              href={'/token/' + creationEvent.mint}
              className={'creation-ticker-content items-center gap-1.5 lg:gap-1.5 px-2 py-1 lg:px-2 lg:py-1 text-sm lg:text-sm text-black font-medium hover:opacity-90 transition-opacity cursor-pointer hidden min-[400px]:flex lg:w-auto ' + (creationShake ? 'creation-shake' : '')}
              style={{
                backgroundColor: getCreatedColor(),
                borderRadius: 0,
              }}
            >
              <div className="w-5 h-5 lg:w-5 lg:h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                <Image
                  src="/profilo.png"
                  alt={creationEvent.user}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                {creationEvent.user}
              </span>

              <span className="whitespace-nowrap text-xs lg:text-xs">
                CREATED
              </span>

              <span className="whitespace-nowrap font-bold text-xs lg:text-xs">
                {creationEvent.amount.toFixed(2)} SOL
              </span>

              <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                {creationEvent.tokenSymbol}
              </span>

              {creationEvent.tokenImage && (
                <div className="w-4 h-4 lg:w-4 lg:h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                  <Image
                    src={creationEvent.tokenImage}
                    alt={creationEvent.tokenSymbol}
                    width={16}
                    height={16}
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