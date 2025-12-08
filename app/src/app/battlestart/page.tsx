'use client';

/**
 * BONK BATTLE - Battle Arena Page
 * 
 * ✅ V3 FIX: Filtering basato su solCollected (non battleStatus)
 * - NEW: token con solCollected === 0 (mai ricevuto un buy)
 * - QUALIFY: token con solCollected > 0 (ha ricevuto almeno un buy)
 * - ON BATTLE: token con battleStatus === InBattle
 */

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchTokensFromSupabase } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import { RPC_ENDPOINT } from '@/config/solana';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import Image from 'next/image';
import Link from 'next/link';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';

// Layout components
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';

// ============================================================================
// TYPES
// ============================================================================

interface UserToken {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  battleStatus: BattleStatus;
  opponentMint: string | null;
  opponentSymbol: string | null;
  opponentImage: string | null;
  solCollected: number;  // ⭐ In lamports
  userBalance: bigint;
}

type TabType = 'on-battle' | 'qualify' | 'new';

// ============================================================================
// HELPER: Fetch Battle Status On-Chain
// ============================================================================

async function fetchBattleStatusOnChain(
  connection: Connection,
  mint: PublicKey
): Promise<{ battleStatus: BattleStatus; opponentMint: PublicKey | null; solCollected: number } | null> {
  try {
    const [battleStatePDA] = getBattleStatePDA(mint);
    const accountInfo = await connection.getAccountInfo(battleStatePDA);

    if (!accountInfo || accountInfo.owner.toString() !== BONK_BATTLE_PROGRAM_ID.toString()) {
      return null;
    }

    const data = accountInfo.data;

    // Parse TokenBattleState struct
    // 8 bytes: discriminator
    // 32 bytes: mint
    // 8 bytes: sol_collected
    // 8 bytes: tokens_sold
    // 8 bytes: total_trade_volume
    // 1 byte: is_active
    // 1 byte: battle_status (enum index)
    // 32 bytes: opponent_mint

    let offset = 8 + 32; // Skip discriminator + mint

    // Parse sol_collected (u64 little-endian) - in LAMPORTS
    let solCollected = 0n;
    for (let i = 0; i < 8; i++) {
      solCollected |= BigInt(data[offset + i]) << BigInt(i * 8);
    }
    offset += 8;

    // Skip tokens_sold, total_trade_volume
    offset += 8 + 8;

    // Skip is_active
    offset += 1;

    // Parse battle_status (1 byte)
    const battleStatusIndex = data[offset];
    const battleStatusMap: Record<number, BattleStatus> = {
      0: BattleStatus.Created,
      1: BattleStatus.Qualified,
      2: BattleStatus.InBattle,
      3: BattleStatus.VictoryPending,
      4: BattleStatus.Listed,
    };
    const battleStatus = battleStatusMap[battleStatusIndex] ?? BattleStatus.Created;
    offset += 1;

    // Parse opponent_mint (32 bytes)
    const opponentMintBytes = data.slice(offset, offset + 32);
    const opponentMint = new PublicKey(opponentMintBytes);
    const isDefaultPubkey = opponentMint.equals(PublicKey.default);

    return {
      battleStatus,
      opponentMint: isDefaultPubkey ? null : opponentMint,
      solCollected: Number(solCollected),  // Lamports as number
    };
  } catch (err) {
    console.error(`Error fetching on-chain status for ${mint.toString()}:`, err);
    return null;
  }
}

// ============================================================================
// TOKEN LIST ITEM COMPONENTS
// ============================================================================

// On Battle - Token in battaglia
function OnBattleItem({ token }: { token: UserToken }) {
  const battleId = token.opponentMint
    ? `${token.mint}-${token.opponentMint}`
    : token.mint;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
      <Link href={`/token/${token.mint}`} className="flex items-center gap-3 hover:opacity-80 transition">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol || 'Token'} width={48} height={48} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white">
              {token.symbol?.slice(0, 2) || '??'}
            </div>
          )}
        </div>
        <div>
          <span className="font-bold text-lg block">${token.symbol || 'Unknown'}</span>
          <span className="text-xs text-white/50">{token.name || token.mint.slice(0, 8)}</span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-white/80">0</span>
        <span className="text-white/40">-</span>
        <span className="text-xl font-bold text-white/80">0</span>
        {token.opponentImage && (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 ml-2">
            <Image src={token.opponentImage} alt="opponent" width={32} height={32} className="object-cover w-full h-full" unoptimized />
          </div>
        )}
      </div>

      <Link
        href={`/battle/${battleId}`}
        className="px-4 py-2 bg-orange-500 text-black font-bold rounded-lg text-sm hover:bg-orange-400 transition"
      >
        View Match
      </Link>
    </div>
  );
}

