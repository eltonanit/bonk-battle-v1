// app/src/components/armies/CreateArmyModal.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCreateArmy } from '@/hooks/useArmies';

interface CreateArmyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateArmyModal({ isOpen, onClose }: CreateArmyModalProps) {
  const { publicKey } = useWallet();
  const createArmy = useCreateArmy();

  const [formData, setFormData] = useState({
    name: '',
    icon: '🏛️',
    image_url: '',
    twitter_url: '',
    telegram_url: '',
  });

  const [error, setError] = useState<string | null>(null);

  // Lista emoji suggerite per le army
  const suggestedEmojis = ['🏛️', '⚔️', '🛡️', '👑', '🔥', '💎', '🚀', '⚡', '💀', '🦅', '🐉', '🦁'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.name.trim()) {
      setError('Army name is required');
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 30) {
      setError('Army name must be between 3 and 30 characters');
      return;
    }

    try {
      await createArmy.mutateAsync({
        name: formData.name.trim(),
        icon: formData.icon,
        image_url: formData.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${formData.name}`,
        twitter_url: formData.twitter_url || undefined,
        telegram_url: formData.telegram_url || undefined,
        capitano_wallet: publicKey.toString(),
      });

      // Success - chiudi modal e resetta form
      setFormData({
        name: '',
        icon: '🏛️',
        image_url: '',
        twitter_url: '',
        telegram_url: '',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create army');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bonk-card border-2 border-bonk-orange-brand rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-bonk-border">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🏛️</span>
              <span>Create Army</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Army Name */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Army Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Diamond Hands"
                className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bonk-orange-brand transition-colors"
                maxLength={30}
              />
              <div className="mt-1 text-xs text-gray-500">
                {formData.name.length}/30 characters
              </div>
            </div>

            {/* Army Icon */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Army Icon
              </label>
              <div className="grid grid-cols-6 gap-2 mb-2">
                {suggestedEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`
                      text-3xl p-2 rounded-lg transition-all
                      ${formData.icon === emoji
                        ? 'bg-bonk-orange-brand scale-110'
                        : 'bg-bonk-dark hover:bg-bonk-border'
                      }
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Or type your own emoji"
                className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-bonk-orange-brand transition-colors text-center text-2xl"
                maxLength={2}
              />
            </div>

            {/* Image URL (Optional) */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Army Image URL <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bonk-orange-brand transition-colors"
              />
              <div className="mt-1 text-xs text-gray-500">
                Leave empty for auto-generated image
              </div>
            </div>

            {/* Twitter URL (Optional) */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Twitter URL <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.twitter_url}
                onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                placeholder="https://twitter.com/..."
                className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bonk-orange-brand transition-colors"
              />
            </div>

            {/* Telegram URL (Optional) */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Telegram URL <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.telegram_url}
                onChange={(e) => setFormData({ ...formData, telegram_url: e.target.value })}
                placeholder="https://t.me/..."
                className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bonk-orange-brand transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Wallet Not Connected Warning */}
            {!publicKey && (
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 text-yellow-400 text-sm">
                ⚠️ Please connect your wallet to create an army
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-bonk-dark border border-bonk-border text-white px-4 py-3 rounded-lg font-bold hover:bg-bonk-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createArmy.isPending || !publicKey}
                className="flex-1 bg-bonk-orange-brand text-white px-4 py-3 rounded-lg font-bold hover:bg-bonk-orange-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createArmy.isPending ? 'Creating...' : 'Create Army'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
