// app/src/app/armies/[id]/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useArmy, useArmyOrders, usePostOrder } from '@/hooks/useArmies';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';

// Genera ticker automatico
const getTicker = (name: string) => {
  return name.replace(/\s/g, '').substring(0, 5).toUpperCase();
};

// Formatta tempo relativo
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
};

// Formatta wallet address
const formatWallet = (wallet: string) => {
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

type TabType = 'orders' | 'comments';

export default function ArmyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const armyId = params.id as string;
  const { data: army, isLoading: armyLoading, error: armyError } = useArmy(armyId);
  const { data: orders, isLoading: ordersLoading } = useArmyOrders(armyId);
  const postOrder = usePostOrder();

  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isCommander = publicKey?.toString() === army?.capitano_wallet;

  const handleSendMessage = async () => {
    if (!message.trim() || !publicKey || !army) return;

    // Solo commander può postare in ORDERS
    if (activeTab === 'orders' && !isCommander) {
      return;
    }

    setIsSending(true);
    try {
      await postOrder.mutateAsync({
        armyId: army.id,
        capitano_wallet: publicKey.toString(),
        message: message.trim(),
      });
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Loading state
  if (armyLoading) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white">
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
        <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // Error state
  if (armyError || !army) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white">
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
        <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <span className="text-4xl">💀</span>
          <p className="text-white font-bold">Army not found</p>
          <button
            onClick={() => router.push('/armies')}
            className="text-green-400 hover:text-green-300"
          >
            ← Back to armies
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const ticker = army.ticker || getTicker(army.name);

  // Determina se l'utente può scrivere nel tab attivo
  const canWrite = activeTab === 'orders' ? isCommander : !!publicKey;
  const inputPlaceholder = activeTab === 'orders'
    ? (isCommander ? "Post an order..." : "Only commander can post")
    : "Post your reply...";

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Tickers - Mobile only */}
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
        <div className="max-w-3xl mx-auto">

          {/* ARMY HEADER */}
          <div className="sticky top-[140px] lg:top-[65px] z-30 border-b border-white/10 backdrop-blur-md bg-bonk-dark/80">
            {/* Back Button - Absolute positioned */}
            <button
              onClick={() => router.back()}
              className="absolute left-4 top-4 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Members Icon - Absolute positioned */}
            <button className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            {/* Centered Army Info */}
            <div className="flex flex-col items-center py-4 px-16">
              {/* Square Photo - Bigger */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-2">
                {army.image_url ? (
                  <Image
                    src={army.image_url}
                    alt={army.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{army.icon || '⚔️'}</span>
                )}
              </div>
              {/* Name + Level */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-xl">{army.name}</span>
                <span className="text-yellow-400 text-lg font-bold">Level {army.level || 1}</span>
              </div>
              {/* Members below */}
              <div className="text-gray-400 text-sm mt-1">
                {army.member_count} members
              </div>
            </div>

            {/* TABS */}
            <div className="flex">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'orders'
                    ? 'text-yellow-400'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                Orders
                {activeTab === 'orders' && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-yellow-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'comments'
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                Comments
                {activeTab === 'comments' && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-400 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* PROMOTED TOKEN CARD (if exists) */}
          {army.promoted_token_mint && (
            <Link href={`/token/${army.promoted_token_mint}`}>
              <div className="mx-4 mt-4 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors" style={{ backgroundColor: '#16181c' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500" />
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">🪙 Active Token</div>
                    <div className="text-gray-500 text-xs">Tap to view battle</div>
                  </div>
                  <div className="text-green-400 font-bold text-sm">LIVE →</div>
                </div>
              </div>
            </Link>
          )}

          {/* CONTENT AREA */}
          <div className="min-h-[400px]">

            {activeTab === 'orders' ? (
              /* ORDERS TAB */
              <div>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                  </div>
                ) : orders && orders.length > 0 ? (
                  <div>
                    {orders.map((order) => {
                      const isOrderFromCommander = order.capitano_wallet === army.capitano_wallet;

                      // Solo ordini del commander in questo tab
                      if (!isOrderFromCommander) {
                        // Mostra come "joined" event
                        return (
                          <div key={order.id} className="flex justify-center py-3 border-b border-white/5">
                            <span className="text-gray-500 text-sm">
                              {formatWallet(order.capitano_wallet)} joined 🔄
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={order.id} className="px-4 py-3 border-b border-white/10 hover:bg-white/[0.02] transition-colors">
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                              {army.image_url ? (
                                <Image
                                  src={army.image_url}
                                  alt={army.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                  <span>👑</span>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-white">Commander</span>
                                <span className="text-green-500">✓</span>
                                <span className="text-gray-500">·</span>
                                <span className="text-gray-500 text-sm">
                                  {formatTimeAgo(order.created_at)}
                                </span>
                              </div>
                              <p className="text-white mt-1 break-words">{order.message}</p>

                              {/* Token Link if exists */}
                              {order.token_mint && (
                                <Link href={`/token/${order.token_mint}`}>
                                  <div className="mt-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500" />
                                      <div>
                                        <div className="text-white text-sm font-bold">View Token</div>
                                        <div className="text-gray-500 text-xs">Tap to trade</div>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <span className="text-5xl mb-4 block">📢</span>
                    <p className="text-gray-500 text-lg">No orders yet</p>
                    {isCommander && (
                      <p className="text-gray-600 text-sm mt-2">Post your first order below!</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* COMMENTS TAB */
              <div>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                  </div>
                ) : orders && orders.length > 0 ? (
                  <div>
                    {orders.map((order) => {
                      const isOrderFromCommander = order.capitano_wallet === army.capitano_wallet;

                      return (
                        <div key={order.id} className="px-4 py-3 border-b border-white/10 hover:bg-white/[0.02] transition-colors">
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden ${isOrderFromCommander
                                ? ''
                                : 'bg-gradient-to-br from-gray-600 to-gray-700'
                              }`}>
                              {isOrderFromCommander && army.image_url ? (
                                <Image
                                  src={army.image_url}
                                  alt={army.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                order.capitano_wallet.slice(0, 2).toUpperCase()
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-white">
                                  {isOrderFromCommander ? 'Commander' : formatWallet(order.capitano_wallet)}
                                </span>
                                {isOrderFromCommander && (
                                  <span className="text-green-500">✓</span>
                                )}
                                <span className="text-gray-500">·</span>
                                <span className="text-gray-500 text-sm">
                                  {formatTimeAgo(order.created_at)}
                                </span>
                              </div>
                              <p className="text-white mt-1 break-words">{order.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <span className="text-5xl mb-4 block">💬</span>
                    <p className="text-gray-500 text-lg">No comments yet</p>
                    <p className="text-gray-600 text-sm mt-2">Be the first to say GM!</p>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* MESSAGE INPUT */}
          <div className="sticky bottom-20 lg:bottom-0 border-t border-white/10 p-3 bg-bonk-dark">
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden ${isCommander && army.image_url
                  ? ''
                  : isCommander
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-br from-green-500 to-emerald-500'
                }`}>
                {isCommander && army.image_url ? (
                  <Image
                    src={army.image_url}
                    alt={army.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : publicKey ? (
                  publicKey.toString().slice(0, 2).toUpperCase()
                ) : (
                  '?'
                )}
              </div>

              {/* Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={inputPlaceholder}
                  disabled={!canWrite || isSending}
                  className="w-full bg-transparent border border-white/20 rounded-full px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 disabled:opacity-50 transition-colors text-sm"
                />
              </div>

              {/* Send Button - Only show if there's text */}
              {message.trim() && (
                <button
                  onClick={handleSendMessage}
                  disabled={!canWrite || isSending}
                  className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 flex items-center justify-center text-black transition-colors"
                >
                  {isSending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
