import React from 'react';
import { X, Radio, Heart, MessageCircle, Gift, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotificationToast: React.FC = () => {
  const { activeToast, dismissToast, openLiveRoom, liveRooms, setActiveTab } = useApp();

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.type === 'live') {
      if (liveRooms.length > 0) {
        openLiveRoom(liveRooms[0]);
      } else {
        setActiveTab('live');
      }
    } else if (activeToast.type === 'message') {
      setActiveTab('dms');
    }
    dismissToast();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top-4 duration-300">
      <div 
        onClick={handleClick}
        className="bg-neutral-900/95 border border-rose-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 cursor-pointer hover:border-rose-500 transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
            {activeToast.type === 'live' ? (
              <Radio className="w-4 h-4 animate-pulse" />
            ) : activeToast.type === 'gift' ? (
              <Gift className="w-4 h-4" />
            ) : (
              <Heart className="w-4 h-4 fill-white" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate">
              {activeToast.title}
            </h4>
            <p className="text-[11px] text-neutral-300 truncate">{activeToast.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-1 transition-transform" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="p-1 text-neutral-400 hover:text-white rounded-md"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
