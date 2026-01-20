// =================================================================
// FILE: app/src/app/admin/battle-card/page.tsx
// ADMIN: Battle Card Editor - Configure homepage battle card
// =================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current network
  const getCurrentNetwork = () => {
    if (typeof window === 'undefined') return 'devnet';
    return localStorage.getItem('bonk-network') || 'devnet';
  };

  // Load config and tokens
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
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Battle Card Editor</h1>
            <p className="text-gray-400 mt-1">Configure the homepage battle card</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            Back to Admin
          </Link>
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
      </div>
    </div>
  );
}
