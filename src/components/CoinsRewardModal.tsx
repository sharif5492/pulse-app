import React, { useState } from 'react';
import { 
  Coins, Sparkles, Gift, Flame, Play, Radio, Calendar, CheckCircle2, 
  ArrowRight, X, ChevronRight, Zap, Trophy, ShieldCheck, QrCode,
  Wallet, ArrowDownLeft, ArrowUpRight, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { audioUtils } from '../lib/audioUtils';
import confetti from 'canvas-confetti';

interface CoinsRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STREAK_DAYS = [
  { day: 1, reward: 50, label: 'Day 1' },
  { day: 2, reward: 100, label: 'Day 2' },
  { day: 3, reward: 150, label: 'Day 3' },
  { day: 4, reward: 200, label: 'Day 4' },
  { day: 5, reward: 300, label: 'Day 5' },
  { day: 6, reward: 450, label: 'Day 6' },
  { day: 7, reward: 1000, label: 'Day 7 👑' },
];

export const CoinsRewardModal: React.FC<CoinsRewardModalProps> = ({ isOpen, onClose }) => {
  const { 
    pulseCoins, 
    addCoins, 
    checkinStreak, 
    hasCheckedInToday, 
    claimDailyCheckIn,
    isSignupBonusClaimed,
    claimSignupBonus 
  } = useAuth();
  
  const { setActiveTab, openUserSearchModal, openPaymentWallet } = useApp();
  const [activeTab, setActiveInternalTab] = useState<'rewards' | 'rules'>('rewards');

  if (!isOpen) return null;

  const handleClaimCheckIn = () => {
    const res = claimDailyCheckIn();
    if (res.success) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#eab308', '#f59e0b', '#fbbf24', '#ffffff'],
        });
      } catch (e) {}
    }
  };

  const handleClaimWelcome = () => {
    const ok = claimSignupBonus();
    if (ok) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#ec4899', '#8b5cf6', '#eab308'],
        });
      } catch (e) {}
    }
  };

  const handleQuickBoost = () => {
    addCoins(500, '🚀 Instant Traffic Refill: +500 Coins!');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#eab308', '#38bdf8', '#a855f7'],
      });
    } catch (e) {}
  };

  const handleNavigateTo = (tab: 'reels' | 'live' | 'barcode') => {
    audioUtils.playPop();
    onClose();
    if (tab === 'barcode') {
      openUserSearchModal();
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[92vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Amber Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 blur-[80px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Coins className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                <span>Pulse Coins & Rewards</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  Earn & Gift
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Videos dekh kar aur daily check-in se coins kamao, live stream me gifts bhejo!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioUtils.playPop();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* Main Wallet Balance Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-950 to-slate-900 border border-amber-500/40 p-4 sm:p-5 overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Coins className="w-28 h-28 text-amber-300" />
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-xs font-semibold text-amber-200/80 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Your Total Balance
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {pulseCoins.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-amber-400">🪙 Coins</span>
                </div>
              </div>

              {/* Instant Free Boost Button */}
              <button
                onClick={handleQuickBoost}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                title="Tap for instant free promotional coins"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>+500 Free Refill</span>
              </button>
            </div>

            {/* Quick explanation pill */}
            <div className="mt-3.5 pt-3 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-200/90 font-medium">
              <span>🎁 Engagement Currency</span>
              <span>1,000 Coins = Rs. 280 / $1.00</span>
            </div>
          </div>

          {/* Payment Wallet Action Card (Deposit & Cashout) */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-amber-950/30 border border-slate-700/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-sm">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>Payment Wallet & Cashout</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Upcoming Update
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    JazzCash • Easypaisa • PayPal • Skrill
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  onClose();
                  openPaymentWallet('purchase');
                }}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-200" />
                <span>Buy Coins (Upcoming)</span>
              </button>

              <button
                onClick={() => {
                  audioUtils.playPop();
                  onClose();
                  openPaymentWallet('withdraw');
                }}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
                <span>Withdraw (Upcoming)</span>
              </button>
            </div>

            {/* Notice directly underneath payment method options as requested */}
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>upcoming update purchase and withdrawal</span>
            </div>
          </div>

          {/* Daily 7-Day Check-in Streak Section */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Daily Check-In Streak</h3>
              </div>
              <span className="text-[11px] font-semibold text-fuchsia-300 bg-fuchsia-950/60 border border-fuchsia-800/40 px-2 py-0.5 rounded-full">
                Streak: {checkinStreak} {checkinStreak === 1 ? 'Day' : 'Days'} 🔥
              </span>
            </div>

            {/* 7 Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
              {STREAK_DAYS.map((item) => {
                const isCompleted = item.day < checkinStreak || (item.day === checkinStreak && hasCheckedInToday);
                const isCurrent = item.day === checkinStreak && !hasCheckedInToday;

                return (
                  <div
                    key={item.day}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl text-center border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20 scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{item.label}</span>
                    <div className="my-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-base">🪙</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black">+{item.reward}</span>
                  </div>
                );
              })}
            </div>

            {/* Check-in CTA Button */}
            <div className="mt-3">
              {hasCheckedInToday ? (
                <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Aaj ka reward claim ho chuka hai! Kal wapas aao 🌟</span>
                </div>
              ) : (
                <button
                  onClick={handleClaimCheckIn}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Claim Day {checkinStreak} Reward (+{STREAK_DAYS[checkinStreak - 1]?.reward || 100} Coins)</span>
                </button>
              )}
            </div>
          </div>

          {/* Earn Coins Quests / Tasks Section */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Coins Kaise Kamayein? (Traffic & Rewards Tasks)</span>
            </h3>

            {/* Task 1: Welcome Sign up Bonus */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">Sign Up Welcome Gift</span>
                    <span className="text-[10px] font-bold text-pink-400 bg-pink-950/60 px-2 py-0.2 rounded-full">
                      +500 Coins
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Account banate hi instant welcome bonus</p>
                </div>
              </div>

              {isSignupBonusClaimed ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Claimed
                </span>
              ) : (
                <button
                  onClick={handleClaimWelcome}
                  className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-colors"
                >
                  Claim
                </button>
              )}
            </div>

            {/* Task 2: Watch Reels Video */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                  🎬
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">Watch Reels Videos</span>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.2 rounded-full">
                      +10 Coins / Reel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Har 15 seconds video dekhne par coins milein ge</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigateTo('reels')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                <span>Watch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Task 3: Watch Live Stream */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-xl">
                  🔴
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">Watch Live Streams</span>
                    <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-950/60 px-2 py-0.2 rounded-full">
                      +25 Coins / 45s
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Live stream dekhein aur chest drop collect karein</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigateTo('live')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold transition-colors"
              >
                <span>Live</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Task 4: Add / Invite Friends by Barcode */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
                  🤝
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">Add Friends by Barcode</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.2 rounded-full">
                      +100 Coins
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Barcode scan kar k dost banayein aur traffic barhayein</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigateTo('barcode')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan</span>
              </button>
            </div>
          </div>

          {/* Information Card on Virtual Gifts in Live Streaming */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-fuchsia-950/40 border border-indigo-500/30 flex items-start gap-3">
            <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <span className="font-bold text-white">Live Stream Gifts Me Coins Cut Honge:</span>{' '}
              Jab aap live room me Rose (10 🪙), Crown (150 🪙), Diamond (300 🪙), ya Cosmic Pulse (1,000 🪙) send karte hain to aapke wallet se coins cut ho jate hain aur host ko reward milta hai!
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pulse Traffic Engagement Engine Active</span>
          </div>
          <button
            onClick={() => {
              audioUtils.playPop();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
