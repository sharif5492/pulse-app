import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Heart, Send, Gift, Users, Share2, Volume2, VolumeX, 
  Sparkles, Coins, Plus, Shield, MessageCircle, Radio,
  Camera, CameraOff, Mic, MicOff, RefreshCw, Sliders, UserX,
  Eye, Settings, AlertTriangle, CheckCircle, Flame, Wallet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LIVE_GIFTS } from '../mockData';
import { LiveGift, User } from '../types';
import { zegoLiveEngine } from '../lib/zegoService';

export const ActiveLiveRoom: React.FC = () => {
  const { 
    activeLiveRoom, 
    closeLiveRoom, 
    liveComments, 
    sendLiveComment, 
    sendLiveGift, 
    floatingHearts, 
    triggerLiveHeart,
    blockUser,
    isUserBlocked,
    openCoinsRewardModal,
    openPaymentWallet,
  } = useApp();
  const { user, pulseCoins, addCoins } = useAuth();

  // Chat & Gifts
  const [commentInput, setCommentInput] = useState('');
  const [giftsDrawerOpen, setGiftsDrawerOpen] = useState(false);
  const [viewersCount, setViewersCount] = useState(activeLiveRoom ? activeLiveRoom.viewerCount : 1200);

  // Live Stream Watch-to-Earn Rewards
  const [streamDropSeconds, setStreamDropSeconds] = useState(40);
  const [showDropCelebration, setShowDropCelebration] = useState(false);
  const [insufficientCoinsGift, setInsufficientCoinsGift] = useState<LiveGift | null>(null);

  // Local Zego Video & Device Controls
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState<'none' | 'glow' | 'cyberpunk' | 'warm' | 'cool'>('none');

  // Stream Settings & Moderation Overlays
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [moderationTargetUser, setModerationTargetUser] = useState<User | null>(null);
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [kickedUserIds, setKickedUserIds] = useState<Set<string>>(new Set());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const videoContainerRef = useRef<HTMLVideoElement | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const isHost = Boolean(user && (activeLiveRoom?.host.id === user.id || activeLiveRoom?.id.startsWith('live_host_') || activeLiveRoom?.id.startsWith('live_usr_')));

  const streamDropSecondsRef = useRef(40);
  const addCoinsRef = useRef(addCoins);
  useEffect(() => {
    addCoinsRef.current = addCoins;
  }, [addCoins]);

  // Watch Live Stream Timer to award viewer drops (+25 coins every 40s)
  useEffect(() => {
    if (!activeLiveRoom) return;
    streamDropSecondsRef.current = 40;
    setStreamDropSeconds(40);

    const interval = setInterval(() => {
      if (streamDropSecondsRef.current <= 1) {
        streamDropSecondsRef.current = 40;
        setStreamDropSeconds(40);
        addCoinsRef.current(25, 'Live Stream Drop 🔴');
        setShowDropCelebration(true);
        setTimeout(() => setShowDropCelebration(false), 2500);
      } else {
        streamDropSecondsRef.current -= 1;
        setStreamDropSeconds(streamDropSecondsRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLiveRoom]);

  // Initialize ZegoExpressEngine Local Video View Container & turn camera on
  useEffect(() => {
    let mounted = true;

    const setupZegoStream = async () => {
      if (videoContainerRef.current) {
        try {
          await zegoLiveEngine.startLocalPreview(videoContainerRef.current, {
            camera: isCameraActive,
            microphone: isMicActive,
            facingMode: cameraFacing,
            beautyFilter: activeFilter,
          });

          // Explicitly turn camera on upon starting stream room
          zegoLiveEngine.turnCameraOn(true);
          setIsCameraActive(true);
        } catch (err) {
          console.warn('Zego local video mount notice:', err);
        }
      }
    };

    setupZegoStream();

    return () => {
      mounted = false;
      zegoLiveEngine.stopTracks();
    };
  }, [activeLiveRoom?.id]);

  // Auto-scroll live comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveComments]);

  // Dynamic viewer counter pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setViewersCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 5) - 2));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!activeLiveRoom) return null;

  // Toggle Camera
  const handleToggleCamera = () => {
    const nextState = !isCameraActive;
    setIsCameraActive(nextState);
    zegoLiveEngine.turnCameraOn(nextState);
    showFeedbackToast(nextState ? 'Camera turned ON' : 'Camera turned OFF');
  };

  // Toggle Mic
  const handleToggleMic = () => {
    const nextState = !isMicActive;
    setIsMicActive(nextState);
    zegoLiveEngine.turnMicrophoneOn(nextState);
    showFeedbackToast(nextState ? 'Microphone unmuted' : 'Microphone muted');
  };

  // Flip Camera
  const handleSwitchCamera = async () => {
    const newMode = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newMode);
    await zegoLiveEngine.switchCamera();
    showFeedbackToast(`Switched to ${newMode === 'user' ? 'Front' : 'Rear'} Camera`);
  };

  // Apply Beauty Filter
  const handleApplyFilter = (filter: 'none' | 'glow' | 'cyberpunk' | 'warm' | 'cool') => {
    setActiveFilter(filter);
    zegoLiveEngine.setBeautyFilter(filter);
    showFeedbackToast(`Filter applied: ${filter.toUpperCase()}`);
  };

  // Toast feedback helper
  const showFeedbackToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Chat message send handler
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    if (user && mutedUserIds.has(user.id)) {
      showFeedbackToast('You are muted in this live broadcast');
      return;
    }

    sendLiveComment(commentInput);
    setCommentInput('');
  };

  // Gift send handler
  const handleGiftClick = (gift: LiveGift) => {
    const success = sendLiveGift(gift);
    if (!success) {
      setInsufficientCoinsGift(gift);
    } else {
      setInsufficientCoinsGift(null);
    }
  };

  // --- Moderation Action Handlers ---

  // Kick user from live room
  const handleKickUser = (targetUser: User) => {
    setKickedUserIds((prev) => new Set(prev).add(targetUser.id));
    setViewersCount((prev) => Math.max(1, prev - 1));
    setModerationTargetUser(null);
    showFeedbackToast(`🚫 @${targetUser.username} was kicked from the stream`);
  };

  // Block user (triggers room moderation block action API via useApp)
  const handleBlockUser = async (targetUser: User) => {
    try {
      await blockUser(targetUser);
      setKickedUserIds((prev) => new Set(prev).add(targetUser.id));
      setModerationTargetUser(null);
      showFeedbackToast(`⛔ @${targetUser.username} has been permanently blocked`);
    } catch (e) {
      showFeedbackToast(`Error blocking user: ${e}`);
    }
  };

  // Mute user in live chat
  const handleMuteUser = (targetUser: User) => {
    setMutedUserIds((prev) => new Set(prev).add(targetUser.id));
    setModerationTargetUser(null);
    showFeedbackToast(`🔇 @${targetUser.username} muted in live chat`);
  };

  // Filter out comments from blocked or kicked users
  const visibleComments = liveComments.filter(
    (msg) => !kickedUserIds.has(msg.user.id) && !isUserBlocked(msg.user.id)
  );

  // CSS Filter styles for camera preview
  const getFilterStyle = () => {
    switch (activeFilter) {
      case 'glow':
        return 'brightness-105 contrast-105 saturate-110';
      case 'cyberpunk':
        return 'hue-rotate-15 contrast-125 saturate-125';
      case 'warm':
        return 'sepia-25 saturate-115 brightness-105';
      case 'cool':
        return 'hue-rotate-180 brightness-95 contrast-110';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in select-none">
      <div className="relative w-full max-w-md h-full sm:h-[92vh] sm:max-h-[850px] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex flex-col justify-between">
        
        {/* ========================================================================= */}
        {/* ZEGOCLOUD Video View Container & Camera Stream Render Layer               */}
        {/* ========================================================================= */}
        <div 
          id="zego-video-container"
          className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden"
        >
          {/* Active Local/Remote Video Element */}
          <video
            ref={videoContainerRef}
            autoPlay
            playsInline
            muted={isHost || isAudioMuted}
            className={`w-full h-full object-cover transition-all duration-300 ${getFilterStyle()} ${
              !isCameraActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />

          {/* Camera Disabled / Poster Fallback Screen */}
          {!isCameraActive && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/60 to-slate-950 flex flex-col items-center justify-center p-6 text-center z-5">
              <div className="w-20 h-20 rounded-full bg-slate-800/80 border-2 border-fuchsia-500/40 flex items-center justify-center mb-3 shadow-lg shadow-fuchsia-500/20">
                <CameraOff className="w-8 h-8 text-fuchsia-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Camera Feed Paused</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-3">
                Tap the camera toggle button to turn your live video view back on.
              </p>
              <button
                onClick={handleToggleCamera}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-full text-xs font-semibold text-white shadow-lg flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Turn Camera On
              </button>
            </div>
          )}

          {/* Stream Lighting Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/60 pointer-events-none" />
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 border border-fuchsia-500/50 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Floating Heart Reactions Layer */}
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

        {/* ========================================================================= */}
        {/* Top Bar: Host Info, Live Tag, Stream Controls & Close                      */}
        {/* ========================================================================= */}
        <div className="relative z-30 p-4 pt-5 flex items-center justify-between gap-2">
          {/* Host info pill */}
          <div className="flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15 max-w-[210px]">
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
                <Radio className="w-2.5 h-2.5 animate-pulse text-red-500" />
                {activeLiveRoom.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Viewers counter */}
            <div className="flex items-center gap-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{viewersCount.toLocaleString()}</span>
            </div>

            {/* Stream Settings & Moderation Overlay Trigger */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-2 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/10 transition-colors"
              title="Stream Settings & Moderation"
              aria-label="Stream Settings"
            >
              <Sliders className="w-4 h-4 text-fuchsia-400" />
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-2 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/10"
              title="Toggle Audio"
              aria-label="Toggle Audio"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-fuchsia-400" />}
            </button>

            {/* Close Room */}
            <button
              onClick={closeLiveRoom}
              className="p-2 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/10"
              aria-label="Exit Live Room"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Broadcast Info Header with Quality Badge */}
        <div className="relative z-20 px-4 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white/95 max-w-[70%] truncate">
            <Flame className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{activeLiveRoom.title}</span>
          </div>

          <div className="flex items-center gap-1 bg-fuchsia-950/70 border border-fuchsia-500/30 px-2 py-1 rounded-lg text-[10px] font-semibold text-fuchsia-300 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ZEGO HD</span>
          </div>
        </div>

        {/* Live Stream Viewer Drop Timer (Watch-to-Earn Coins) */}
        <div className="relative z-20 px-4 mt-2 flex items-center justify-between">
          <button
            onClick={() => openCoinsRewardModal()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/25 via-slate-900/90 to-amber-500/25 border border-amber-500/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 shadow-md hover:scale-105 active:scale-95 transition-all"
            title="Stream Drop: Earn Free Pulse Coins"
          >
            <span className="animate-bounce">🎁</span>
            <span className="text-[11px]">Stream Drop:</span>
            <span className="text-white font-mono bg-slate-950 px-1.5 py-0.2 rounded border border-amber-500/30 text-[11px]">
              0:{streamDropSeconds < 10 ? `0${streamDropSeconds}` : streamDropSeconds}
            </span>
            <span className="text-[10px] text-amber-400 font-black">+25 🪙</span>
          </button>

          {/* Quick Coin Wallet Pill in Live Room */}
          <button
            onClick={() => openCoinsRewardModal()}
            className="flex items-center gap-1.5 bg-slate-950/80 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md hover:bg-amber-500/20 transition-colors"
            title="Open Coins & Rewards Wallet"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{pulseCoins.toLocaleString()}</span>
          </button>
        </div>

        {showDropCelebration && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-400 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in zoom-in-95 duration-200">
            <span className="text-xl animate-bounce">🪙</span>
            <span className="text-xs font-black text-amber-300">+25 Live Stream Drop Claimed!</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Bottom Section: Live Chat Feed & Interaction Controls                     */}
        {/* ========================================================================= */}
        <div className="relative z-30 p-4 space-y-3">
          
          {/* Quick Streamer Controls Pill (Camera, Mic, Flip) */}
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onClick={handleToggleCamera}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border backdrop-blur-md transition-all ${
                isCameraActive 
                  ? 'bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-200' 
                  : 'bg-red-600/30 border-red-500 text-red-300'
              }`}
            >
              {isCameraActive ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
              <span>{isCameraActive ? 'Camera ON' : 'Camera OFF'}</span>
            </button>

            <button
              onClick={handleToggleMic}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border backdrop-blur-md transition-all ${
                isMicActive 
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
                  : 'bg-red-600/30 border-red-500 text-red-300'
              }`}
            >
              {isMicActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              <span>{isMicActive ? 'Mic ON' : 'Mic Muted'}</span>
            </button>

            <button
              onClick={handleSwitchCamera}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border border-white/15 bg-slate-950/60 text-slate-200 hover:bg-slate-900 backdrop-blur-md"
              title="Flip Camera"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Flip</span>
            </button>
          </div>

          {/* Real-time Comments Feed with Tap to Moderate */}
          <div className="h-44 overflow-y-auto space-y-2 pr-2 no-scrollbar mask-gradient">
            {visibleComments.map((msg, idx) => (
              <div
                key={`${msg.id}-${idx}`}
                onClick={() => setModerationTargetUser(msg.user)}
                role="button"
                tabIndex={0}
                className={`flex items-start gap-2 p-1.5 rounded-xl text-xs backdrop-blur-md max-w-[92%] cursor-pointer hover:border-fuchsia-500/50 transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  msg.isGift
                    ? 'bg-gradient-to-r from-fuchsia-500/20 via-indigo-500/20 to-pink-500/20 border border-fuchsia-500/40 text-fuchsia-300'
                    : 'bg-slate-950/70 border border-transparent hover:border-slate-700 text-slate-200'
                }`}
                title="Click message to moderate user (Kick, Block, Mute)"
              >
                <img
                  src={msg.user.avatar}
                  alt={msg.user.name}
                  className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="leading-tight flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-fuchsia-400 truncate">
                      {msg.user.username}
                    </span>
                    {msg.user.verified && (
                      <span className="text-[9px] text-fuchsia-400">✓</span>
                    )}
                    <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>
                  <span className={msg.isGift ? 'font-semibold text-white break-words' : 'text-slate-200 break-words'}>
                    {msg.text}
                  </span>
                </div>

                {/* Shield icon indicator */}
                <div className="text-slate-500 hover:text-fuchsia-400 p-0.5">
                  <Shield className="w-3 h-3" />
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
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-full px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-fuchsia-500 backdrop-blur-md"
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

        {/* ========================================================================= */}
        {/* Moderation Action Modal (Kick, Block, Mute User)                          */}
        {/* ========================================================================= */}
        {moderationTargetUser && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
              <div className="relative inline-block mx-auto">
                <img
                  src={moderationTargetUser.avatar}
                  alt={moderationTargetUser.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-fuchsia-500 mx-auto"
                />
                <div className="absolute -bottom-1 -right-1 p-1 bg-red-600 rounded-full text-white">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{moderationTargetUser.name}</h3>
                <p className="text-xs text-fuchsia-400">@{moderationTargetUser.username}</p>
              </div>

              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                Choose a moderation action for this user in the live room:
              </div>

              <div className="space-y-2">
                {/* Kick User */}
                <button
                  onClick={() => handleKickUser(moderationTargetUser)}
                  className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500 text-amber-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Kick User from Live Room
                </button>

                {/* Block User (Calls Room Moderation Block Action API) */}
                <button
                  onClick={() => handleBlockUser(moderationTargetUser)}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-600/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Block User Permanently
                </button>

                {/* Mute in Chat */}
                <button
                  onClick={() => handleMuteUser(moderationTargetUser)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  Mute in Live Chat
                </button>
              </div>

              <button
                onClick={() => setModerationTargetUser(null)}
                className="text-xs text-slate-400 hover:text-white pt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Stream Settings & Control Overlay Modal                                   */}
        {/* ========================================================================= */}
        {settingsModalOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85%] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-sm font-bold text-white">Live Stream Settings & Controls</span>
                </div>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hardware Device Toggles */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">Video & Audio Hardware</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleToggleCamera}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      isCameraActive 
                        ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isCameraActive ? <Camera className="w-5 h-5 text-fuchsia-400" /> : <CameraOff className="w-5 h-5 text-slate-500" />}
                    <span className="text-xs font-bold">{isCameraActive ? 'Camera ON' : 'Camera OFF'}</span>
                    <span className="text-[10px] text-slate-400">ZEGO Video View</span>
                  </button>

                  <button
                    onClick={handleToggleMic}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      isMicActive 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isMicActive ? <Mic className="w-5 h-5 text-indigo-400" /> : <MicOff className="w-5 h-5 text-slate-500" />}
                    <span className="text-xs font-bold">{isMicActive ? 'Mic Active' : 'Mic Muted'}</span>
                    <span className="text-[10px] text-slate-400">Echo Cancellation</span>
                  </button>
                </div>

                {/* Flip Camera */}
                <button
                  onClick={handleSwitchCamera}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch Camera ({cameraFacing === 'user' ? 'Front Facing' : 'Rear Facing'})</span>
                </button>
              </div>

              {/* Beauty & Studio Filters */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Beauty & Visual Glow Effects</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['none', 'glow', 'cyberpunk', 'warm', 'cool'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => handleApplyFilter(filter)}
                      className={`py-2 rounded-xl text-[11px] font-semibold border capitalize transition-all ${
                        activeFilter === filter
                          ? 'bg-fuchsia-600 border-fuchsia-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moderation Overview */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
                    Room Moderation
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">Active Protection</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Tap any chat message in the live room feed to Kick, Block, or Mute disruptive users instantly.
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  <span>Kicked Viewers: {kickedUserIds.size}</span>
                  <span>Muted Users: {mutedUserIds.size}</span>
                </div>
              </div>

              {/* Done Button */}
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Gifts Selection Drawer Modal                                              */}
        {/* ========================================================================= */}
        {giftsDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 border-t border-slate-800 rounded-t-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold text-white">Send Virtual Gift</span>
              </div>

              {/* Coin Balance with Recharge */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openCoinsRewardModal()}
                  className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors"
                  title="Pulse Coins Wallet"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pulseCoins.toLocaleString()}</span>
                </button>
                <button
                  onClick={() => {
                    setGiftsDrawerOpen(false);
                    openPaymentWallet('purchase');
                  }}
                  className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full text-xs font-bold transition-colors"
                  title="Buy Coins (JazzCash, Easypaisa, PayPal, Skrill)"
                >
                  <Wallet className="w-3 h-3 text-emerald-400" />
                  <span>Deposit</span>
                </button>
                <button
                  onClick={() => addCoins(500, 'Free Live Gift Refill 🪙')}
                  className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-slate-700 active:scale-95 transition-all"
                  title="Claim +500 free promo coins"
                >
                  +500 Free
                </button>
                <button
                  onClick={() => setGiftsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Insufficient Coins Notice Banner */}
            {insufficientCoinsGift && (
              <div className="mx-0 mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-between text-xs animate-in fade-in">
                <div className="text-rose-200 text-[11px] leading-tight">
                  <span className="font-bold text-white">Coins Kam Hain!</span> {insufficientCoinsGift.name} k liye {insufficientCoinsGift.cost} Coins chahiye (Balance: {pulseCoins}).
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      addCoins(500, 'Free Gift Refill 🪙');
                      setInsufficientCoinsGift(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow-sm active:scale-95"
                  >
                    +500 Refill
                  </button>
                  <button
                    onClick={() => {
                      setInsufficientCoinsGift(null);
                      setGiftsDrawerOpen(false);
                      openPaymentWallet('purchase');
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm"
                  >
                    Buy Coins
                  </button>
                  <button
                    onClick={() => {
                      setInsufficientCoinsGift(null);
                      openCoinsRewardModal();
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px]"
                  >
                    Earn Free
                  </button>
                </div>
              </div>
            )}

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
