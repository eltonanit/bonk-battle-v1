'use client';

/**
 * BONK BATTLE - Battle Arena Page
 *
 * Pagina centrale accessibile dal tasto "Start" nella bottom nav.
 *
 * 3 Tabs:
 * - On Battle: token dell'utente attualmente in battaglia
 * - Qualify: token qualificati pronti per trovare un avversario
 * - New: token nuovi che devono ancora qualificarsi
 */

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchAllBonkTokens, BonkToken } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import { RPC_ENDPOINT } from '@/config/solana';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';

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
  solCollected: number;
  userBalance: bigint;
}

type TabType = 'on-battle' | 'qualify' | 'new';

// ============================================================================
// FOMO TICKER COMPONENT
// ============================================================================

function FomoTicker() {
  const [messages, setMessages] = useState([
    '🔥 DOGE just won a battle! +50% liquidity',
    '⚔️ PEPE vs BONK battle started!',
    '🚀 New token MOON created by 0x3f...8a',
    '💰 SHIB qualified for battle!',
    '🏆 WIF dominated and listed on DEX!',
  ]);

  return (
    <div className="bg-[#1a1a2e] border-b border-orange-500/30 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-2">
        {messages.map((msg, i) => (
          <span key={i} className="mx-8 text-sm text-orange-400">
            {msg}
          </span>
        ))}
        {messages.map((msg, i) => (
          <span key={`dup-${i}`} className="mx-8 text-sm text-orange-400">
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TOKEN LIST ITEM COMPONENTS
// ============================================================================

// On Battle - Token in battaglia
function OnBattleItem({ token }: { token: UserToken }) {
  const battleId = token.opponentMint
    ? `${token.mint}_vs_${token.opponentMint}`
    : token.mint;

  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-xl border border-white/10">
      {/* Left: Token info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol} width={48} height={48} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold">
              {token.symbol.slice(0, 2)}
            </div>
          )}
        </div>
        <span className="font-bold text-lg">{token.symbol}</span>
      </div>

      {/* Center: Score + Opponent */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-white/80">0</span>
        <span className="text-white/40">-</span>
        <span className="text-xl font-bold text-white/80">0</span>
        {token.opponentImage && (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 ml-2">
            <Image src={token.opponentImage} alt="opponent" width={32} height={32} className="object-cover" />
          </div>
        )}
      </div>

      {/* Right: View Match button */}
      <Link
        href={`/battle/${battleId}`}
        className="px-4 py-2 bg-orange-500 text-black font-bold rounded-lg text-sm hover:bg-orange-400 transition"
      >
        View Match
      </Link>
    </div>
  );
}

// Qualify - Token qualificato
function QualifyItem({ token, onFindOpponent, onMatchFound }: {
  token: UserToken;
  onFindOpponent: (mint: string) => Promise<boolean>;
  onMatchFound: (message: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [searchInterval, setSearchIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchInterval) clearInterval(searchInterval);
    };
  }, [searchInterval]);

  // Timer countdown
  useEffect(() => {
    if (!searching) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - stop searching
          setSearching(false);
          if (searchInterval) clearInterval(searchInterval);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searching, searchInterval]);

  const handleClick = async () => {
    if (searching) {
      // Cancel search
      setSearching(false);
      setTimeLeft(120);
      if (searchInterval) clearInterval(searchInterval);
      return;
    }

    // Start searching
    setSearching(true);
    setTimeLeft(120);

    // Try to find match immediately
    const found = await onFindOpponent(token.mint);
    if (found) {
      setSearching(false);
      setTimeLeft(120);
      return;
    }

    // Set up polling every 10 seconds
    const interval = setInterval(async () => {
      const matchFound = await onFindOpponent(token.mint);
      if (matchFound) {
        setSearching(false);
        setTimeLeft(120);
        clearInterval(interval);
      }
    }, 10000);

    setSearchIntervalId(interval);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-xl border border-white/10">
      {/* Left: Token info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol} width={48} height={48} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold">
              {token.symbol.slice(0, 2)}
            </div>
          )}
        </div>
        <span className="font-bold text-lg">{token.symbol}</span>
      </div>

      {/* Right: Find Opponent button + Timer */}
      <div className="flex items-center gap-2">
        {searching && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/20 rounded-lg">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-yellow-400 font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
          </div>
        )}
        <button
          onClick={handleClick}
          className={`px-4 py-2 font-bold rounded-lg text-sm transition ${
            searching
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

// New - Token nuovo
function NewItem({ token }: { token: UserToken }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-xl border border-white/10">
      {/* Left: Token info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600">
          {token.image ? (
            <Image src={token.image} alt={token.symbol} width={48} height={48} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold">
              {token.symbol.slice(0, 2)}
            </div>
          )}
        </div>
        <div>
          <span className="font-bold text-lg block">{token.symbol}</span>
          <span className="text-xs text-white/50">
            {(token.solCollected / 1e9).toFixed(2)} SOL collected
          </span>
        </div>
      </div>

      {/* Right: Qualify button */}
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
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('on-battle');
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ==========================================================================
  // FETCH USER TOKENS
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

      // 1. Fetch all BONK tokens
      const allBonkTokens = await fetchAllBonkTokens();

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

      // 3. Build user tokens list
      const tokens: UserToken[] = [];

      for (const token of allBonkTokens) {
        const mintStr = token.mint.toString();
        const userBalance = userBalances.get(mintStr);

        if (!userBalance || userBalance === 0n) continue;

        // Find opponent if in battle
        let opponentData: { mint: string; symbol: string; image: string } | null = null;
        if (token.opponentMint && token.opponentMint !== PublicKey.default.toString()) {
          const opponent = allBonkTokens.find(t => t.mint.toString() === token.opponentMint);
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
          battleStatus: token.battleStatus,
          opponentMint: opponentData?.mint || null,
          opponentSymbol: opponentData?.symbol || null,
          opponentImage: opponentData?.image || null,
          solCollected: token.solCollected,
          userBalance,
        });
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
  // FILTER TOKENS BY TAB
  // ==========================================================================

  const onBattleTokens = userTokens.filter(t => t.battleStatus === BattleStatus.InBattle);
  const qualifiedTokens = userTokens.filter(t => t.battleStatus === BattleStatus.Qualified);
  const newTokens = userTokens.filter(t => t.battleStatus === BattleStatus.Created);

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
        // Battle started successfully!
        setSuccessMessage(`Battle started vs ${data.battle.tokenB.symbol}!`);
        setShowSuccess(true);
        // Refresh tokens after a short delay
        setTimeout(() => {
          fetchUserTokens();
        }, 2000);
        return true;
      }

      // No opponent found yet, keep searching
      return false;
    } catch (error) {
      console.error('Find opponent error:', error);
      return false;
    }
  }, [fetchUserTokens]);

  const handleMatchFound = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      fetchUserTokens();
    }, 2000);
  }, [fetchUserTokens]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white pb-20">
      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message="Battle Started!"
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={2500}
      />

      {/* FOMO Ticker */}
      <FomoTicker />

      {/* Divider */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

      {/* Start Battle Button */}
      <div className="p-4">
        {publicKey ? (
          <Link
            href="/create"
            className="block w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-center text-xl font-bold rounded-xl hover:from-orange-600 hover:to-red-700 transition shadow-lg shadow-orange-500/30"
          >
            ⚔️ Start Battle
          </Link>
        ) : (
          <button
            onClick={() => setVisible(true)}
            className="w-full py-4 bg-orange-500 text-black text-xl font-bold rounded-xl hover:bg-orange-400 transition"
          >
            Log in to start Battle
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('on-battle')}
          className={`flex-1 py-4 text-center font-semibold transition relative ${
            activeTab === 'on-battle' ? 'text-orange-400' : 'text-white/50'
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
          className={`flex-1 py-4 text-center font-semibold transition relative ${
            activeTab === 'qualify' ? 'text-yellow-400' : 'text-white/50'
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
          className={`flex-1 py-4 text-center font-semibold transition relative ${
            activeTab === 'new' ? 'text-green-400' : 'text-white/50'
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
            {activeTab === 'on-battle' && onBattleTokens.map(token => (
              <OnBattleItem key={token.mint} token={token} />
            ))}
            {activeTab === 'qualify' && qualifiedTokens.map(token => (
              <QualifyItem key={token.mint} token={token} onFindOpponent={handleFindOpponent} onMatchFound={handleMatchFound} />
            ))}
            {activeTab === 'new' && newTokens.map(token => (
              <NewItem key={token.mint} token={token} />
            ))}
          </>
        )}
      </div>

      {/* Quick Stats */}
      {publicKey && !loading && userTokens.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4">
          <div className="bg-[#1a1a2e]/90 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-orange-400">{onBattleTokens.length}</div>
              <div className="text-xs text-white/50">In Battle</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold text-yellow-400">{qualifiedTokens.length}</div>
              <div className="text-xs text-white/50">Qualified</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold text-green-400">{newTokens.length}</div>
              <div className="text-xs text-white/50">New</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
