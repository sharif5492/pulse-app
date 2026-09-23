import React, { useEffect } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CoinRewardBanner: React.FC = () => {
  const { latestCoinReward, clearLatestCoinReward } = useAuth();

  useEffect(() => {
    if (!latestCoinReward) return;
    const timer = setTimeout(() => {
      clearLatestCoinReward();
    }, 3200);
    return () => clearTimeout(timer);
  }, [latestCoinReward, clearLatestCoinReward]);

  if (!latestCoinReward) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/95 border border-amber-400/80 shadow-xl shadow-amber-500/25 backdrop-blur-md">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center animate-bounce shadow-sm">
          <Coins className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className="text-amber-300 text-sm tracking-tight">
            +{latestCoinReward.amount} 🪙
          </span>
          <span className="text-slate-200 font-medium text-[11px] truncate max-w-[170px]">
            {latestCoinReward.reason}
          </span>
        </div>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      </div>
    </div>
  );
};
