'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import wallet button solo client-side (no SSR)
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-purple-900/20 to-black">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      
      <div className="relative max-w-6xl mx-auto px-5 py-20 text-center">
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            STONKS.FAN
          </h1>
          <div className="text-3xl md:text-4xl font-bold text-white mb-6">
            The GameStop of Memecoins 💎🙌
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-xl md:text-2xl text-gray-300 mb-6">
            Fair launch or <span className="text-green-400 font-bold">GET YOUR MONEY BACK</span>
          </p>
          <p className="text-lg text-gray-400">
            Only diamond hands. Paper hands can fuck off.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/create">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
              🚀 LAUNCH TOKEN
            </button>
          </Link>
          
          <WalletMultiButton className="!bg-white/10 hover:!bg-white/20 !border !border-white/20" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-3">💎</div>
            <h3 className="text-lg font-bold mb-2">Diamond Hands Only</h3>
            <p className="text-sm text-gray-400">
              Buy-only until target. No paper hands rugpulls.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-bold mb-2">$50K Target</h3>
            <p className="text-sm text-gray-400">
              72h to reach target or automatic refund (98%).
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-bold mb-2">Auto-List DEX</h3>
            <p className="text-sm text-gray-400">
              Hit target = instant graduation to Meteora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
