import React, { useEffect, useRef, useState } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, 
  Sparkles, Wand2, Check, X, MessageCircle, 
  MoreHorizontal, UserPlus, User
} from 'lucide-react';
import { ActiveCallSession, VoiceEffect } from '../types';
import { audioUtils } from '../lib/audioUtils';
import { VOICE_PRESETS, voiceChanger } from '../lib/voiceChanger';
import { useApp } from '../context/AppContext';

interface CallOverlayProps {
  session: ActiveCallSession;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onToggleSpeaker: () => void;
  onSetVoiceEffect?: (effect: VoiceEffect) => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  session,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onFlipCamera,
  onToggleSpeaker,
  onSetVoiceEffect,
}) => {
  const { startChatWithUser } = useApp();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPipSwapped, setIsPipSwapped] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const activeEffect: VoiceEffect = session.voiceEffect || 'original';

  const showFeedback = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Handle Voice Switch
  const handleSelectVoice = (effect: VoiceEffect) => {
    audioUtils.playPop();
    if (onSetVoiceEffect) {
      onSetVoiceEffect(effect);
    } else {
      voiceChanger.applyEffectParameters(effect);
      audioUtils.playVoiceEffectSwitched(effect);
    }
    showFeedback(`Voice set to: ${VOICE_PRESETS[effect].name}`);
  };

  // Format call duration into MM:SS
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Handle Share button click (screen share or invite link)
  const handleShareClick = async () => {
    audioUtils.playPop();

    // Try screen sharing if supported and in video call
    if (session.callType === 'video' && navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && session.localStream) {
            localVideoRef.current.srcObject = session.localStream;
          }
        };
        showFeedback('Screen sharing active');
        return;
      } catch (err) {
        // Fallback to share link
      }
    }

    const callUrl = `${window.location.origin}/#call=${session.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pulse Call with ${session.participant.name}`,
          text: `Join active call with ${session.participant.name}`,
          url: callUrl,
        });
        showFeedback('Call shared');
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(callUrl);
      showFeedback('Call link copied to clipboard');
    } catch {
      showFeedback(`Call with ${session.participant.name}`);
    }
  };

  // Bind streams to video elements without mirror/inversion
  useEffect(() => {
    const mainStream = isPipSwapped ? session.localStream : session.remoteStream;
    const pipStream = isPipSwapped ? session.remoteStream : session.localStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = mainStream || null;
      remoteVideoRef.current.style.transform = 'none';
      remoteVideoRef.current.style.webkitTransform = 'none';
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = pipStream || null;
      localVideoRef.current.style.transform = 'none';
      localVideoRef.current.style.webkitTransform = 'none';
    }
  }, [session.localStream, session.remoteStream, session.callType, session.isVideoOff, isPipSwapped]);

  // If minimized to floating card
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#111b21]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center gap-3 w-72">
          <div className="relative shrink-0">
            <img
              src={session.participant.avatar}
              alt={session.participant.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{session.participant.name}</h4>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
              <span>{session.status === 'connected' ? formatDuration(session.durationSeconds) : 'Connecting...'}</span>
              {activeEffect !== 'original' && (
                <span className="px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[9px] font-bold">
                  {activeEffect === 'girl' ? '👧 Girl FX' : '👦 Boy FX'}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                audioUtils.playPop();
                startChatWithUser(session.participant);
              }}
              className="p-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-white"
              title="Chat with Caller"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                audioUtils.playPop();
                setIsMinimized(false);
              }}
              className="p-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-white"
              title="Expand Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                audioUtils.playPop();
                onEndCall();
              }}
              className="p-1.5 rounded-lg bg-[#ea0038] hover:bg-[#d00030] text-white"
              title="End Call"
            >
              <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVideo = session.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b141a] text-slate-100 select-none overflow-hidden animate-in fade-in duration-300">
      {/* WhatsApp style doodle background wallpaper */}
      <div className="absolute inset-0 bg-[#0b141a] z-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-[0.05] text-slate-100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="whatsapp-doodle-bg" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M20 20a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-5l-4 4v-4h-1a5 5 0 0 1-5-5V25a5 5 0 0 1 5-5h10zm40 10a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm25 25l6 6-6 6-6-6 6-6zm-50 35c5 0 8 4 8 8s-3 8-8 8-8-4-8-8 3-8 8-8zm55-15h12v12H90V75zm-70-5h8l4 6-4 6h-8l-4-6 4-6z" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#whatsapp-doodle-bg)" />
        </svg>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="bg-[#1c272e]/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/80 animate-in fade-in slide-in-from-top-2">
            {feedbackToast}
          </div>
        </div>
      )}

      {/* Top Header Bar matching Screenshot */}
      <div className="relative z-30 w-full max-w-md mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        {/* Left: Minimize button (inward diagonal arrows) */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setIsMinimized(true);
          }}
          className="w-11 h-11 rounded-full bg-[#1c272e] hover:bg-[#25323a] text-white flex items-center justify-center transition-all active:scale-95 shadow-md border border-white/5"
          title="Minimize Call"
        >
          <Minimize2 className="w-5 h-5 text-white" />
        </button>

        {/* Center: Contact Name / Phone & Status */}
        <div className="text-center min-w-0 flex-1 px-3">
          <h2 className="text-base sm:text-lg font-semibold text-white truncate tracking-wide">
            {(session.participant as any).phone || session.participant.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-normal">
            {session.status === 'connected' ? (
              <span className="text-emerald-400 font-medium flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {formatDuration(session.durationSeconds)}
              </span>
            ) : session.isCaller ? (
              'Calling'
            ) : (
              'Connecting...'
            )}
          </p>
        </div>

        {/* Right: Add Participant / Open Chat */}
        <button
          onClick={() => {
            audioUtils.playPop();
            setIsMinimized(true);
            startChatWithUser(session.participant);
          }}
          className="w-11 h-11 rounded-full bg-[#1c272e] hover:bg-[#25323a] text-white flex items-center justify-center transition-all active:scale-95 shadow-md border border-white/5"
          title="Chat / Add Participant"
        >
          <UserPlus className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Center Stage */}
      <div className="relative z-10 flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center p-4">
        {isVideo ? (
          /* Video Call View: Remote Stream with PiP Local Stream */
          <div className="relative w-full h-full max-h-[560px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Primary Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                session.status === 'connected' ? 'opacity-100' : 'opacity-40'
              }`}
              style={{ transform: 'none', WebkitTransform: 'none' }}
            />

            {/* Remote Fallback / Overlay if waiting to connect or remote video is off */}
            {session.status !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm space-y-4 p-6 text-center">
                <div className="w-28 h-28 rounded-full bg-[#1c272e] flex items-center justify-center shadow-xl border border-white/10">
                  {session.participant.avatar ? (
                    <img
                      src={session.participant.avatar}
                      alt={session.participant.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{session.participant.name}</h3>
                  <p className="text-xs text-emerald-400 font-medium animate-pulse mt-1">
                    {session.isCaller ? 'Calling...' : 'Connecting Media Streams...'}
                  </p>
                </div>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Video Box */}
            <div
              onClick={() => setIsPipSwapped(!isPipSwapped)}
              className="absolute top-4 right-4 w-28 sm:w-32 aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border-2 border-white/20 shadow-2xl z-20 cursor-pointer group hover:scale-105 transition-transform"
              title="Click to toggle PIP"
            >
              {session.isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-2 text-center">
                  <VideoOff className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[9px] font-semibold">Camera Off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'none', WebkitTransform: 'none' }}
                />
              )}
            </div>
          </div>
        ) : (
          /* Audio Call View: Matching Screenshot with Huge Circular Avatar */
          <div className="flex flex-col items-center justify-center my-auto">
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#1c272e] flex items-center justify-center shadow-2xl relative overflow-hidden border border-white/5">
              {session.participant.avatar ? (
                <img
                  src={session.participant.avatar}
                  alt={session.participant.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-28 h-28 text-slate-400" />
              )}
              {session.status === 'connected' && (
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse pointer-events-none" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Voice Changer Selector Modal */}
      {showVoiceMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#222e35] rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-[#222e35]">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Voice Changer FX</h3>
              </div>
              <button
                onClick={() => setShowVoiceMenu(false)}
                className="p-1.5 rounded-full bg-[#202c33] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(['original', 'girl', 'boy'] as VoiceEffect[]).map((fxKey) => {
                const preset = VOICE_PRESETS[fxKey];
                const isSelected = activeEffect === fxKey;
                return (
                  <button
                    key={fxKey}
                    onClick={() => handleSelectVoice(fxKey)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                        : 'bg-[#202c33] border-transparent hover:bg-[#2a3942] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{preset.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{preset.name}</div>
                        <div className="text-[10px] text-slate-400">{preset.tagline}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowVoiceMenu(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* More Options Modal */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#222e35] rounded-3xl p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-[#222e35]">
              <span className="text-sm font-bold text-white">Call Options</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full bg-[#202c33] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Voice FX button */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowVoiceMenu(true);
                }}
                className="w-full p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] text-slate-200 hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-fuchsia-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Voice Changer FX</div>
                    <div className="text-[10px] text-slate-400">Current: {VOICE_PRESETS[activeEffect].name}</div>
                  </div>
                </div>
                <span className="text-[10px] bg-[#111b21] px-2 py-0.5 rounded-full text-slate-300">Change</span>
              </button>

              {/* Flip camera if video */}
              {isVideo && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onFlipCamera();
                    showFeedback('Flipped camera');
                  }}
                  className="w-full p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] text-slate-200 hover:text-white flex items-center gap-3 transition-colors"
                >
                  <RotateCcw className="w-5 h-5 text-cyan-400" />
                  <div className="text-xs font-bold text-white">Flip Camera</div>
                </button>
              )}

              {/* In-Call Chat */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setIsMinimized(true);
                  startChatWithUser(session.participant);
                }}
                className="w-full p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] text-slate-200 hover:text-white flex items-center gap-3 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <div className="text-xs font-bold text-white">Chat with {session.participant.name}</div>
              </button>
            </div>

            <button
              onClick={() => setShowMoreMenu(false)}
              className="w-full py-2.5 bg-[#202c33] hover:bg-[#2a3942] rounded-xl text-xs font-bold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Bottom Floating Control Card: Exact WhatsApp 2-Row Style from Screenshot  */}
      {/* ========================================================================= */}
      <div className="relative z-30 w-full max-w-sm sm:max-w-md mx-auto px-4 pb-8 sm:pb-10">
        <div className="bg-[#111b21] border border-[#222e35] rounded-[36px] p-6 pt-5 shadow-2xl shadow-black/80">
          <div className="grid grid-cols-3 gap-y-6 gap-x-4 place-items-center">
            
            {/* Row 1, Column 1: Speaker */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  onToggleSpeaker();
                  showFeedback(session.isSpeakerOn ? 'Earpiece Mode' : 'Speaker ON');
                }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  session.isSpeakerOn
                    ? 'bg-white text-[#111b21] shadow-lg'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={session.isSpeakerOn ? 'Speaker ON' : 'Speaker OFF'}
                aria-label="Speaker"
              >
                <Volume2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <span className="text-xs text-slate-300 font-medium">Speaker</span>
            </div>

            {/* Row 1, Column 2: Video */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  onToggleVideo();
                  showFeedback(session.isVideoOff ? 'Camera ON' : 'Camera OFF');
                }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  session.isVideoOff
                    ? 'bg-[#202c33] hover:bg-[#2a3942] text-slate-400'
                    : isVideo
                    ? 'bg-white text-[#111b21] shadow-lg'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={session.isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                aria-label="Video"
              >
                {session.isVideoOff ? (
                  <VideoOff className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <Video className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </button>
              <span className="text-xs text-slate-300 font-medium">Video</span>
            </div>

            {/* Row 1, Column 3: Mute */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  onToggleMute();
                  showFeedback(session.isMuted ? 'Microphone unmuted' : 'Microphone muted');
                }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  session.isMuted
                    ? 'bg-white text-[#111b21] shadow-lg'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={session.isMuted ? 'Unmute Mic' : 'Mute Mic'}
                aria-label="Mute"
              >
                {session.isMuted ? (
                  <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </button>
              <span className="text-xs text-slate-300 font-medium">Mute</span>
            </div>

            {/* Row 2, Column 1: More */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  setShowMoreMenu(true);
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all bg-[#202c33] hover:bg-[#2a3942] text-white active:scale-95"
                title="More Options"
                aria-label="More"
              >
                <MoreHorizontal className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <span className="text-xs text-slate-300 font-medium">More</span>
            </div>

            {/* Row 2, Column 2: Share */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleShareClick}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isScreenSharing
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title="Share Screen or Invite"
                aria-label="Share"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 5l4 4h-3v4h-2v-4H8l4-4z" />
                </svg>
              </button>
              <span className="text-xs text-slate-300 font-medium">Share</span>
            </div>

            {/* Row 2, Column 3: End */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  audioUtils.playPop();
                  onEndCall();
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all bg-[#ea0038] hover:bg-[#d00030] active:scale-95 text-white shadow-xl shadow-red-950/60"
                title="End Call"
                aria-label="End"
              >
                <Phone className="w-6 h-6 sm:w-7 sm:h-7 rotate-[135deg]" />
              </button>
              <span className="text-xs text-slate-300 font-medium">End</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
