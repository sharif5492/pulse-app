import React from 'react';
import { Activity, Bell, MessageCircle, Radio, Sparkles, Smartphone, Monitor, Camera, Settings, UserPlus, QrCode, Coins, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { audioUtils } from '../lib/audioUtils';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    unreadNotifsCount, 
    unreadDMsCount, 
    isMobilePreviewFrame,
    toggleMobilePreviewFrame,
    openUserSearchModal,
    openCoinsRewardModal,
    openPaymentWallet,
    connections,
  } = useApp();
  const { user, isSupabaseConfigured, openAuthModal, pulseCoins } = useAuth();

  const incomingRequestsCount = connections.filter(
    (c) => c.status === 'pending' && (c.receiverId === user?.id || c.receiver?.id === user?.id || c.receiverId === 'usr_current')
  ).length;

  // Hide top header when inside dedicated full-screen camera, reels or live rooms
  if (activeTab === 'camera') {
    return null;
  }

  if (activeTab === 'reels') {
    return (
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent select-none">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('home');
            }}
            className="flex items-center gap-1.5 font-bold tracking-tight text-white text-lg"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
            </span>
            <span className="font-black tracking-wider bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent italic">
              PULSE
            </span>
          </button>
          <div className="flex items-center gap-1 ml-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-200 border border-white/10">
            <span className="text-white font-semibold">Reels</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Coin Wallet Button in Reels */}
          <button
            onClick={() => {
              audioUtils.playPop();
              openPaymentWallet('purchase');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 transition-all text-xs font-black backdrop-blur-md shadow-sm"
            title="Wallet: Buy Coins & Cashout (JazzCash, Easypaisa, PayPal, Skrill)"
          >
            <Coins className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{pulseCoins.toLocaleString()}</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-bold">+</span>
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('camera');
            }}
            className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
            title="Camera & Filters"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              openUserSearchModal();
            }}
            className="relative p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors backdrop-blur-md flex items-center gap-1"
            title="Add Friends & Quick Add"
          >
            <UserPlus className="w-4 h-4 text-fuchsia-300" />
            {incomingRequestsCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {incomingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('live');
            }}
            className="flex items-center gap-1.5 bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md hover:bg-fuchsia-500/30 transition-colors"
            title="Explore Live Rooms"
          >
            <Radio className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span>LIVE</span>
          </button>
          
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('dms');
            }}
            className="relative p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
            aria-label="Direct Messages"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadDMsCount > 0 && (
              <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                {unreadDMsCount}
              </span>
            )}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/85 backdrop-blur-xl border-b border-slate-850/80 select-none">
      <div className="flex items-center gap-2.5">
        <button 
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('home');
          }}
          className="flex items-center gap-2.5 focus:outline-none group text-left"
        >
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black tracking-wider text-xl bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent italic">
              PULSE
            </span>
          </div>
        </button>

        {isSupabaseConfigured ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Supabase Active
          </span>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-fuchsia-300 bg-fuchsia-950/50 border border-fuchsia-800/40 px-2 py-0.5 rounded-full hover:bg-fuchsia-900/50 transition-colors"
          >
            <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
            Supabase Auth
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Pulse Coins Wallet Pill */}
        <button
          onClick={() => {
            audioUtils.playPop();
            openCoinsRewardModal();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all text-xs font-black shadow-sm group"
          title="Pulse Coins Wallet & Rewards Hub"
          aria-label="Coins Wallet"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] sm:text-xs font-black tracking-tight">{pulseCoins.toLocaleString()}</span>
        </button>

        {/* Instant Deposit & Cashout Wallet Button */}
        <button
          onClick={() => {
            audioUtils.playPop();
            openPaymentWallet('purchase');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-black shadow-sm"
          title="Payment Wallet: Deposit & Cashout (JazzCash, Easypaisa, PayPal, Skrill)"
          aria-label="Payment Wallet"
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold hidden xs:inline">Wallet</span>
        </button>

        {/* Find & Add Friends by ID / Barcode */}
        <button
          onClick={() => {
            audioUtils.playPop();
            openUserSearchModal();
          }}
          className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-fuchsia-600/25 to-indigo-600/25 border border-fuchsia-500/40 text-fuchsia-300 hover:text-white hover:bg-fuchsia-600/35 transition-all text-xs font-semibold shadow-sm"
          title="Add Friends (WhatsApp & Snapchat Style)"
          aria-label="Find and Add Friends"
        >
          <UserPlus className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-[11px] font-bold">Add Friends</span>
          {incomingRequestsCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-sm">
              {incomingRequestsCount}
            </span>
          )}
        </button>

        {/* Camera Shortcut */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('camera');
          }}
          className={`p-2 rounded-full transition-colors ${
            activeTab === 'camera'
              ? 'bg-fuchsia-500/20 text-fuchsia-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
          title="Camera & Filters"
          aria-label="Camera"
        >
          <Camera className="w-4.5 h-4.5" />
        </button>

        {/* Live Broadcast shortcut */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('live');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
            activeTab === 'live'
              ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-lg shadow-fuchsia-600/30'
              : 'bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/20'
          }`}
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>LIVE</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('notifications');
          }}
          className={`relative p-2 rounded-full transition-colors ${
            activeTab === 'notifications'
              ? 'bg-fuchsia-500/20 text-fuchsia-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1 right-1 bg-fuchsia-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse">
              {unreadNotifsCount}
            </span>
          )}
        </button>

        {/* Direct Messages */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('dms');
          }}
          className={`relative p-2 rounded-full transition-colors ${
            activeTab === 'dms'
              ? 'bg-fuchsia-500/20 text-fuchsia-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
          aria-label="Direct Messages"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          {unreadDMsCount > 0 && (
            <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-950">
              {unreadDMsCount}
            </span>
          )}
        </button>

        {/* User avatar or Auth trigger */}
        {user ? (
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTab('profile');
            }}
            className="w-7.5 h-7.5 rounded-full overflow-hidden border-2 border-fuchsia-500/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 ml-0.5"
            title="Your Profile"
          >
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white px-3 py-1.5 rounded-full hover:brightness-110 shadow-md shadow-fuchsia-900/30 transition-all"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
