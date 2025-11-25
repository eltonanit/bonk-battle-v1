'use client';

import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function PointsPage() {
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
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            ⭐ Points System
          </h1>
          <p className="text-xl text-gray-400 mb-12">
            Earn points, climb the leaderboard, and secure your share of the future airdrop
          </p>

          {/* Welcome Flow Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              Welcome Bonus
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-yellow-400">First Login Reward</h3>
                  <p className="text-gray-300 mb-4">
                    New users receive an instant <strong className="text-yellow-400">1,000 points welcome bonus</strong> upon their first login.
                  </p>
                  <div className="bg-black/30 border border-yellow-500/30 rounded-lg p-6 text-center">
                    <div className="text-5xl mb-3">⭐</div>
                    <div className="text-3xl font-bold text-yellow-400 mb-2">1,000 Points</div>
                    <div className="text-sm text-gray-400">Claim on first login</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">How It Works</h3>
                  <ol className="space-y-3 text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold">1.</span>
                      <span>Connect your wallet and login for the first time</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold">2.</span>
                      <span>Welcome popup appears with your bonus</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold">3.</span>
                      <span>Click "Claim Now" and watch the counter animate</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold">4.</span>
                      <span>Instantly redirected to your Points dashboard</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Points Dashboard Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Your Points Dashboard
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Access your Points page from the navigation menu or by clicking your points counter. Track your progress, rank, and tier status.
              </p>
              <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">Your Points</div>
                  <div className="text-5xl font-bold text-yellow-400 mb-3">1,000 pts</div>
                  <div className="text-gray-300">
                    Rank: <span className="text-blue-400 font-semibold">#4,523 globally</span>
                  </div>
                  <div className="text-gray-300 mt-1">
                    Tier: <span className="text-orange-400 font-semibold">🥉 Bronze</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How to Earn Points Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🟠</span>
              How to Earn Points
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Multiple ways to accumulate points and climb the rankings. Every action counts toward your total.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-green-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Create Token</div>
                    <div className="text-sm text-gray-400">Launch your own battle token</div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">+500</div>
                </div>
                <div className="bg-black/30 border border-blue-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Buy Token</div>
                    <div className="text-sm text-gray-400">Purchase any battle token</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">+700</div>
                </div>
                <div className="bg-black/30 border border-yellow-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Qualify Token</div>
                    <div className="text-sm text-gray-400">Reach qualification threshold</div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">+1,000</div>
                </div>
                <div className="bg-black/30 border border-purple-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Win Battle</div>
                    <div className="text-sm text-gray-400">Victory in token duel</div>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">+10,000</div>
                </div>
                <div className="bg-black/30 border border-orange-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Share Battle</div>
                    <div className="text-sm text-gray-400">Share ongoing battle</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">+500</div>
                </div>
                <div className="bg-black/30 border border-pink-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Share Win</div>
                    <div className="text-sm text-gray-400">Share your victory</div>
                  </div>
                  <div className="text-2xl font-bold text-pink-400">+2,000</div>
                </div>
                <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">Referral Joins</div>
                    <div className="text-sm text-gray-400">Friend signs up with your link</div>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">+5,000</div>
                </div>
                <div className="bg-black/30 border border-lime-500/20 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">New Follower</div>
                    <div className="text-sm text-gray-400">Someone follows you</div>
                  </div>
                  <div className="text-2xl font-bold text-lime-400">+25</div>
                </div>
                <div className="bg-black/30 border border-amber-500/20 rounded-lg p-4 flex justify-between items-center md:col-span-2">
                  <div>
                    <div className="font-semibold text-white">Daily Login</div>
                    <div className="text-sm text-gray-400">Log in every day for bonus points</div>
                  </div>
                  <div className="text-2xl font-bold text-amber-400">+25</div>
                </div>
              </div>
            </div>
          </section>

          {/* What Are Points For Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">❓</span>
              What Are Points For?
            </h2>
            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🪂</div>
                <h3 className="text-2xl font-bold mb-3 text-yellow-400">Future $BONKBATTLECOIN Airdrop</h3>
              </div>
              <p className="text-gray-200 text-lg mb-4 text-center max-w-2xl mx-auto">
                Points are currently for <strong className="text-yellow-400">informational purposes</strong>. They represent your future share of the <strong className="text-yellow-400">$BONKBATTLECOIN token airdrop</strong>.
              </p>
              <div className="bg-black/40 border border-yellow-500/20 rounded-lg p-6 max-w-xl mx-auto">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Airdrop Distribution</div>
                  <div className="text-xl text-white font-semibold">Proportional to Points Accumulated</div>
                  <div className="text-sm text-gray-400 mt-3">More points = Larger airdrop allocation</div>
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard Preview Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              Global Leaderboard
            </h2>
            <div className="bg-bonk-card border border-white/10 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                Compete with traders worldwide. The leaderboard shows top performers, their tier badges, and battle victories.
              </p>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-yellow-400">#1</div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        whale.sol <span className="text-xl">👑</span>
                      </div>
                      <div className="text-sm text-gray-400">Diamond • 14 wins</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-yellow-400">325,450 pts</div>
                </div>
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-blue-400">#2</div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        crypto_king <span className="text-xl">💎</span>
                      </div>
                      <div className="text-sm text-gray-400">Diamond • 12 wins</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-blue-400">289,230 pts</div>
                </div>
                <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-amber-400">#3</div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        degen420 <span className="text-xl">🥇</span>
                      </div>
                      <div className="text-sm text-gray-400">Gold • 8 wins</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-amber-400">167,890 pts</div>
                </div>
                <div className="text-center py-2 text-gray-500">...</div>
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-500/40 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-400">#47</div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        YOU <span className="text-xl">🥈</span>
                      </div>
                      <div className="text-sm text-gray-400">Silver • 2 wins</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-300">15,450 pts</div>
                </div>
              </div>
              <div className="mt-6 flex gap-4 justify-center">
                <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  View Top 100
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  My Friends
                </button>
              </div>
            </div>
          </section>

          {/* Why It Works Section */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">💡</span>
              Why This System Works
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="text-xl font-semibold mb-2 text-green-400">Clear Progression</h3>
                <p className="text-gray-300">
                  Tier system (Bronze → Silver → Gold → Diamond → Legend) gives visible status and achievement milestones.
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">🔥</div>
                <h3 className="text-xl font-semibold mb-2 text-orange-400">Competitive Drive</h3>
                <p className="text-gray-300">
                  See your rank (#47) and want to reach top 10. Rankings create healthy competition and engagement.
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">💎</div>
                <h3 className="text-xl font-semibold mb-2 text-purple-400">Status Symbol</h3>
                <p className="text-gray-300">
                  Diamond badge = instant flex. Higher tiers signal expertise and dedication to the community.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-xl font-semibold mb-2 text-blue-400">Sunk Cost Effect</h3>
                <p className="text-gray-300">
                  With 50K points accumulated, you can't stop now. Investment of time creates long-term commitment.
                </p>
              </div>
            </div>
          </section>

          {/* Coming Soon Notice */}
          <div className="mt-12 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/40 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-3">Feature Coming Soon</h3>
            <p className="text-gray-300 text-lg">
              The Points System is currently in development. Stay tuned for the official launch and start earning your share of the future airdrop!
            </p>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
