'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useFollowers, formatWallet, formatTimeAgo } from '@/hooks/useFollowers';

type Tab = 'feed' | 'add';

export default function FeedFollowersPage() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const {
    suggestedUsers,
    loadingSuggested,
    currentPage,
    totalPages,
    loadPage,
    feed,
    loadingFeed,
    followUser,
    unfollowUser,
    followersCount,
    followingCount
  } = useFollowers();

  const renderActionText = (item: typeof feed[0]) => {
    switch (item.action_type) {
      case 'create_token':
        return (
          <span>
            created <span className="text-orange-400 font-semibold">${item.token_symbol}</span>
          </span>
        );
      case 'buy':
        return (
          <span>
            bought <span className="text-green-400 font-semibold">${item.token_symbol}</span>
          </span>
        );
      case 'sell':
        return (
          <span>
            sold <span className="text-red-400 font-semibold">${item.token_symbol}</span>
          </span>
        );
      case 'qualify':
        return (
          <span>
            qualified <span className="text-yellow-400 font-semibold">${item.token_symbol}</span>
          </span>
        );
      case 'battle_start':
        return (
          <span>
            started battle: <span className="text-orange-400 font-semibold">${item.token_symbol}</span>
            {' vs '}
            <span className="text-orange-400 font-semibold">${item.opponent_symbol}</span>
          </span>
        );
      case 'battle_win':
        return (
          <span>
            <span className="text-yellow-400">WON</span> battle with{' '}
            <span className="text-green-400 font-semibold">${item.token_symbol}</span>
          </span>
        );
      default:
        return <span>{item.action_type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">

        <div className="max-w-[800px] mx-auto px-5 py-8">
          {/* Header with counts */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Social</h1>
            {connected && (
              <div className="flex gap-4 text-sm">
                <div className="text-gray-400">
                  <span className="text-white font-semibold">{followingCount}</span> Following
                </div>
                <div className="text-gray-400">
                  <span className="text-white font-semibold">{followersCount}</span> Followers
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === 'feed'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              News Feed
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === 'add'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              Add Followers
            </button>
          </div>

          {!connected ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">*</div>
              <div className="text-xl font-bold mb-2">Connect Wallet</div>
              <div className="text-gray-400">Connect your wallet to see your feed and follow traders</div>
            </div>
          ) : activeTab === 'feed' ? (
            /* NEWS FEED TAB */
            <div>
              {loadingFeed ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-4">*</div>
                  <p className="text-gray-400">Loading feed...</p>
                </div>
              ) : feed.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">*</div>
                  <div className="text-xl font-bold mb-2">No Activity Yet</div>
                  <div className="text-gray-400 mb-6">
                    Start following top players to see their activity!
                  </div>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    Find Traders to Follow
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {feed.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {item.wallet.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">
                            {formatWallet(item.wallet)}
                          </span>
                          {renderActionText(item)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(item.created_at)}
                        </div>
                      </div>

                      {item.token_image && (
                        <img
                          src={item.token_image}
                          alt={item.token_symbol || ''}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ADD FOLLOWERS TAB */
            <div>
              {loadingSuggested ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-4">*</div>
                  <p className="text-gray-400">Loading users...</p>
                </div>
              ) : suggestedUsers.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">*</div>
                  <div className="text-xl font-bold mb-2">No Users Found</div>
                  <div className="text-gray-400">Be the first to join BONK BATTLE!</div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {suggestedUsers.map((user) => (
                      <div
                        key={user.wallet}
                        className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.wallet.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="font-semibold text-white">
                              {user.username || formatWallet(user.wallet)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {user.followers_count} follower{user.followers_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => user.is_following ? unfollowUser(user.wallet) : followUser(user.wallet)}
                          className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                            user.is_following
                              ? 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
                        >
                          {user.is_following ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => loadPage(page)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                            page === currentPage
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#2a3544] hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
