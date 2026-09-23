import React, { useState } from 'react';
import { Radio, Users, Sparkles, Flame, Music, Palette, Gamepad2, MessageSquare, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LiveRoom } from '../types';

export const LiveRoomsView: React.FC = () => {
  const { liveRooms, openLiveRoom, openCreateModal } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Music', 'Creative', 'Trending', 'Chat', 'Gaming'];

  const filteredRooms = selectedCategory === 'All'
    ? liveRooms
    : liveRooms.filter((r) => r.category === selectedCategory);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-5 pb-24">
      {/* Live Hub Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-fuchsia-950/90 via-indigo-950/60 to-slate-900 border border-fuchsia-500/30 p-5 overflow-hidden shadow-2xl shadow-fuchsia-950/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[11px] font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
              <span>PULSE LIVE SPACES</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Interactive Live Broadcasting
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              Join real-time streams, chat with creators, send virtual gifts, and feel the pulse together.
            </p>
          </div>

          <button
            onClick={() => openCreateModal('live')}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold px-4.5 py-2.5 rounded-full shadow-lg shadow-fuchsia-600/30 hover:scale-105 transition-all shrink-0"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Go Live Now</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-600/30 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Live Streams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRooms.map((room, idx) => (
          <div
            key={`${room.id}-${idx}`}
            onClick={() => openLiveRoom(room)}
            className="group relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer hover:border-fuchsia-500/50 transition-all hover:shadow-xl hover:shadow-fuchsia-950/30 flex flex-col"
          >
            {/* Stream Video / Image Preview */}
            <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
              <img
                src={room.previewUrl}
                alt={room.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40 pointer-events-none" />

              {/* LIVE Tag & Viewer count */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
                <span className="bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                  <Users className="w-3 h-3 text-fuchsia-400" />
                  {room.viewerCount.toLocaleString()}
                </span>
              </div>

              {/* Category pill */}
              <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                {room.category}
              </div>
            </div>

            {/* Host & Title Info */}
            <div className="p-3.5 flex items-start gap-3 flex-1">
              <div className="relative">
                <img
                  src={room.host.avatar}
                  alt={room.host.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-fuchsia-500"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-white truncate group-hover:text-fuchsia-400 transition-colors">
                  {room.title}
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-300">@{room.host.username}</span>
                  {room.host.verified && (
                    <span className="text-fuchsia-400 font-bold text-[9px]">✓</span>
                  )}
                  <span>• Started {room.startedAt}</span>
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {room.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-semibold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
