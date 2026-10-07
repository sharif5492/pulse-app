import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Heart, Send, Gift, Users, Share2, Volume2, VolumeX, 
  Sparkles, Plus, Shield, MessageCircle, Radio,
  Camera, CameraOff, Mic, MicOff, RefreshCw, Sliders, UserX,
  Eye, Settings, AlertTriangle, CheckCircle, Flame,
  MoreVertical, Trash2, StopCircle, UserCheck, ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LIVE_GIFTS } from '../mockData';
import { LiveGift, User } from '../types';
import { zegoLiveEngine } from '../lib/zegoService';
import { supabase } from '../lib/supabase';

export const ActiveLiveRoom: React.FC = () => {
  const { 
    activeLiveRoom, 
    closeLiveRoom, 
    liveComments, 
    sendLiveComment, 
    clearLiveComments,
    addIncomingLiveComment,
    sendLiveGift, 
    floatingHearts, 
    triggerLiveHeart,
    blockUser,
    unblockUser,
    isUserBlocked,
    blockedUserIds,
  } = useApp();
  const { user } = useAuth();

  // Chat & Gifts
  const [commentInput, setCommentInput] = useState('');
  const [giftsDrawerOpen, setGiftsDrawerOpen] = useState(false);
  const [viewersCount, setViewersCount] = useState(1);
  const [realLiveViewers, setRealLiveViewers] = useState<User[]>([]);
  const presenceChannelRef = useRef<any>(null);

  // Host Controls (3 dots menu) & Moderation
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [isAllChatMuted, setIsAllChatMuted] = useState(false);
  const [liveBlockedUserIds, setLiveBlockedUserIds] = useState<Set<string>>(new Set());

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

  const isHost = Boolean(user && (
    activeLiveRoom?.host.id === user.id || 
    activeLiveRoom?.id.startsWith('live_host_') || 
    activeLiveRoom?.id.startsWith('live_usr_') ||
    activeLiveRoom?.host.username?.toLowerCase() === user.username?.toLowerCase()
  ));

  // Check if current viewing user is blocked by host from watching or commenting
  const isViewerBlockedFromLive = Boolean(user && (
    isUserBlocked(user.id) || 
    blockedUserIds.includes(user.id) || 
    liveBlockedUserIds.has(user.id)
  ));

  // Real-time Live Stream Viewer Count & Real Broadcast Channel via Supabase
  useEffect(() => {
    if (!activeLiveRoom) return;

    let presenceChannel: any = null;

    if (supabase) {
      try {
        const channelName = `live_stream_${activeLiveRoom.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        presenceChannel = supabase.channel(channelName, {
          config: {
            presence: {
              key: user?.id || `viewer_${Math.random().toString(36).slice(2, 8)}`,
            },
            broadcast: { ack: false },
          },
        });
        presenceChannelRef.current = presenceChannel;

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const presenceKeys = Object.keys(state);
            const count = Math.max(1, presenceKeys.length);
            setViewersCount(count);

            // Extract real presence viewers
            const realViewersList: User[] = [];
            for (const key of presenceKeys) {
              const presences = state[key] as any[];
              if (presences && presences.length > 0) {
                const p = presences[0];
                if (p && p.user_id && p.user_id !== user?.id) {
                  realViewersList.push({
                    id: p.user_id,
                    name: p.name || p.username || 'Live Viewer',
                    username: p.username || 'viewer',
                    avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`,
                    bio: '',
                    followersCount: 0,
                    followingCount: 0,
                    likesCount: 0,
                    isFollowing: false,
                  });
                }
              }
            }
            setRealLiveViewers(realViewersList);
          })
          .on('broadcast', { event: 'live_comment' }, ({ payload }: { payload: any }) => {
            if (payload && payload.user) {
              addIncomingLiveComment(payload);
            }
          })
          .on('broadcast', { event: 'live_heart' }, () => {
            triggerLiveHeart();
          })
          .on('broadcast', { event: 'clear_chat' }, () => {
            clearLiveComments();
            showFeedbackToast('Chat was cleared by host');
          })
          .on('broadcast', { event: 'mute_all' }, ({ payload }: { payload: { isMuted: boolean } }) => {
            setIsAllChatMuted(payload.isMuted);
            showFeedbackToast(payload.isMuted ? 'Host has muted live chat' : 'Host has unmuted live chat');
          })
          .on('broadcast', { event: 'live_block' }, ({ payload }: { payload: { targetUserId: string; blocked: boolean } }) => {
            if (payload && payload.targetUserId) {
              setLiveBlockedUserIds((prev) => {
                const next = new Set(prev);
                if (payload.blocked) {
                  next.add(payload.targetUserId);
                } else {
                  next.delete(payload.targetUserId);
                }
                return next;
              });
            }
          })
          .on('broadcast', { event: 'end_live' }, () => {
            if (!isHost) {
              showFeedbackToast('Host has ended the live stream');
              setTimeout(() => closeLiveRoom(), 1200);
            }
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              try {
                await presenceChannel.track({
                  user_id: user?.id || `viewer_${Date.now()}`,
                  name: user?.name || 'Viewer',
                  username: user?.username || 'viewer',
                  avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                  online_at: new Date().toISOString(),
                });
              } catch {}
            }
          });

        // Query live_participants count if table exists
        supabase
          .from('live_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', activeLiveRoom.id)
          .then(
            ({ count, error }) => {
              if (!error && typeof count === 'number' && count > 0) {
                setViewersCount(count);
              }
            },
            () => {}
          );
      } catch (err) {
        console.warn('Realtime live presence warning:', err);
      }
    }

    return () => {
      if (presenceChannel && supabase) {
        try {
          supabase.removeChannel(presenceChannel);
        } catch {}
      }
      presenceChannelRef.current = null;
    };
  }, [activeLiveRoom?.id, user?.id]);

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
            mirror: false,
          });

          // Explicitly disable mirror mode for both preview and published stream
          zegoLiveEngine.setVideoMirrorMode(0);
          zegoLiveEngine.setVideoConfig({ mirror: false });

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
    zegoLiveEngine.setVideoMirrorMode(0);
    zegoLiveEngine.setVideoConfig({ mirror: false });
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

  // Heart trigger helper that broadcasts real heart burst
  const handleTriggerHeart = () => {
    triggerLiveHeart();
    try {
      presenceChannelRef.current?.send({
        type: 'broadcast',
        event: 'live_heart',
      });
    } catch {}
  };

  // Chat message send handler
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;

    if (isViewerBlockedFromLive) {
      showFeedbackToast('You are blocked from chatting in this stream');
      return;
    }

    if (isAllChatMuted && !isHost) {
      showFeedbackToast('Live chat is currently muted by host');
      return;
    }

    if (user && mutedUserIds.has(user.id)) {
      showFeedbackToast('You are muted in this live broadcast');
      return;
    }

    const newComment = {
      id: `lc_${Date.now()}`,
      user,
      text: commentInput.trim(),
      timestamp: 'Just now',
    };

    sendLiveComment(commentInput.trim());
    try {
      presenceChannelRef.current?.send({
        type: 'broadcast',
        event: 'live_comment',
        payload: newComment,
      });
    } catch {}

    setCommentInput('');
  };

  // Gift send handler (100% Free Virtual Gifts)
  const handleGiftClick = (gift: LiveGift) => {
    if (!user) return;
    sendLiveGift(gift);
    try {
      presenceChannelRef.current?.send({
        type: 'broadcast',
        event: 'live_comment',
        payload: {
          id: `lc_gift_${Date.now()}`,
          user,
          text: `Sent ${gift.name} ${gift.icon}`,
          isGift: true,
          giftName: gift.name,
          giftIcon: gift.icon,
          timestamp: 'Just now',
        },
      });
    } catch {}
    showFeedbackToast(`Sent ${gift.name} ${gift.icon}!`);
  };

  // End live broadcast handler
  const handleEndLive = () => {
    try {
      presenceChannelRef.current?.send({
        type: 'broadcast',
        event: 'end_live',
      });
      zegoLiveEngine.stopTracks();
    } catch {}
    closeLiveRoom();
  };

  // Toggle Block / Unblock user in live stream
  const handleToggleLiveBlock = async (targetUser: User) => {
    const isCurrentlyBlocked = isUserBlocked(targetUser.id) || liveBlockedUserIds.has(targetUser.id);
    if (isCurrentlyBlocked) {
      try {
        await unblockUser(targetUser.id);
        setLiveBlockedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUser.id);
          return next;
        });
        try {
          presenceChannelRef.current?.send({
            type: 'broadcast',
            event: 'live_block',
            payload: { targetUserId: targetUser.id, blocked: false },
          });
        } catch {}
        showFeedbackToast(`✅ @${targetUser.username} has been unblocked`);
      } catch (err) {
        showFeedbackToast(`Error unblocking: ${err}`);
      }
    } else {
      try {
        await blockUser(targetUser);
        setLiveBlockedUserIds((prev) => new Set(prev).add(targetUser.id));
        setKickedUserIds((prev) => new Set(prev).add(targetUser.id));
        try {
          presenceChannelRef.current?.send({
            type: 'broadcast',
            event: 'live_block',
            payload: { targetUserId: targetUser.id, blocked: true },
          });
        } catch {}
        showFeedbackToast(`⛔ @${targetUser.username} blocked from this stream`);
      } catch (err) {
        showFeedbackToast(`Error blocking: ${err}`);
      }
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
      await handleToggleLiveBlock(targetUser);
      setModerationTargetUser(null);
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

  // Filter out comments from blocked or kicked users - his messages should not show!
  const visibleComments = liveComments.filter(
    (msg) => !kickedUserIds.has(msg.user.id) && !isUserBlocked(msg.user.id) && !liveBlockedUserIds.has(msg.user.id)
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
            style={{ transform: 'none', WebkitTransform: 'none' }}
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
            {/* Viewers counter: Real-time watching with Eye icon */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-md">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>{viewersCount.toLocaleString()} watching</span>
            </div>

            {/* Host Settings Menu (3 dots) */}
            <div className="relative">
              <button
                onClick={() => setHostMenuOpen(!hostMenuOpen)}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                  hostMenuOpen
                    ? 'bg-fuchsia-600 border-fuchsia-400 text-white'
                    : 'bg-slate-950/70 hover:bg-slate-900 border-white/15 text-white'
                }`}
                title="Host Settings Menu (3 dots)"
                aria-label="Host Settings"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>

              {/* Host Settings Dropdown Menu */}
              {hostMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl p-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 space-y-1">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Host Settings</span>
                    <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.2 rounded font-bold">
                      {isHost ? 'HOST' : 'ADMIN'}
                    </span>
                  </div>

                  {/* 1. Block User / Unblock User */}
                  <button
                    onClick={() => {
                      setHostMenuOpen(false);
                      setViewersModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Block User / Unblock User</span>
                  </button>

                  {/* 2. Clear Chat / Delete All Messages */}
                  <button
                    onClick={() => {
                      setHostMenuOpen(false);
                      clearLiveComments();
                      try {
                        presenceChannelRef.current?.send({
                          type: 'broadcast',
                          event: 'clear_chat',
                        });
                      } catch {}
                      showFeedbackToast('All chat messages deleted by host');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Clear Chat / Delete All Messages</span>
                  </button>

                  {/* 3. Mute All / Unmute All */}
                  <button
                    onClick={() => {
                      const nextMute = !isAllChatMuted;
                      setIsAllChatMuted(nextMute);
                      try {
                        presenceChannelRef.current?.send({
                          type: 'broadcast',
                          event: 'mute_all',
                          payload: { isMuted: nextMute },
                        });
                      } catch {}
                      setHostMenuOpen(false);
                      showFeedbackToast(nextMute ? 'All viewers muted in chat' : 'All viewers unmuted in chat');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    {isAllChatMuted ? (
                      <>
                        <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unmute All Viewers</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Mute All / Mute Viewers</span>
                      </>
                    )}
                  </button>

                  {/* Device / Stream Settings */}
                  <button
                    onClick={() => {
                      setHostMenuOpen(false);
                      setSettingsModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-fuchsia-400 shrink-0" />
                    <span>Camera & Filters</span>
                  </button>

                  {/* 4. End Live */}
                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setHostMenuOpen(false);
                        handleEndLive();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-2 transition-colors"
                    >
                      <StopCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>End Live Broadcast</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mute Stream Audio Toggle */}
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

        {/* Fullscreen Blocked Overlay if user is blocked from viewing stream */}
        {isViewerBlockedFromLive && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mb-4 shadow-xl shadow-rose-500/30">
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Blocked From Live Stream</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              The host has blocked you from viewing and commenting in this live broadcast.
            </p>
            <button
              onClick={closeLiveRoom}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-full text-xs font-bold shadow-lg shadow-rose-900/40 transition-all active:scale-95"
            >
              Exit Live Room
            </button>
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
            {isViewerBlockedFromLive ? (
              <div className="flex-1 py-2 px-3 bg-rose-950/80 border border-rose-500/40 rounded-full text-center text-xs font-semibold text-rose-300">
                You are blocked from commenting in this stream
              </div>
            ) : isAllChatMuted && !isHost ? (
              <div className="flex-1 py-2 px-3 bg-amber-950/80 border border-amber-500/40 rounded-full text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                <MicOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Live chat is muted by host</span>
              </div>
            ) : (
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
            )}

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
              onClick={handleTriggerHeart}
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
        {/* Host Viewers Moderation Modal (Block / Unblock Viewers)                  */}
        {/* ========================================================================= */}
        {viewersModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85%] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Live Viewers & Moderation</span>
                </div>
                <button
                  onClick={() => setViewersModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 shrink-0">
                Block any user from viewing this stream or commenting in chat. Blocked users are immediately prevented from watching or messaging.
              </p>

              {/* Viewers & Chat Participants List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-48">
                {(() => {
                  const combined = Array.from(
                    new Map(
                      [...realLiveViewers, ...liveComments.map((c) => c.user)]
                        .filter((u): u is User => Boolean(u && u.id && u.id !== user?.id))
                        .map((u) => [u.id, u])
                    ).values()
                  );

                  if (combined.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-bold text-slate-300">No viewers watching yet</p>
                        <p className="text-[11px] text-slate-500 mt-1">Real viewers joining this live broadcast will appear here.</p>
                      </div>
                    );
                  }

                  return combined.map((participant) => {
                    const isBlocked = isUserBlocked(participant.id) || liveBlockedUserIds.has(participant.id);
                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {participant.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              @{participant.username}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleLiveBlock(participant)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${
                            isBlocked
                              ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                              : 'bg-rose-600/20 border border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white'
                          }`}
                        >
                          {isBlocked ? 'Unblock' : 'Block User'}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="pt-2 border-t border-slate-800 shrink-0 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Total Blocked Users: {liveBlockedUserIds.size + blockedUserIds.length}
                </span>
                <button
                  onClick={() => setViewersModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Gifts Selection Drawer Modal (100% Free Virtual Gifts)                    */}
        {/* ========================================================================= */}
        {giftsDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/98 border-t border-slate-800 rounded-t-3xl p-4 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold text-white">Send Virtual Gift (Free)</span>
              </div>
              <button
                onClick={() => setGiftsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-3">
              {LIVE_GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleGiftClick(gift)}
                  className="flex flex-col items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10 transition-all group active:scale-95"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">
                    {gift.icon}
                  </span>
                  <span className="text-[11px] font-bold text-white mt-1">{gift.name}</span>
                  <span className="text-[10px] text-fuchsia-300 font-semibold mt-0.5">Free Gift</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
