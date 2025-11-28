'use client';

import { useState, useEffect } from 'react';
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
    followingCount,
    markFeedAsRead
  } = useFollowers();

  // Mark feed as read when user visits the feed tab
  useEffect(() => {
    if (activeTab === 'feed' && connected && feed.length > 0) {
      // Small delay to ensure user sees the content
      const timer = setTimeout(() => {
        markFeedAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, connected, feed.length, markFeedAsRead]);

  const renderActionText = (item: typeof feed[0]) => {
    switch (item.action_type) {
      case 'started_follow':
        const followedWallet = (item.metadata?.followed_short as string) ||
          (item.metadata?.followed_wallet as string)?.slice(0,4) + '...' + (item.metadata?.followed_wallet as string)?.slice(-4) ||
          'someone';
        return (
          <span>
            started following <span className="text-cyan-400 font-semibold">{followedWallet}</span>
          </span>
        );
      case 'create_token':
        return (
          <span>
            created <span className="text-orange-400 font-semibold">${item.token_symbol || 'token'}</span>
          </span>
        );
      case 'buy':
        return (
          <span>
            bought <span className="text-green-400 font-semibold">${item.token_symbol || 'token'}</span>
          </span>
        );
      case 'sell':
        return (
          <span>
            sold <span className="text-red-400 font-semibold">${item.token_symbol || 'token'}</span>
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
            {item.opponent_symbol && (
              <>
                {' vs '}
                <span className="text-orange-400 font-semibold">${item.opponent_symbol}</span>
              </>
            )}
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
                  {feed.map((item) => {
                    // Special layout for started_follow
                    if (item.action_type === 'started_follow') {
                      const followedWallet = (item.metadata?.followed_wallet as string) || '';
                      const followedShort = followedWallet.slice(0, 5);

                      return (
                        <div
                          key={item.id}
                          className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Follower photo + name */}
                            <img
                              src="/profilo.png"
                              alt={item.wallet.slice(0, 5)}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="font-semibold text-white">
                              {item.wallet.slice(0, 5)}
                            </span>

                            <span className="text-gray-400">started following</span>

                            {/* Followed photo + name */}
                            <img
                              src="/profilo.png"
                              alt={followedShort}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="font-semibold text-cyan-400">
                              {followedShort}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {item.created_at ? formatTimeAgo(item.created_at) : 'just now'}
                          </div>
                        </div>
                      );
                    }

                    // Default layout for other actions
                    return (
                      <div
                        key={item.id}
                        className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 flex items-center gap-4"
                      >
                        {/* User Profile Photo */}
                        <img
                          src="/profilo.png"
                          alt={item.wallet.slice(0, 5)}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">
                              {item.wallet.slice(0, 5)}
                            </span>
                            {renderActionText(item)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.created_at ? formatTimeAgo(item.created_at) : 'just now'}
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
                    );
                  })}
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
              ) : suggestedUsers.filter(u => !u.is_following).length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">*</div>
                  <div className="text-xl font-bold mb-2">No New Users</div>
                  <div className="text-gray-400">You&apos;re following everyone! Check back later for new users.</div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {suggestedUsers.filter(u => !u.is_following).map((user) => (
                      <div
                        key={user.wallet}
                        className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-3 flex items-center justify-between"
                      >
                        {/* Left: Photo + Name (4 chars) */}
                        <div className="flex items-center gap-3">
                          <img
                            src="/profilo.png"
                            alt={user.wallet.slice(0, 4)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="font-semibold text-white">
                            {user.wallet.slice(0, 4)}
                          </span>
                        </div>

                        {/* Right: Follow button (dark blue bg, white text) */}
                        <button
                          onClick={() => followUser(user.wallet)}
                          className="px-5 py-2 rounded-lg font-semibold transition-all bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white"
                        >
                          Follow
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