// Qualify - Token qualificato con timer
function QualifyItem({ token, onFindOpponent }: {
  token: UserToken;
  onFindOpponent: (mint: string) => Promise<boolean>;
}) {
  const [searching, setSearching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [searchIntervalRef, setSearchIntervalRef] = useState<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (searchIntervalRef) clearInterval(searchIntervalRef);
    };
  }, [searchIntervalRef]);

  useEffect(() => {
    if (!searching) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setSearching(false);
          if (searchIntervalRef) clearInterval(searchIntervalRef);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searching, searchIntervalRef]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (searching) {
      setSearching(false);
      setTimeLeft(120);
      if (searchIntervalRef) {
        clearInterval(searchIntervalRef);
        setSearchIntervalRef(null);
      }
      return;
    }

    setSearching(true);
    setTimeLeft(120);

    onFindOpponent(token.mint).then(found => {
      if (found) {
        setSearching(false);
        setTimeLeft(120);
        if (searchIntervalRef) {
          clearInterval(searchIntervalRef);
          setSearchIntervalRef(null);
        }
        return;
      }

      const interval = setInterval(() => {
        onFindOpponent(token.mint).then(matchFound => {
          if (matchFound) {
            setSearching(false);
            setTimeLeft(120);
            clearInterval(interval);
            setSearchIntervalRef(null);
          }
        });
      }, 10000);

      setSearchIntervalRef(interval);
    });
  };

  // ⭐ Show SOL collected for debugging
  const solAmount = token.solCollected / 1e9;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
      <Link href={`/token/${token.mint}`} className="flex items-center gap-3 hover:opacity-80 transition">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol || 'Token'} width={48} height={48} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white">
              {token.symbol?.slice(0, 2) || '??'}
            </div>
          )}
        </div>
        <div>
          <span className="font-bold text-lg block">${token.symbol || 'Unknown'}</span>
          <span className="text-xs text-white/50">{token.name || token.mint.slice(0, 8)}</span>
          {/* ⭐ Show SOL collected */}
          <span className="text-xs text-green-400 block">{solAmount.toFixed(4)} SOL collected</span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {searching && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/20 rounded-lg">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-yellow-400 font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleClick}
          className={`px-4 py-2 font-bold rounded-lg text-sm transition cursor-pointer ${searching
            ? 'bg-red-500 hover:bg-red-400 text-white'
            : 'bg-yellow-400 hover:bg-yellow-300 text-black'
            }`}
        >
          {searching ? 'Cancel' : 'Find Opponent'}
        </button>
      </div>
    </div>
  );
}

