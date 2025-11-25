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
  // For battle events
  opponentMint?: string;
  opponentName?: string;
  opponentSymbol?: string;
  opponentImage?: string;
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
  const [allEvents, setAllEvents] = useState<RealEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExistingTokens() {
      try {
        const allTokens = await fetchAllBonkTokens();

        // ⭐ SEMPRE crea eventi, anche se vuoti (fallback)
        let createdEvents: RealEvent[] = [];
        let mockBuyEvents: RealEvent[] = [];
        let battleEventsData: RealEvent[] = [];

        if (allTokens.length > 0) {
          // ⭐ Crea eventi BATTLE (token con opponentMint valido)
          const battlingTokens = allTokens.filter(token => {
            const opponentStr = token.opponentMint?.toString();
            return opponentStr && opponentStr !== '11111111111111111111111111111111' && token.battleStatus === 2; // 2 = InBattle
          });

          const processed = new Set<string>();
          for (const token of battlingTokens) {
            const mintStr = token.mint.toString();
            if (processed.has(mintStr)) continue;

            const opponentMint = token.opponentMint?.toString();
            if (!opponentMint) continue;

            const opponent = allTokens.find(t => t.mint.toString() === opponentMint);
            if (!opponent) continue;

            battleEventsData.push({
              signature: `battle-${mintStr}-${opponentMint}`,
              mint: mintStr,
              type: 'started_battle',
              user: 'BATTLE',
              userFull: 'BATTLE',
              tokenName: token.name || token.symbol || mintStr.slice(0, 8),
              tokenSymbol: token.symbol || 'UNK',
              tokenImage: token.image,
              amount: 0,
              tier: 3,
              timestamp: Date.now(),
              opponentMint: opponentMint,
              opponentName: opponent.name || opponent.symbol || opponentMint.slice(0, 8),
              opponentSymbol: opponent.symbol || 'UNK',
              opponentImage: opponent.image,
            });

            processed.add(mintStr);
            processed.add(opponentMint);
          }


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

        // ⭐ Combina tutti gli eventi in un unico array
        const combined: RealEvent[] = [
          ...battleEventsData,  // Battle events first
          ...createdEvents.slice(0, 20),  // Created events
          ...mockBuyEvents,  // Buy events (if any)
        ];

        setAllEvents(combined);

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

          // Add to combined events
          setAllEvents(prev => [newEvent, ...prev].slice(0, 50));
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

  // Single ticker rotation for all events
  useEffect(() => {
    if (allEvents.length === 0) return;

    const interval = setInterval(() => {
      const element = document.querySelector('.ticker-content');
      if (element) {
        void (element as HTMLElement).offsetWidth;
      }

      setShake(true);
      setCurrentIndex(prev => (prev + 1) % allEvents.length);
      setTimeout(() => setShake(false), 600);
    }, 1500); // 1.5 secondi per evento

    return () => clearInterval(interval);
  }, [allEvents.length]);

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

  if (allEvents.length === 0) {
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

  const currentEvent = allEvents[currentIndex];

  // Determina il colore in base al tipo di evento
  const getEventColor = (event: RealEvent) => {
    if (event.type === 'started_battle') return '#FFA019'; // Arancione fisso per battle
    if (event.type === 'created') return CREATED_COLORS[currentIndex % CREATED_COLORS.length];
    return BUY_COLORS[currentIndex % BUY_COLORS.length]; // bought/sell
  };

  return (
    <div className="mb-2 lg:mb-0">
      <div className="px-1 lg:px-4 py-1 lg:py-1.5">
        <div className="flex justify-center lg:justify-start items-center">
          <Link
            href={`/token/${currentEvent.mint}`}
            className={'ticker-content flex items-center gap-1.5 lg:gap-2 px-2 py-1 lg:px-3 lg:py-1.5 text-sm lg:text-sm text-black font-medium hover:opacity-90 transition-opacity cursor-pointer ' + (shake ? 'ticker-shake' : '')}
            style={{
              backgroundColor: getEventColor(currentEvent),
              borderRadius: 0,
            }}
          >
            {currentEvent.type === 'started_battle' ? (
              <>
                {/* Battle Event */}
                <span className="whitespace-nowrap text-xs lg:text-sm uppercase font-extrabold">
                  ⚔️ BATTLE STARTED:
                </span>

                {currentEvent.tokenImage && (
                  <div className="w-4 h-4 lg:w-4 lg:h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
                    <Image
                      src={currentEvent.tokenImage}
                      alt={currentEvent.tokenSymbol}
                      width={16}
                      height={16}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                )}

                <span className="whitespace-nowrap font-extrabold uppercase text-xs lg:text-sm">
                  {currentEvent.tokenSymbol}
                </span>

                <span className="whitespace-nowrap text-xs lg:text-sm font-bold">
                  VS
                </span>

                <span className="whitespace-nowrap font-extrabold uppercase text-xs lg:text-sm">
                  {currentEvent.opponentSymbol}
                </span>

                {currentEvent.opponentImage && (
                  <div className="w-4 h-4 lg:w-4 lg:h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
                    <Image
                      src={currentEvent.opponentImage}
                      alt={currentEvent.opponentSymbol || 'Opponent'}
                      width={16}
                      height={16}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Created/Buy Event */}
                <div className="w-5 h-5 lg:w-5 lg:h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                  <Image
                    src="/profilo.png"
                    alt={currentEvent.user}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                  {currentEvent.user}
                </span>

                <span className="whitespace-nowrap text-xs lg:text-xs">
                  {currentEvent.type === 'created' ? 'CREATED' : 'bought'}
                </span>

                <span className="whitespace-nowrap font-bold text-xs lg:text-xs">
                  {currentEvent.amount.toFixed(2)} SOL
                </span>

                <span className="whitespace-nowrap font-bold uppercase text-xs lg:text-xs">
                  {currentEvent.tokenSymbol}
                </span>

                {currentEvent.tokenImage && (
                  <div className="w-4 h-4 lg:w-4 lg:h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/10">
                    <Image
                      src={currentEvent.tokenImage}
                      alt={currentEvent.tokenSymbol}
                      width={16}
                      height={16}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}