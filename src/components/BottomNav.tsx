import React from 'react';
import { Home, Film, Plus, Radio, MessageCircle, User as UserIcon, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { audioUtils } from '../lib/audioUtils';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openCreateModal, unreadDMsCount } = useApp();
  const { user } = useAuth();

  const handleTabClick = (tab: any) => {
    audioUtils.playPop();
    setActiveTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-xl border-t border-slate-850 px-2 py-1.5 sm:py-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Home Feed */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center w-12 py-1 rounded-xl transition-all ${
            activeTab === 'home'
              ? 'text-fuchsia-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Home"
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        {/* Reels */}
        <button
          onClick={() => handleTabClick('reels')}
          className={`flex flex-col items-center justify-center w-12 py-1 rounded-xl transition-all ${
            activeTab === 'reels'
              ? 'text-fuchsia-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Reels"
        >
          <Film className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold mt-0.5">Reels</span>
        </button>

        {/* Center Camera & Create Button */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveTab('camera');
          }}
          className="w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-fuchsia-600/40 hover:scale-110 active:scale-95 transition-transform ring-4 ring-slate-950"
          aria-label="Open Camera Filters"
          title="Camera & Filters"
        >
          <Camera className="w-5 h-5 stroke-[2.4]" />
        </button>

        {/* Live Rooms */}
        <button
          onClick={() => handleTabClick('live')}
          className={`flex flex-col items-center justify-center w-12 py-1 rounded-xl transition-all ${
            activeTab === 'live'
              ? 'text-fuchsia-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Live Rooms"
        >
          <Radio className="w-5 h-5 stroke-[2.2] animate-pulse" />
          <span className="text-[10px] font-semibold mt-0.5">Live</span>
        </button>

        {/* Direct Messages */}
        <button
          onClick={() => handleTabClick('dms')}
          className={`relative flex flex-col items-center justify-center w-12 py-1 rounded-xl transition-all ${
            activeTab === 'dms'
              ? 'text-fuchsia-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Direct Messages"
        >
          <MessageCircle className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold mt-0.5">DMs</span>
          {unreadDMsCount > 0 && (
            <span className="absolute top-0.5 right-2 bg-indigo-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950">
              {unreadDMsCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center w-12 py-1 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'text-fuchsia-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Profile"
        >
          {user ? (
            <div className={`w-5 h-5 rounded-full overflow-hidden border ${activeTab === 'profile' ? 'border-fuchsia-400 ring-1 ring-fuchsia-400' : 'border-slate-500'}`}>
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
          ) : (
            <UserIcon className="w-5 h-5 stroke-[2.2]" />
          )}
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
};
