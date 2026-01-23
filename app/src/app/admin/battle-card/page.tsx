// =================================================================
// FILE: app/src/app/admin/battle-card/page.tsx
// ADMIN: Battle Card Editor - Configure homepage battle card
// =================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Admin Sidebar Component
function AdminSidebar() {
  const pathname = usePathname();
  const [network, setNetwork] = useState('mainnet');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNetwork(localStorage.getItem('bonk-network') || 'mainnet');
    }
  }, []);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/sale/admin.html', label: 'Token Dashboard', icon: '🪙', external: true },
    { href: '/sale/users.html', label: 'Users', icon: '👥', external: true },
    { href: '/admin/battle-card', label: 'Battle Card Editor', icon: '⚔️' },
    { href: '/create', label: 'Create Token', icon: '➕' },
    { href: '/sale/my-battles.html', label: 'Battle List', icon: '🗡️', external: true },
    { href: '/', label: 'Public Site', icon: '🌐', external: true },
  ];

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-[#12121a] border-r border-[#2a2a3a] p-6 flex flex-col overflow-y-auto">
      {/* Logo */}
      <Link href="/admin" className="flex items-center gap-2 mb-6 text-[#00ff88] font-mono font-bold">
        <span className="w-8 h-8 bg-gradient-to-br from-[#00ff88] to-[#8b5cf6] rounded-lg flex items-center justify-center text-sm">
          ⚔️
        </span>
        <span>BATTLECOIN</span>
      </Link>

      {/* Network Badge */}
      <div className="flex items-center gap-2 px-3 py-2 mb-4">
        <Link
          href="/sale/network.html"
          className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs"
        >
          NET
        </Link>
        <span className={`px-2 py-1 rounded text-[9px] font-bold transform rotate-12 ${
          network === 'devnet' ? 'bg-purple-400 text-black' : 'bg-emerald-400 text-black'
        }`}>
          {network.toUpperCase()}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return item.external ? (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-all ${
                isActive
                  ? 'bg-[#00ff88]/10 text-[#00ff88]'
                  : 'text-gray-400 hover:bg-[#1a1a24] hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-all ${
                isActive
                  ? 'bg-[#00ff88]/10 text-[#00ff88]'
                  : 'text-gray-400 hover:bg-[#1a1a24] hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-[#2a2a3a]">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 transition-all"
        >
          <span>🚪</span>
          <span>Exit Admin</span>
        </Link>
      </div>
    </aside>
  );
}

interface BattleCardConfig {
  id: string;
  question: string;
  target_text: string;
  context_text: string;
  token_a_mint: string | null;
  token_b_mint: string | null;
  token_a_link: string | null;
  token_b_link: string | null;
  is_active: boolean;
  network: string;
}

interface TokenOption {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
}

interface Battle {
  id: string;
  token_a_mint: string;
  token_b_mint: string;
  status: string;
  started_at: string;
  token_a?: TokenOption;
  token_b?: TokenOption;
}

export default function BattleCardAdminPage() {
  const [config, setConfig] = useState<BattleCardConfig>({
    id: 'main',
    question: 'Which coin deserves to reach a $10B market cap?',
    target_text: 'First to $10B wins.',
    context_text: 'Buy the token you believe will win the battle.',
    token_a_mint: null,
    token_b_mint: null,
    token_a_link: null,
    token_b_link: null,
    is_active: true,
    network: 'devnet',
  });

  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedBattleId, setSelectedBattleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current network
  const getCurrentNetwork = () => {
    if (typeof window === 'undefined') return 'devnet';
    return localStorage.getItem('bonk-network') || 'devnet';
  };

  // Load config, tokens, and battles
  useEffect(() => {
    async function loadData() {
      try {
        const network = getCurrentNetwork();

        // Load existing config
        const configRes = await fetch('/api/admin/battle-card-config');
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig({ ...configData, network });
        }

        // Load available tokens for selection
        const { data: tokensData } = await supabase
          .from('tokens')
          .select('mint, name, symbol, image')
          .eq('network', network)
          .order('name');

        if (tokensData) {
          setTokens(tokensData);
        }

        // Load active battles
        const { data: battlesData } = await supabase
          .from('battles')
          .select('id, token_a_mint, token_b_mint, status, started_at')
          .eq('status', 'active')
          .order('started_at', { ascending: false });

        if (battlesData && tokensData) {
          // Enrich battles with token info
          const enrichedBattles = battlesData.map(battle => ({
            ...battle,
            token_a: tokensData.find(t => t.mint === battle.token_a_mint),
            token_b: tokensData.find(t => t.mint === battle.token_b_mint),
          }));
          setBattles(enrichedBattles);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle battle selection
  const handleBattleSelect = (battleId: string) => {
    setSelectedBattleId(battleId);

    if (!battleId) return;

    const battle = battles.find(b => b.id === battleId);
    if (battle) {
      setConfig(prev => ({
        ...prev,
        token_a_mint: battle.token_a_mint,
        token_b_mint: battle.token_b_mint,
      }));
      setMessage({ type: 'success', text: `Battle loaded: ${battle.token_a?.symbol || 'A'} vs ${battle.token_b?.symbol || 'B'}` });
    }
  };

  // Save config
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/battle-card-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Battle Card configuration saved!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  // Get token info
  const getTokenInfo = (mint: string | null) => {
    if (!mint) return null;
    return tokens.find(t => t.mint === mint);
  };

  const tokenA = getTokenInfo(config.token_a_mint);
  const tokenB = getTokenInfo(config.token_b_mint);

  // Share to X (Twitter)
  const handleShareToX = () => {
    if (!tokenA || !tokenB) return;

    const battleUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://bonkbattle.lol'}/battle/${config.token_a_mint}-${config.token_b_mint}`;

    const tweetText = `🚨 NEW BATTLE LIVE!

${config.question}

$${tokenA.symbol} ⚔️ $${tokenB.symbol}

💰 $100 → $50,000 potential
🏆 Winner gets listed on DEX!

Pick your side 👇
#BonkBattle #Solana #Crypto`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(battleUrl)}`;

    window.open(twitterUrl, '_blank', 'width=550,height=520');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <AdminSidebar />
        <div className="ml-64 flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">⚔️ Battle Card Editor</h1>
              <p className="text-gray-400 mt-1">Configure the homepage battle card</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#1a1a24] border border-[#2a2a3a] rounded-lg hover:border-[#00ff88] hover:text-[#00ff88] transition flex items-center gap-2"
            >
              🔄 Refresh
            </button>
          </div>

        {/* Choose Battle - Yellow Section */}
        <div className="mb-8 p-4 bg-yellow-500/20 border-2 border-yellow-500 rounded-xl">
          <label className="block text-lg font-bold text-yellow-400 mb-3">
            ⚔️ Choose Battle
          </label>
          <select
            value={selectedBattleId}
            onChange={(e) => handleBattleSelect(e.target.value)}
            className="w-full bg-gray-800 border-2 border-yellow-500 rounded-lg px-4 py-3 text-white font-semibold focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="">-- Select a Battle to Edit --</option>
            {battles.map((battle) => (
              <option key={battle.id} value={battle.id}>
                {battle.token_a?.symbol || battle.token_a_mint.slice(0, 8)} vs {battle.token_b?.symbol || battle.token_b_mint.slice(0, 8)}
                {' '}- {new Date(battle.started_at).toLocaleDateString()}
              </option>
            ))}
          </select>
          {battles.length === 0 && (
            <p className="text-yellow-300 text-sm mt-2">No active battles found</p>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Battle Question (Tagline)
              </label>
              <textarea
                value={config.question}
                onChange={(e) => setConfig({ ...config, question: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Which coin deserves to reach a $10B market cap?"
              />
            </div>

            {/* Target Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Text (Rule)
              </label>
              <input
                type="text"
                value={config.target_text}
                onChange={(e) => setConfig({ ...config, target_text: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="First to $10B wins."
              />
            </div>

            {/* Context Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Context Text (Description)
              </label>
              <input
                type="text"
                value={config.context_text}
                onChange={(e) => setConfig({ ...config, context_text: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buy the token you believe will win."
              />
            </div>

            {/* Token A */}
            <div className="p-4 bg-gray-800 rounded-lg border border-blue-500/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Token A (Left Side)</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Select Token</label>
                  <select
                    value={config.token_a_mint || ''}
                    onChange={(e) => setConfig({ ...config, token_a_mint: e.target.value || null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">-- Select Token --</option>
                    {tokens.map((t) => (
                      <option key={t.mint} value={t.mint}>
                        {t.name} ({t.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Custom Link (optional)</label>
                  <input
                    type="text"
                    value={config.token_a_link || ''}
                    onChange={(e) => setConfig({ ...config, token_a_link: e.target.value || null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="/token/MINT or https://..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use /token/[mint]</p>
                </div>
              </div>
            </div>

            {/* Token B */}
            <div className="p-4 bg-gray-800 rounded-lg border border-orange-500/30">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">Token B (Right Side)</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Select Token</label>
                  <select
                    value={config.token_b_mint || ''}
                    onChange={(e) => setConfig({ ...config, token_b_mint: e.target.value || null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">-- Select Token --</option>
                    {tokens.map((t) => (
                      <option key={t.mint} value={t.mint}>
                        {t.name} ({t.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Custom Link (optional)</label>
                  <input
                    type="text"
                    value={config.token_b_link || ''}
                    onChange={(e) => setConfig({ ...config, token_b_link: e.target.value || null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="/token/MINT or https://..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use /token/[mint]</p>
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-300">
                Show Battle Card on Homepage
              </label>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {/* Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="bg-white rounded-2xl p-6 text-gray-900">
              {/* Question */}
              <h3 className="text-2xl font-bold mb-6 leading-tight">
                {config.question || 'Which coin will win?'}
              </h3>

              {/* Sides */}
              <div className="flex gap-4 mb-6">
                {/* Token A */}
                <div className="flex-1 bg-gray-100 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden bg-gray-200">
                    {tokenA?.image ? (
                      <Image src={tokenA.image} alt={tokenA.symbol} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                        {tokenA?.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-lg">{tokenA?.name || 'TOKEN A'}</div>
                  <div className="text-gray-500 text-sm mb-3">51%</div>
                  <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">
                    FIGHT FOR {tokenA?.symbol || 'A'}
                  </button>
                </div>

                {/* Token B */}
                <div className="flex-1 bg-gray-100 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden bg-gray-200">
                    {tokenB?.image ? (
                      <Image src={tokenB.image} alt={tokenB.symbol} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                        {tokenB?.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-lg">{tokenB?.name || 'TOKEN B'}</div>
                  <div className="text-gray-500 text-sm mb-3">49%</div>
                  <button className="w-full bg-orange-500 text-white font-bold py-2 rounded-lg text-sm">
                    FIGHT FOR {tokenB?.symbol || 'B'}
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200">
                  <div className="bg-blue-600" style={{ width: '51%' }} />
                  <div className="bg-orange-500" style={{ width: '49%' }} />
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {config.target_text || 'First to $10B wins.'}
                </p>
              </div>

              {/* Context */}
              {config.context_text && (
                <p className="text-sm text-gray-600 border-t pt-3">
                  {config.context_text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Publish to X */}
        <div className="mt-8 p-6 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-[#00ff88] rounded-full flex items-center justify-center text-sm text-black font-bold">5</span>
            Publish to X
          </h2>

          <p className="text-gray-400 text-sm mb-4">
            Share this battle on the official BONK BATTLE X account. Twitter will automatically fetch the OG preview card.
          </p>

          {tokenA && tokenB ? (
            <div className="space-y-4">
              {/* Tweet Preview */}
              <div className="bg-[#0a0a0f] border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {`🚨 NEW BATTLE LIVE!

${config.question}

$${tokenA.symbol} ⚔️ $${tokenB.symbol}

💰 $100 → $50,000 potential
🏆 Winner gets listed on DEX!

Pick your side 👇
#BonkBattle #Solana #Crypto`}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs text-gray-500">🔗 Battle URL will be attached automatically</span>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShareToX}
                className="w-full py-4 bg-black hover:bg-gray-900 border border-gray-600 rounded-lg font-bold transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-white">Share on X</span>
              </button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4 bg-[#0a0a0f] rounded-lg">
              Select both tokens above to enable sharing
            </p>
          )}
        </div>

        </div>
      </main>
    </div>
  );
}
