'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function TokenCarousel() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="py-12 bg-black">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-3xl font-bold mb-8">🔥 Live Launches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
                <div className="w-16 h-16 bg-white/10 rounded-full mb-4"></div>
                <div className="h-6 bg-white/10 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-black">
      <div className="max-w-7xl mx-auto px-5 text-center">
        <h2 className="text-3xl font-bold mb-4">🔥 Live Launches</h2>
        <p className="text-gray-400 mb-8">
          No active tokens yet. Be the first to launch! 🚀
        </p>
        <Link href="/create">
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg">
            Launch First Token
          </button>
        </Link>
      </div>
    </div>
  );
}
