'use client';

import { deserializeTokenLaunch } from '@/lib/solana/deserialize';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';
import Image from 'next/image';
import Link from 'next/link';

interface Position {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  tokenLaunchPDA: string;
  tier: number;
  targetSol: number;
  timeRemaining: number;
  tokensOwned: number;
  solInvested: number;
  buyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  currentValueUSD: number;
}

export function BalancesTab() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    fetchPositions();
  }, [publicKey]);

  async function fetchPositions() {
    if (!publicKey) return;

    try {
      setLoading(true);
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 SEARCHING BUYER RECORDS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Wallet:', publicKey.toBase58());
      console.log('📍 Program ID:', PROGRAM_ID);

      // ⭐ FIX: buyer è a offset 40, non 8!
      const buyerRecords = await connection.getProgramAccounts(
        new PublicKey(PROGRAM_ID),
        {
          filters: [
            {
              dataSize: 106 // BuyerRecord size
            },
            {
              memcmp: {
                offset: 40, // ← CORRETTO! buyer è a offset 40-72
                bytes: publicKey.toBase58()
              }
            }
          ]
        }
      );

      console.log(`📊 FOUND: ${buyerRecords.length} BuyerRecord accounts`);

      if (buyerRecords.length === 0) {
        console.warn('⚠️ NO BUYER RECORDS FOUND!');
        setPositions([]);
        return;
      }

      const positionsData = await Promise.all(
        buyerRecords.map(async ({ account, pubkey }) => {
          try {
            const data = account.data;

            // ⭐ FIX: Leggi nell'ordine corretto!
            const tokenLaunchPDA = new PublicKey(data.slice(8, 40));   // launch PRIMO
            const buyer = new PublicKey(data.slice(40, 72));          // buyer SECONDO
            const solSpent = Number(data.readBigUInt64LE(72)) / 1e9;
            const tokensReceived = Number(data.readBigUInt64LE(80)) / 1e6;
            const refundClaimed = data.readUInt8(88) === 1;

            // Skip if refund already claimed (no tokens)
            if (refundClaimed) {
              console.log('⏭️ Skipping refunded position:', tokenLaunchPDA.toString());
              return null;
            }

            // Skip if no tokens
            if (tokensReceived === 0) {
              console.log('⏭️ Skipping empty position:', tokenLaunchPDA.toString());
              return null;
            }

            console.log('📍 TokenLaunch PDA:', tokenLaunchPDA.toString());
            console.log('   SOL spent:', solSpent);
            console.log('   Tokens received:', tokensReceived);

            // Fetch TokenLaunch account
            const launchAccount = await connection.getAccountInfo(tokenLaunchPDA);

            if (!launchAccount || !launchAccount.data || launchAccount.data.length === 0) {
              console.warn('⚠️ TokenLaunch account empty/closed:', tokenLaunchPDA.toString());
              return null;
            }

            // ⭐ Validate account size (should be ~439-500 bytes)
            if (launchAccount.data.length < 200) {
              console.error(`❌ Invalid TokenLaunch size: ${launchAccount.data.length} bytes`);
              console.error('   This account may be corrupted or is not a TokenLaunch');
              return null;
            }

            // Deserialize TokenLaunch
            const tokenLaunch = deserializeTokenLaunch(launchAccount.data, tokenLaunchPDA);

            if (!tokenLaunch) {
              console.error('❌ Failed to deserialize TokenLaunch');
              return null;
            }

            // Extract image from metadata
            let image = '';
            try {
              const metadata = JSON.parse(tokenLaunch.metadataUri);
              image = metadata.image || '';
            } catch (e) {
              console.warn('⚠️ Failed to parse metadata:', e);
            }

            // Calculations
            const buyPrice = solSpent / tokensReceived;
            const currentVirtualSol = tokenLaunch.virtualSolInit + tokenLaunch.solRaised;
            const currentPrice = calculatePrice(currentVirtualSol, tokenLaunch.constantK);
            const currentValue = tokensReceived * currentPrice;
            const pnl = currentValue - solSpent;
            const pnlPercent = ((currentValue / solSpent) - 1) * 100;
            const now = Math.floor(Date.now() / 1000);
            const timeRemaining = Math.max(0, tokenLaunch.deadline - now);
            const currentValueUSD = currentValue * 100; // Assuming SOL = $100
            const pnlUSD = pnl * 100;

            console.log('✅ Position:', tokenLaunch.name);
            console.log('   Tokens:', tokensReceived);
            console.log('   P&L:', pnlUSD.toFixed(2), 'USD');

            return {
              mint: tokenLaunch.mint,
              tokenName: tokenLaunch.name,
              tokenSymbol: tokenLaunch.symbol,
              tokenImage: image,
              tokenLaunchPDA: tokenLaunchPDA.toString(),
              tier: tokenLaunch.tier,
              targetSol: tokenLaunch.targetSol,
              timeRemaining,
              tokensOwned: tokensReceived,
              solInvested: solSpent,
              buyPrice,
              currentPrice,
              pnl: pnlUSD,
              pnlPercent,
              currentValueUSD,
            };
          } catch (error) {
            console.error('❌ Error parsing position:', error);
            return null;
          }
        })
      );

      const validPositions = positionsData.filter(Boolean) as Position[];
      setPositions(validPositions);
      console.log(`\n✅ FINAL: ${validPositions.length} valid positions loaded\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
      console.error('❌ Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculatePrice(virtualSol: number, constantK: string): number {
    const k = BigInt(constantK);
    const x = BigInt(Math.floor(virtualSol * 1e9));
    const y = k / x;
    return Number(x) / Number(y);
  }

  function formatTime(seconds: number): string {
    if (seconds <= 0) return 'Ended';
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  }

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view your positions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No positions yet</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700"
        >
          Buy Your First Token
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => (
        <Link
          key={position.mint}
          href={`/token/${position.mint}`}
          className="block bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex-shrink-0">
                {position.tokenImage ? (
                  <Image
                    src={position.tokenImage}
                    alt={position.tokenName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {position.tokenSymbol.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold mb-1">{position.tokenName}</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">MC ${(position.currentValueUSD * 1000).toFixed(0)}</span>
                  <span className={`font-bold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(0)} ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1">
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                    TARGET: ${(position.targetSol * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-2">
                <span className="text-sm">⏰</span>
                <span className="text-sm text-gray-400">{formatTime(position.timeRemaining)}</span>
              </div>
              <div className="text-gray-400 text-sm">
                Invested: <span className="text-white font-semibold">${(position.solInvested * 100).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}