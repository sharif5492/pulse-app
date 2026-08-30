import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Heart, Send, Gift, Users, Share2, Volume2, VolumeX, 
  Sparkles, Coins, Plus, Shield, MessageCircle, Radio 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LIVE_GIFTS } from '../mockData';
import { LiveGift } from '../types';

export const ActiveLiveRoom: React.FC = () => {
  const { 
    activeLiveRoom, 
    closeLiveRoom, 
    liveComments, 
    sendLiveComment, 
    sendLiveGift, 
    floatingHearts, 
    triggerLiveHeart 
  } = useApp();
  const { user, pulseCoins, addCoins } = useAuth();

  const [commentInput, setCommentInput] = useState('');
  const [giftsDrawerOpen, setGiftsDrawerOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [viewersCount, setViewersCount] = useState(activeLiveRoom ? activeLiveRoom.viewerCount : 1200);

  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll live comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveComments]);

  // Dynamic viewer counter pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setViewersCount((prev) => prev + Math.floor(Math.random() * 5) - 2);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!activeLiveRoom) return null;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    sendLiveComment(commentInput);
    setCommentInput('');
  };

  const handleGiftClick = (gift: LiveGift) => {
    const success = sendLiveGift(gift);
    if (!success) {
      alert(`You need ${gift.cost} Pulse Coins! Click '+' to recharge.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in select-none">
      <div className="relative w-full max-w-md h-full sm:h-[92vh] sm:max-h-[850px] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex flex-col justify-between">
        
        {/* Stream Visual Video / Background Feed */}
        <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          {activeLiveRoom.streamUrl ? (
            <video
              src={activeLiveRoom.streamUrl}
              autoPlay
              loop
              muted={isAudioMuted}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activeLiveRoom.previewUrl}
              alt="Live stream"
              className="w-full h-full object-cover scale-105 filter brightness-95"
            />
          )}

          {/* Stream Lighting Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/60 pointer-events-none" />
        </div>

        {/* Floating Heart Reactions Animation Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {floatingHearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute bottom-24 animate-[floatUp_2s_ease-out_forwards]"
              style={{
                left: `${heart.x}%`,
                color: heart.color,
              }}
            >
              <Heart
                style={{ width: heart.size, height: heart.size }}
                className="fill-current drop-shadow-lg"
              />
            </div>
          ))}
        </div>

        {/* Top Bar: Host Profile, Live Tag, Viewers & Close */}
        <div className="relative z-30 p-4 pt-5 flex items-center justify-between gap-2">
          {/* Host info pill */}
          <div className="flex items-center gap-2 bg-slate-950/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15 max-w-[210px]">
            <img
              src={activeLiveRoom.host.avatar}
              alt={activeLiveRoom.host.name}
              className="w-8 h-8 rounded-full object-cover border border-fuchsia-500 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate">
                  {activeLiveRoom.host.name}
                </span>
                {activeLiveRoom.host.verified && (
                  <span className="text-[10px] text-fuchsia-400 font-black">✓</span>
                )}
              </div>
              <span className="text-[10px] text-fuchsia-400 font-semibold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                {activeLiveRoom.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewers counter */}
            <div className="flex items-center gap-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{viewersCount.toLocaleString()}</span>
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md border border-white/10"
              title="Toggle Audio"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-fuchsia-400" />}
            </button>

            {/* Close Room */}
            <button
              onClick={closeLiveRoom}
              className="p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md border border-white/10"
              aria-label="Exit Live Room"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mid-screen Live Broadcast Title */}
        <div className="relative z-20 px-4">
          <div className="inline-block bg-slate-950/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white/95 max-w-[85%] truncate">
            {activeLiveRoom.title}
          </div>
        </div>

        {/* Bottom Section: Live Chat Feed & Interaction Controls */}
        <div className="relative z-30 p-4 space-y-3">
          {/* Real-time Comments Ticker Window */}
          <div className="h-44 overflow-y-auto space-y-2 pr-2 no-scrollbar mask-gradient">
            {liveComments.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 p-1.5 rounded-xl text-xs backdrop-blur-md max-w-[90%] animate-in fade-in slide-in-from-bottom-2 ${
                  msg.isGift
                    ? 'bg-gradient-to-r from-fuchsia-500/20 via-indigo-500/20 to-pink-500/20 border border-fuchsia-500/40 text-fuchsia-300'
                    : 'bg-slate-950/60 text-slate-200'
                }`}
              >
                <img
                  src={msg.user.avatar}
                  alt={msg.user.name}
                  className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="leading-tight">
                  <span className="font-bold text-fuchsia-400 mr-1.5">
                    {msg.user.username}:
                  </span>
                  <span className={msg.isGift ? 'font-semibold text-white' : 'text-slate-200'}>
                    {msg.text}
                  </span>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Action Row: Send Comment, Gift, Heart Trigger */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-1.5">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Say something live..."
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-full px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-fuchsia-500 backdrop-blur-md"
              />
              {commentInput.trim() && (
                <button
                  type="submit"
                  className="p-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 rounded-full text-white shrink-0 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Gift Button */}
            <button
              onClick={() => setGiftsDrawerOpen(!giftsDrawerOpen)}
              className="p-2.5 rounded-full bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-pink-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
              title="Send Gift"
            >
              <Gift className="w-4 h-4" />
            </button>

            {/* Heart Reaction Trigger */}
            <button
              onClick={triggerLiveHeart}
              className="p-2.5 rounded-full bg-fuchsia-500/25 hover:bg-fuchsia-500/45 border border-fuchsia-500 text-fuchsia-400 hover:text-white backdrop-blur-md hover:scale-110 active:scale-90 transition-transform"
              title="Send Heart"
            >
              <Heart className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Gifts Selection Drawer Modal */}
        {giftsDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 border-t border-slate-800 rounded-t-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold text-white">Send Virtual Gift</span>
              </div>

              {/* Coin Balance with Recharge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{pulseCoins}</span>
                </div>
                <button
                  onClick={() => addCoins(500)}
                  className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold px-2 py-0.5 border border-slate-700"
                  title="Claim +500 free demo coins"
                >
                  +500 Coins
                </button>
                <button
                  onClick={() => setGiftsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-3">
              {LIVE_GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleGiftClick(gift)}
                  className="flex flex-col items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">
                    {gift.icon}
                  </span>
                  <span className="text-[11px] font-bold text-white mt-1">{gift.name}</span>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 mt-0.5">
                    <Coins className="w-3 h-3" />
                    <span>{gift.cost}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
