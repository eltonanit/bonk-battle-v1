'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT, REFUND_FEE_BPS } from '@/config/solana';
import { deserializeTokenLaunch } from '@/lib/solana/deserialize';
import { claimRefund } from '@/lib/solana/transactions/claim-refund';
import Image from 'next/image';
import Link from 'next/link';

interface RefundableToken {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  tokenLaunchPDA: string;
  buyerRecordPDA: string;
  solSpent: number;
  refundAmount: number;
  feeAmount: number;
  deadline: number;
}

export function RefundsTab() {
  const { publicKey, signTransaction } = useWallet();
  const [refundableTokens, setRefundableTokens] = useState<RefundableToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchRefundableTokens = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 FETCHING REFUNDABLE TOKENS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Wallet:', publicKey.toBase58());
      console.log('📍 Program ID:', PROGRAM_ID);

      // ⭐ Step 1: Find all BuyerRecords for this wallet
      const buyerRecords = await connection.getProgramAccounts(
        new PublicKey(PROGRAM_ID),
        {
          filters: [
            {
              dataSize: 106 // BuyerRecord size
            },
            {
              memcmp: {
                offset: 40, // ✅ buyer field is at offset 40-72
                bytes: publicKey.toBase58()
              }
            }
          ]
        }
      );

      console.log(`📊 FOUND: ${buyerRecords.length} BuyerRecord accounts`);

      if (buyerRecords.length === 0) {
        console.log('⚠️ No buyer records found');
        setRefundableTokens([]);
        return;
      }

      // ⭐ Step 2: Check each BuyerRecord for refund eligibility
      const refundablePromises = buyerRecords.map(async ({ account, pubkey }) => {
        try {
          const data = account.data;

          // ⭐ Parse BuyerRecord (correct offsets!)
          const tokenLaunchPDA = new PublicKey(data.slice(8, 40));   // launch
          // buyer field exists at offset 40-72 but not used in this logic
          const solSpent = Number(data.readBigUInt64LE(72)) / 1e9;   // sol_spent
          // tokensReceived field exists at offset 80 but not used in this logic
          const refundClaimed = data.readUInt8(88) === 1;            // refund_claimed

          console.log('\n📍 Checking BuyerRecord:', pubkey.toString());
          console.log('   TokenLaunch PDA:', tokenLaunchPDA.toString());
          console.log('   SOL spent:', solSpent);
          console.log('   Refund claimed:', refundClaimed);

          // ⭐ Skip if already claimed
          if (refundClaimed) {
            console.log('   ⏭️ Already claimed - SKIP');
            return null;
          }

          // ⭐ Skip if no investment
          if (solSpent === 0) {
            console.log('   ⏭️ No investment - SKIP');
            return null;
          }

          // ⭐ Fetch TokenLaunch account
          const launchAccount = await connection.getAccountInfo(tokenLaunchPDA);
          if (!launchAccount || !launchAccount.data) {
            console.error('   ❌ TokenLaunch not found');
            return null;
          }

          // ⭐ Validate account size
          const size = launchAccount.data.length;
          if (size < 200) {
            console.error(`   ❌ Invalid size: ${size} bytes`);
            return null;
          }

          console.log(`   ✅ TokenLaunch size: ${size} bytes`);

          // ⭐ USE DESERIALIZER instead of manual parsing!
          const tokenLaunch = deserializeTokenLaunch(launchAccount.data, tokenLaunchPDA);
          if (!tokenLaunch) {
            console.error('   ❌ Failed to deserialize TokenLaunch');
            return null;
          }

          console.log(`   📦 Token: ${tokenLaunch.name} (${tokenLaunch.symbol})`);
          console.log(`   📊 Status: ${getStatusName(tokenLaunch.status)}`);
          console.log(`   ⏰ Deadline: ${new Date(tokenLaunch.deadline * 1000).toLocaleString()}`);

          // ⭐ Check if refundable
          const now = Math.floor(Date.now() / 1000);
          const isExpired = now > tokenLaunch.deadline;
          const isFailed = tokenLaunch.status === 4; // Failed status

          console.log(`   ⏰ Now: ${new Date(now * 1000).toLocaleString()}`);
          console.log(`   📌 Expired: ${isExpired}`);
          console.log(`   📌 Failed: ${isFailed}`);

          // ⭐ Refundable if: (status = Failed) OR (status = Active AND deadline passed)
          const isRefundable = isFailed || (tokenLaunch.status === 0 && isExpired);

          if (!isRefundable) {
            console.log('   ⏭️ Not refundable - SKIP');
            return null;
          }

          console.log('   ✅ REFUNDABLE!');

          // ⭐ Parse metadata for image
          let image = '';
          try {
            const metadata = JSON.parse(tokenLaunch.metadataUri);
            image = metadata.image || '';
          } catch {
            // Ignore parse errors
          }

          // ⭐ Calculate refund amounts (98% back, 2% fee)
          const refundAmount = solSpent * (1 - REFUND_FEE_BPS / 10000);
          const feeAmount = solSpent - refundAmount;

          console.log(`   💰 Refund: ${refundAmount.toFixed(3)} SOL`);
          console.log(`   💸 Fee: ${feeAmount.toFixed(3)} SOL`);

          return {
            mint: tokenLaunch.mint,
            tokenName: tokenLaunch.name,
            tokenSymbol: tokenLaunch.symbol,
            tokenImage: image,
            tokenLaunchPDA: tokenLaunchPDA.toString(),
            buyerRecordPDA: pubkey.toString(),
            solSpent,
            refundAmount,
            feeAmount,
            deadline: tokenLaunch.deadline,
          };
        } catch (error) {
          console.error('❌ Error checking BuyerRecord:', error);
          return null;
        }
      });

      const results = await Promise.all(refundablePromises);
      const validTokens = results.filter((token): token is RefundableToken => token !== null);

      // Sort by deadline (most urgent first)
      validTokens.sort((a, b) => a.deadline - b.deadline);

      setRefundableTokens(validTokens);
      console.log(`\n✅ FOUND: ${validTokens.length} refundable tokens\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
      console.error('❌ Error fetching refundable tokens:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    fetchRefundableTokens();
  }, [publicKey, fetchRefundableTokens]);

  function getStatusName(status: number): string {
    const names = ['Active', 'ReadyToGraduate', 'GraduationInProgress', 'Graduated', 'Failed', 'Paused'];
    return names[status] || 'Unknown';
  }

  async function handleClaim(token: RefundableToken) {
    if (!publicKey || !signTransaction) {
      alert('Please connect wallet');
      return;
    }

    try {
      setClaiming(token.mint);

      console.log('🔄 Claiming refund for:', token.tokenName);

      // ⭐ Call claim refund transaction
      const result = await claimRefund(
        publicKey,
        new PublicKey(token.mint),
        signTransaction
      );

      const solscanUrl = `https://solscan.io/tx/${result.signature}?cluster=devnet`;

      console.log('✅ Refund claimed!');
      console.log('   Signature:', result.signature);
      console.log('   Marked as failed:', result.markedAsFailed);

      // ⭐ Dynamic message based on whether it auto-marked as failed
      const message = result.markedAsFailed
        ? `✅ Token marked as failed & refund claimed!\n\n` +
        `You received: ${token.refundAmount.toFixed(3)} SOL\n` +
        `Fee: ${token.feeAmount.toFixed(3)} SOL (2%)\n\n` +
        `(System automatically marked the token as failed)\n\n` +
        `Signature: ${result.signature.slice(0, 20)}...\n\n` +
        `Click OK to view on Solscan`
        : `✅ Refund claimed!\n\n` +
        `You received: ${token.refundAmount.toFixed(3)} SOL\n` +
        `Fee: ${token.feeAmount.toFixed(3)} SOL (2%)\n\n` +
        `Signature: ${result.signature.slice(0, 20)}...\n\n` +
        `Click OK to view on Solscan`;

      if (confirm(message)) {
        window.open(solscanUrl, '_blank');
      }

      // ⭐ Refresh data
      await fetchRefundableTokens();

    } catch (error: unknown) {
      console.error('❌ Claim failed:', error);

      // Type-safe error message extraction
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      alert(`Failed to claim refund: ${errorMessage}`);
    } finally {
      setClaiming(null);
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view refundable tokens</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (refundableTokens.length === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-green-400 mb-2">
          No Refunds Available
        </h3>
        <p className="text-gray-400">
          All your tokens are either active or successfully graduated! 💎
        </p>
      </div>
    );
  }

  const totalRefundable = refundableTokens.reduce((sum, t) => sum + t.refundAmount, 0);
  const totalFees = refundableTokens.reduce((sum, t) => sum + t.feeAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-orange-400 mb-1">
              ⚠️ Refund Available
            </h2>
            <p className="text-sm text-gray-400">
              {refundableTokens.length} failed token{refundableTokens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Total Available</div>
            <div className="text-3xl font-bold text-orange-400">
              {totalRefundable.toFixed(3)} SOL
            </div>
            <div className="text-sm text-gray-400">
              ~${(totalRefundable * 100).toFixed(0)} USD
            </div>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <p className="text-sm text-gray-300">
            ℹ️ These tokens failed to reach their target. Claim back <strong>98%</strong> of your SOL
            (2% platform fee). You only pay gas (~$0.0005).
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Total fees: {totalFees.toFixed(3)} SOL
          </p>
        </div>
      </div>

      {/* Refundable Tokens */}
      {refundableTokens.map((token) => {
        const now = Math.floor(Date.now() / 1000);
        const daysAgo = Math.floor((now - token.deadline) / 86400);

        return (
          <div
            key={token.mint}
            className="bg-[#0a0a0a] border border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Token Image */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 flex-shrink-0">
                  {token.tokenImage ? (
                    <Image
                      src={token.tokenImage}
                      alt={token.tokenName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {token.tokenSymbol.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Token Info */}
                <div>
                  <h3 className="text-xl font-bold mb-1">{token.tokenName}</h3>
                  <div className="flex items-center gap-3 text-sm mb-1">
                    <span className="text-red-400 font-semibold">❌ Failed</span>
                    <span className="text-gray-400">
                      {daysAgo > 0 ? `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago` : 'Today'}
                    </span>
                  </div>
                  <Link
                    href={`/token/${token.mint}`}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View token page →
                  </Link>
                </div>
              </div>

              {/* Refund Info */}
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">
                  You spent: <span className="text-white font-semibold">{token.solSpent.toFixed(3)} SOL</span>
                </div>
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  Get: {token.refundAmount.toFixed(3)} SOL
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Fee (2%): {token.feeAmount.toFixed(3)} SOL
                </div>

                <button
                  onClick={() => handleClaim(token)}
                  disabled={claiming !== null}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all w-full"
                >
                  {claiming === token.mint ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      CLAIMING...
                    </span>
                  ) : (
                    'CLAIM REFUND 💸'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 