// New - Token nuovo (0 buys)
function NewItem({ token }: { token: UserToken }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
      <Link href={`/token/${token.mint}`} className="flex items-center gap-3 hover:opacity-80 transition">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol} width={48} height={48} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white">
              {token.symbol?.slice(0, 2) || '??'}
            </div>
          )}
        </div>
        <div>
          <span className="font-bold text-lg block">${token.symbol || 'Unknown'}</span>
          <span className="text-xs text-white/50">{token.name || token.mint.slice(0, 8)}</span>
          {/* ⭐ Indicate no buys yet */}
          <span className="text-xs text-gray-500 block">No buys yet</span>
        </div>
      </Link>

      <Link
        href={`/token/${token.mint}`}
        className="px-4 py-2 bg-green-400 text-black font-bold rounded-lg text-sm hover:bg-green-300 transition"
      >
        Qualify
      </Link>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BattleArenaPage() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [activeTab, setActiveTab] = useState<TabType>('on-battle');
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ==========================================================================
  // FETCH USER TOKENS (with ON-CHAIN status)
  // ==========================================================================

  const fetchUserTokens = useCallback(async () => {
    if (!publicKey) {
      setUserTokens([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      // 1. Fetch token metadata from Supabase
      const allBonkTokens = await fetchTokensFromSupabase();
      console.log(`📊 Found ${allBonkTokens.length} tokens from Supabase`);

      // 2. Get user's token balances
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const userBalances = new Map<string, bigint>();
      for (const { account } of tokenAccounts.value) {
        const data = account.data;
        const mint = new PublicKey(data.slice(0, 32)).toBase58();
        let balance = 0n;
        for (let i = 0; i < 8; i++) {
          balance |= BigInt(data[64 + i]) << BigInt(i * 8);
        }
        if (balance > 0n) {
          userBalances.set(mint, balance);
        }
      }

      // 3. Build user tokens list with ON-CHAIN battle status
      const tokens: UserToken[] = [];
      const addedMints = new Set<string>();

      for (const token of allBonkTokens) {
        const mintStr = token.mint.toString();
        const userBalance = userBalances.get(mintStr) || 0n;
        const isCreator = token.creator?.toString() === publicKey.toString();

        // Include if user owns tokens OR is the creator
        if (userBalance === 0n && !isCreator) continue;
        if (addedMints.has(mintStr)) continue;
        addedMints.add(mintStr);

        // ⭐ FETCH BATTLE STATUS ON-CHAIN (not from Supabase!)
        const onChainState = await fetchBattleStatusOnChain(
          connection,
          new PublicKey(mintStr)
        );

        if (!onChainState) {
          console.warn(`⚠️ No on-chain state for ${mintStr}, skipping`);
          continue;
        }

        // Find opponent info if in battle
        let opponentData: { mint: string; symbol: string; image: string } | null = null;
        if (onChainState.opponentMint) {
          const opponent = allBonkTokens.find(
            t => t.mint.toString() === onChainState.opponentMint?.toString()
          );
          if (opponent) {
            opponentData = {
              mint: opponent.mint.toString(),
              symbol: opponent.symbol || '???',
              image: opponent.image || '',
            };
          }
        }

        tokens.push({
          mint: mintStr,
          name: token.name || 'Unknown',
          symbol: token.symbol || '???',
          image: token.image || '',
          battleStatus: onChainState.battleStatus,
          opponentMint: opponentData?.mint || null,
          opponentSymbol: opponentData?.symbol || null,
          opponentImage: opponentData?.image || null,
          solCollected: onChainState.solCollected,  // ⭐ In lamports!
          userBalance,
        });

        // ⭐ Enhanced logging
        const solAmount = onChainState.solCollected / 1e9;
        const category =
          onChainState.battleStatus === BattleStatus.Listed ? 'LISTED (excluded)' :
            onChainState.battleStatus === BattleStatus.InBattle ? 'IN BATTLE' :
              onChainState.solCollected === 0 ? 'NEW' : 'QUALIFIED';
        console.log(`✅ ${token.symbol}: solCollected=${solAmount.toFixed(4)} SOL, battleStatus=${BattleStatus[onChainState.battleStatus]} → ${category}`);
      }

      setUserTokens(tokens);
    } catch (err) {
      console.error('Error fetching user tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  // ==========================================================================
  // ⭐ V3 FIX: FILTER TOKENS BY TAB (based on solCollected!)
  // ==========================================================================

  // ON BATTLE: Token in battaglia attiva (battleStatus === InBattle)
  const onBattleTokens = userTokens.filter(t => t.battleStatus === BattleStatus.InBattle);

  // ⭐ QUALIFIED: Token con almeno un buy (solCollected > 0) ma NON in battaglia/listed
  const qualifiedTokens = userTokens.filter(t =>
    t.solCollected > 0 &&  // ⭐ Ha ricevuto almeno un buy
    t.battleStatus !== BattleStatus.InBattle &&
    t.battleStatus !== BattleStatus.VictoryPending &&
    t.battleStatus !== BattleStatus.Listed
  );

  // ⭐ NEW: Token che NON hanno MAI ricevuto un buy (solCollected === 0)
  // MA escludere i token Listed (hanno già vinto, liquidità ritirata per Raydium)
  const newTokens = userTokens.filter(t =>
    t.solCollected === 0 &&
    t.battleStatus !== BattleStatus.Listed
  );

  const getTabTokens = () => {
    switch (activeTab) {
      case 'on-battle': return onBattleTokens;
      case 'qualify': return qualifiedTokens;
      case 'new': return newTokens;
    }
  };

  // ==========================================================================
  // FIND OPPONENT HANDLER
  // ==========================================================================

  const handleFindOpponent = useCallback(async (tokenMint: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/battles/find-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Find match error:', data.error);
        return false;
      }

      if (data.found && data.battle) {
        setSuccessMessage(`Battle started vs ${data.battle.tokenB.symbol}!`);
        setShowSuccess(true);
        setTimeout(() => {
          fetchUserTokens();
        }, 2000);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Find opponent error:', error);
      return false;
    }
  }, [fetchUserTokens]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      {/* Tickers SOPRA Header - SOLO mobile/tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message="Battle Started!"
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={2500}
      />

      {/* Layout Components */}
      <Sidebar />
      <DesktopHeader />
      <Header />

      {/* Main Content */}
      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 max-w-full">

        {/* Divider */}
        <div className="h-px bg-cyan-400/30" />

        {/* No tokens? Start a new battle */}
        <div className="p-3 lg:px-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <img src="/profilo.png" alt="" className="w-6 h-6 rounded-full" />
            <span className="text-white text-base font-medium">No tokens?</span>
          </div>
          {publicKey ? (
            <Link
              href="/create"
              className="px-4 py-2 bg-orange-400 text-black text-sm font-bold rounded-lg hover:bg-orange-300 transition"
            >
              Start New Battle
            </Link>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-2 bg-orange-400 text-black text-sm font-bold rounded-lg hover:bg-orange-300 transition"
            >
              Start New Battle
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-cyan-400/30" />

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('on-battle')}
            className={`flex-1 py-4 text-center font-semibold transition relative ${activeTab === 'on-battle' ? 'text-orange-400' : 'text-white/50'
              }`}
          >
            On Battle
            {onBattleTokens.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-black text-xs rounded-full">
                {onBattleTokens.length}
              </span>
            )}
            {activeTab === 'on-battle' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('qualify')}
            className={`flex-1 py-4 text-center font-semibold transition relative ${activeTab === 'qualify' ? 'text-yellow-400' : 'text-white/50'
              }`}
          >
            Qualify
            {qualifiedTokens.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-yellow-400 text-black text-xs rounded-full">
                {qualifiedTokens.length}
              </span>
            )}
            {activeTab === 'qualify' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-yellow-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-4 text-center font-semibold transition relative ${activeTab === 'new' ? 'text-green-400' : 'text-white/50'
              }`}
          >
            New
            {newTokens.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-green-400 text-black text-xs rounded-full">
                {newTokens.length}
              </span>
            )}
            {activeTab === 'new' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-green-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-3">
          {!publicKey ? (
            <div className="text-center py-12">
              <p className="text-white/50 mb-4">Connect your wallet to see your tokens</p>
              <button
                onClick={() => setVisible(true)}
                className="px-6 py-3 bg-orange-500 text-black font-bold rounded-xl"
              >
                Connect Wallet
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : getTabTokens().length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">
                {activeTab === 'on-battle' && '⚔️'}
                {activeTab === 'qualify' && '🎯'}
                {activeTab === 'new' && '🌟'}
              </div>
              <p className="text-white/50 mb-2">
                {activeTab === 'on-battle' && 'No tokens in battle yet'}
                {activeTab === 'qualify' && 'No qualified tokens'}
                {activeTab === 'new' && 'No new tokens'}
              </p>
              <p className="text-white/30 text-sm">
                {activeTab === 'on-battle' && 'Qualify your tokens to start battling!'}
                {activeTab === 'qualify' && 'Buy tokens to help them qualify'}
                {activeTab === 'new' && 'Create a new token to get started'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'on-battle' && (
                <>
                  {onBattleTokens.map(token => (
                    <OnBattleItem key={token.mint} token={token} />
                  ))}
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <div className="flex items-center gap-2">
                      <img src="/profilo.png" alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-white text-base font-semibold">More battle?</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="px-4 py-2 bg-orange-500 text-black text-sm font-bold rounded-lg hover:bg-orange-400 transition"
                    >
                      Qualify more tokens
                    </button>
                  </div>
                </>
              )}
              {activeTab === 'qualify' && (
                <>
                  {qualifiedTokens.map(token => (
                    <QualifyItem key={token.mint} token={token} onFindOpponent={handleFindOpponent} />
                  ))}
                  <div className="flex justify-center mt-4">
                    <Link
                      href="/create"
                      className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition text-sm"
                    >
                      Create a new token
                    </Link>
                  </div>
                </>
              )}
              {activeTab === 'new' && (
                <>
                  {newTokens.map(token => (
                    <NewItem key={token.mint} token={token} />
                  ))}
                  <div className="flex justify-center mt-4">
                    <Link
                      href="/create"
                      className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition text-sm"
                    >
                      Create a new token
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}