'use client';

import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function FeedFollowersPage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="lg:hidden">
          <FOMOTicker />
        </div>

        <div className="max-w-[1200px] pl-8 pr-5 py-10">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📱 Feed & Followers
          </h1>
          <p className="text-xl text-gray-400 mb-12">
            Stay connected with your favorite traders, track their moves, and build your network
          </p>

          {/* Social Feed Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">📰</span>
              Activity Feed
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Your personalized feed shows real-time activity from traders you follow, including token launches, battles, and victories.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-6">
                  <div className="text-3xl mb-3">🚀</div>
                  <h3 className="text-xl font-semibold mb-2 text-green-400">Token Launches</h3>
                  <p className="text-gray-300">
                    See when traders you follow create new battle tokens. Get early access to promising launches before they go viral.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-lg p-6">
                  <div className="text-3xl mb-3">⚔️</div>
                  <h3 className="text-xl font-semibold mb-2 text-orange-400">Battle Updates</h3>
                  <p className="text-gray-300">
                    Track ongoing battles from your network. Watch duels unfold in real-time and see who's dominating the arena.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-lg p-6">
                  <div className="text-3xl mb-3">🏆</div>
                  <h3 className="text-xl font-semibold mb-2 text-yellow-400">Victory Moments</h3>
                  <p className="text-gray-300">
                    Celebrate wins with your followed traders. Victory notifications highlight successful battles and major achievements.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg p-6">
                  <div className="text-3xl mb-3">💰</div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-400">Trading Activity</h3>
                  <p className="text-gray-300">
                    Monitor buy/sell activity from top performers. Learn from the best by observing their trading patterns.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Follower System */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">👥</span>
              Follower Network
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Build your network by following successful traders and growing your own follower base.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-black/30 border border-purple-500/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">👁️</div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-400">Following</h3>
                  <div className="text-3xl font-bold text-white mb-2">42</div>
                  <p className="text-sm text-gray-400">Traders you follow</p>
                </div>
                <div className="bg-black/30 border border-blue-500/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">💙</div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">Followers</h3>
                  <div className="text-3xl font-bold text-white mb-2">128</div>
                  <p className="text-sm text-gray-400">Your follower count</p>
                </div>
                <div className="bg-black/30 border border-green-500/20 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <h3 className="text-lg font-semibold mb-2 text-green-400">Points Earned</h3>
                  <div className="text-3xl font-bold text-white mb-2">+3,200</div>
                  <p className="text-sm text-gray-400">From new followers</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">Earn +25 Points Per Follower</h3>
                <p className="text-gray-300">
                  Every new follower you gain adds <strong className="text-purple-400">+25 points</strong> to your total. Build your reputation by creating winning tokens and engaging with the community.
                </p>
              </div>
            </div>
          </section>

          {/* Top Traders to Follow */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🌟</span>
              Suggested Traders
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Discover top-performing traders based on win rate, total victories, and community engagement.
              </p>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-2xl">
                      👑
                    </div>
                    <div>
                      <div className="font-semibold text-white">whale.sol</div>
                      <div className="text-sm text-gray-400">14 wins • 89% win rate • 2.4K followers</div>
                    </div>
                  </div>
                  <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                    Follow
                  </button>
                </div>
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-2xl">
                      💎
                    </div>
                    <div>
                      <div className="font-semibold text-white">crypto_king</div>
                      <div className="text-sm text-gray-400">12 wins • 85% win rate • 1.8K followers</div>
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                    Follow
                  </button>
                </div>
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-2xl">
                      🚀
                    </div>
                    <div>
                      <div className="font-semibold text-white">moon_hunter</div>
                      <div className="text-sm text-gray-400">9 wins • 82% win rate • 1.2K followers</div>
                    </div>
                  </div>
                  <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                    Follow
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Feed Filters */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🎛️</span>
              Feed Customization
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Customize your feed to show only the content that matters most to you.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-white mb-3">Filter by Activity</h3>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                    <span>Token Launches</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                    <span>Battle Starts</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                    <span>Victories</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                    <span>Large Trades</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-white mb-3">Sort Options</h3>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="radio" name="sort" className="w-5 h-5" defaultChecked />
                    <span>Most Recent</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="radio" name="sort" className="w-5 h-5" />
                    <span>Most Popular</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="radio" name="sort" className="w-5 h-5" />
                    <span>Top Traders Only</span>
                  </label>
                  <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors">
                    <input type="radio" name="sort" className="w-5 h-5" />
                    <span>My Tokens</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Social Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">💬</span>
              Community Features
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-pink-900/20 to-rose-900/20 border border-pink-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="text-xl font-semibold mb-2 text-pink-400">Comments</h3>
                <p className="text-gray-300">
                  Engage with posts through comments. Share your insights, ask questions, and discuss strategies.
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">❤️</div>
                <h3 className="text-xl font-semibold mb-2 text-red-400">Reactions</h3>
                <p className="text-gray-300">
                  React to victories, launches, and trades with emojis. Show support for your favorite traders.
                </p>
              </div>
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">🔔</div>
                <h3 className="text-xl font-semibold mb-2 text-cyan-400">Notifications</h3>
                <p className="text-gray-300">
                  Get instant alerts when traders you follow launch tokens, enter battles, or claim victories.
                </p>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">✨</span>
              Why Follow Top Traders?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">📚</div>
                <h3 className="text-xl font-semibold mb-2 text-indigo-400">Learn from the Best</h3>
                <p className="text-gray-300">
                  Study winning strategies by observing when top traders launch tokens, enter battles, and make trades.
                </p>
              </div>
              <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 border border-violet-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-xl font-semibold mb-2 text-violet-400">Early Opportunities</h3>
                <p className="text-gray-300">
                  Get notified instantly when successful traders launch new tokens. Be among the first to buy promising projects.
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-xl font-semibold mb-2 text-emerald-400">Strategic Insights</h3>
                <p className="text-gray-300">
                  Understand market patterns by tracking how top performers time their launches and navigate battles.
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold mb-2 text-amber-400">Network Growth</h3>
                <p className="text-gray-300">
                  Build your own following by demonstrating success. More followers = more visibility and influence.
                </p>
              </div>
            </div>
          </section>

          {/* Coming Soon Notice */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-3">Feature Coming Soon</h3>
            <p className="text-gray-300 text-lg">
              The Feed & Followers system is currently in development. Stay tuned for the official launch and start building your network!
            </p>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
