import React from 'react';
import { StoriesTray } from './StoriesTray';
import { 
  Heart, MessageCircle, Share2, Bookmark, Radio, Play, 
  Sparkles, TrendingUp, Users, Music, Flame, ArrowRight 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const HomeFeed: React.FC = () => {
  const { 
    reels, 
    liveRooms, 
    openLiveRoom, 
    setActiveTab, 
    setActiveReelIndex, 
    toggleLikeReel, 
    toggleBookmarkReel,
    openCreateModal
  } = useApp();
  const { user } = useAuth();

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24 select-none">
      {/* Stories Tray */}
      <StoriesTray />

      <div className="px-4 space-y-4">
        {/* Live Rooms Quick Carousel / Pulse Radar */}
        {liveRooms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">Live Now on Pulse</span>
              </div>
              <button
                onClick={() => setActiveTab('live')}
                className="text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {liveRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => openLiveRoom(room)}
                  className="relative w-44 shrink-0 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-fuchsia-500/60 transition-all cursor-pointer group shadow-lg shadow-slate-950/50"
                >
                  <img
                    src={room.previewUrl}
                    alt={room.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent pointer-events-none" />

                  {/* LIVE Tag */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                    LIVE
                  </div>

                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[11px] font-bold text-white truncate group-hover:text-fuchsia-300 transition-colors">
                      {room.title}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-300 mt-0.5">
                      <span>@{room.host.username}</span>
                      <span>•</span>
                      <span className="text-fuchsia-400 font-semibold">{room.viewerCount} watching</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reels Feed Stream */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white tracking-wide">Trending Reels</span>
            </div>
            <button
              onClick={() => {
                setActiveTab('reels');
                setActiveReelIndex(0);
              }}
              className="text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-0.5"
            >
              <span>Immersive View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {reels.map((reel, idx) => (
            <div
              key={`${reel.id}-${idx}`}
              className="rounded-3xl bg-slate-900/90 border border-slate-800/90 overflow-hidden shadow-xl shadow-slate-950/40"
            >
              {/* Creator Header */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={reel.user.avatar}
                    alt={reel.user.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-white">@{reel.user.username}</span>
                      {reel.user.verified && (
                        <span className="text-[9px] text-fuchsia-400 font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{reel.audioTrack.title}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('reels');
                    setActiveReelIndex(idx);
                  }}
                  className="text-xs font-semibold text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 px-3 py-1 rounded-full transition-colors"
                >
                  Watch Reel
                </button>
              </div>

              {/* Reel Video Thumbnail with Play Overlay */}
              <div
                onClick={() => {
                  setActiveTab('reels');
                  setActiveReelIndex(idx);
                }}
                className="relative aspect-[4/5] sm:aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer group"
              >
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.caption}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-slate-950/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-1" />
                  </div>
                </div>

                {/* View count pill */}
                <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-semibold border border-white/10 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-white" />
                  <span>{(reel.viewsCount / 1000).toFixed(0)}k views</span>
                </div>
              </div>

              {/* Action Buttons & Caption */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleLikeReel(reel.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        reel.isLiked ? 'text-fuchsia-400' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${reel.isLiked ? 'fill-fuchsia-500 stroke-fuchsia-500' : ''}`} />
                      <span>{(reel.likesCount / 1000).toFixed(1)}k</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('reels');
                        setActiveReelIndex(idx);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{reel.commentsCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                      }}
                      title="Share Reel link"
                      className="text-slate-300 hover:text-white transition-colors active:scale-90"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleBookmarkReel(reel.id)}
                    className={`transition-colors ${reel.isBookmarked ? 'text-amber-400' : 'text-slate-300 hover:text-white'}`}
                  >
                    <Bookmark className={`w-5 h-5 ${reel.isBookmarked ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  <span className="font-bold text-white mr-1.5">@{reel.user.username}</span>
                  {reel.caption}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {reel.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
