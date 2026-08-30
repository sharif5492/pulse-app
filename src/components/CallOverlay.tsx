import React, { useEffect, useRef, useState } from 'react';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, 
  Sparkles, ShieldCheck, Wifi, Radio, Wand2, 
  Check, Headphones, Sliders, X, Zap
} from 'lucide-react';
import { ActiveCallSession, VoiceEffect } from '../types';
import { audioUtils } from '../lib/audioUtils';
import { VOICE_PRESETS, voiceChanger } from '../lib/voiceChanger';

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
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPipSwapped, setIsPipSwapped] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0);

  const activeEffect: VoiceEffect = session.voiceEffect || 'original';

  // Monitor live microphone activity for the DSP visualizer
  useEffect(() => {
    let animId: number;
    const updateLevel = () => {
      const level = voiceChanger.getAudioLevel();
      setAudioMeterLevel(level);
      animId = requestAnimationFrame(updateLevel);
    };
    animId = requestAnimationFrame(updateLevel);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Voice Switch
  const handleSelectVoice = (effect: VoiceEffect) => {
    audioUtils.playPop();
    if (onSetVoiceEffect) {
      onSetVoiceEffect(effect);
    } else {
      voiceChanger.applyEffectParameters(effect);
      audioUtils.playVoiceEffectSwitched(effect);
    }
  };

  // Format call duration into MM:SS
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Bind streams to video elements
  useEffect(() => {
    if (localVideoRef.current && session.localStream) {
      localVideoRef.current.srcObject = session.localStream;
    }
  }, [session.localStream, session.callType, session.isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && session.remoteStream) {
      remoteVideoRef.current.srcObject = session.remoteStream;
    }
  }, [session.remoteStream, session.callType]);

  // If minimized to floating card
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-fuchsia-500/50 rounded-2xl p-3 shadow-2xl shadow-fuchsia-950/50 flex items-center gap-3 w-72">
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
            <p className="text-[10px] text-fuchsia-400 font-semibold flex items-center gap-1.5">
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
                setIsMinimized(false);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Expand Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                audioUtils.playPop();
                onEndCall();
              }}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/40"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVideo = session.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-300 tracking-wider">
              END-TO-END ENCRYPTED WebRTC
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-400 font-semibold">
            <Wifi className="w-3 h-3" />
            <span>HD Audio/Video</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Voice FX Quick Badge Pill */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setShowVoiceMenu(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-md backdrop-blur-md ${
              activeEffect === 'girl'
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/30'
                : activeEffect === 'boy'
                ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 hover:bg-indigo-500/30'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Open Voice Changer"
          >
            <Wand2 className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span>{VOICE_PRESETS[activeEffect].shortName}</span>
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              setIsMinimized(true);
            }}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Minimize Call Window"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Calling Stage */}
      <div className="relative z-10 flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4">
        {isVideo ? (
          /* Video Call View: Full Remote + PiP Local Stream */
          <div className="relative w-full h-full max-h-[620px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Primary Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                session.status === 'connected' ? 'opacity-100' : 'opacity-40'
              }`}
            />

            {/* Remote Fallback / Overlay if waiting to connect or remote video is off */}
            {session.status !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm space-y-4 p-6 text-center">
                <div className="relative">
                  <img
                    src={session.participant.avatar}
                    alt={session.participant.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-fuchsia-500 shadow-xl shadow-fuchsia-500/20"
                  />
                  <div className="absolute inset-0 rounded-full border-2 border-fuchsia-400 animate-ping opacity-30" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{session.participant.name}</h3>
                  <p className="text-xs text-fuchsia-400 font-semibold animate-pulse mt-1">
                    {session.isCaller ? 'Ringing Remote Peer...' : 'Connecting Media Streams...'}
                  </p>
                </div>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Video Box */}
            <div
              onClick={() => setIsPipSwapped(!isPipSwapped)}
              className="absolute top-4 right-4 w-28 sm:w-36 aspect-[9/16] sm:aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 border-2 border-fuchsia-500/80 shadow-2xl z-20 cursor-pointer group hover:scale-105 transition-transform"
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
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}
              <div className="absolute bottom-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                <span>You</span>
                {activeEffect !== 'original' && (
                  <span className="text-fuchsia-400 font-bold">• {VOICE_PRESETS[activeEffect].shortName}</span>
                )}
              </div>
            </div>

            {/* Remote Participant Tag Overlay */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">{session.participant.name}</span>
              {session.participant.verified && (
                <span className="text-[10px] text-fuchsia-400 font-bold">✓</span>
              )}
            </div>
          </div>
        ) : (
          /* Audio Call View: Modern High-End Voice UI */
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
            {/* Animated Pulsing Ring & Avatar */}
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-fuchsia-600 to-indigo-600 p-1 shadow-2xl shadow-fuchsia-500/25">
                <img
                  src={session.participant.avatar}
                  alt={session.participant.name}
                  className="w-full h-full rounded-full object-cover border-4 border-slate-950"
                />
              </div>

              {/* Pulsing Aura */}
              {session.status === 'connected' ? (
                <div className="absolute -inset-3 rounded-full border-2 border-fuchsia-500/50 animate-ping opacity-40 pointer-events-none" />
              ) : (
                <div className="absolute -inset-4 rounded-full border border-indigo-400/40 animate-pulse pointer-events-none" />
              )}

              {/* Verified Badge */}
              {session.participant.verified && (
                <div className="absolute bottom-1 right-2 bg-fuchsia-600 text-white rounded-full p-1 border-2 border-slate-950 shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* User Details & Active State */}
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {session.participant.name}
              </h2>
              <p className="text-xs text-slate-400 font-medium">@{session.participant.username}</p>

              <div className="pt-2 flex items-center justify-center gap-2">
                {session.status === 'connected' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-inner">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>{formatDuration(session.durationSeconds)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-semibold animate-pulse">
                    <span>{session.isCaller ? 'Calling...' : 'Connecting Audio Room...'}</span>
                  </div>
                )}

                {/* Voice FX Status Pill in Audio View */}
                <button
                  onClick={() => {
                    audioUtils.playPop();
                    setShowVoiceMenu(true);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                    activeEffect === 'girl'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : activeEffect === 'boy'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3 h-3 text-fuchsia-400" />
                  <span>{VOICE_PRESETS[activeEffect].name}</span>
                </button>
              </div>
            </div>

            {/* Audio Waveform Visualization in Active Call reacting to DSP level */}
            {session.status === 'connected' && (
              <div className="flex items-center justify-center gap-1.5 h-10 py-2">
                {[40, 70, 95, 60, 100, 80, 50, 90, 75, 45, 85, 30].map((height, i) => {
                  const dynamicH = Math.max(15, Math.min(100, (height * (audioMeterLevel > 5 ? audioMeterLevel / 40 : 0.6) + (i % 3) * 15)));
                  return (
                    <span
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        activeEffect === 'girl'
                          ? 'bg-gradient-to-t from-rose-500 to-pink-300'
                          : activeEffect === 'boy'
                          ? 'bg-gradient-to-t from-indigo-500 to-sky-300'
                          : 'bg-gradient-to-t from-fuchsia-500 to-indigo-400'
                      }`}
                      style={{
                        height: `${dynamicH}%`,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice Changer Selector Modal / Popover Sheet */}
      {showVoiceMenu && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black/80 space-y-5 animate-in slide-in-from-bottom duration-300 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>Voice Changer</span>
                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider">
                      Live Web Audio DSP
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Natural pitch & formant frequency modulation</p>
                </div>
              </div>

              <button
                onClick={() => {
                  audioUtils.playPop();
                  setShowVoiceMenu(false);
                }}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice Options Grid */}
            <div className="space-y-3">
              {(['original', 'girl', 'boy'] as VoiceEffect[]).map((fxKey) => {
                const preset = VOICE_PRESETS[fxKey];
                const isSelected = activeEffect === fxKey;

                return (
                  <button
                    key={fxKey}
                    onClick={() => handleSelectVoice(fxKey)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                      isSelected
                        ? fxKey === 'girl'
                          ? 'bg-rose-500/15 border-rose-500/70 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30'
                          : fxKey === 'boy'
                          ? 'bg-indigo-500/15 border-indigo-500/70 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                          : 'bg-slate-800/90 border-slate-600 shadow-lg ring-1 ring-slate-600/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border ${
                          isSelected
                            ? 'bg-slate-900 border-white/20'
                            : 'bg-slate-900/80 border-slate-800 group-hover:scale-105'
                        } transition-transform`}
                      >
                        {preset.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">{preset.name}</h4>
                          {isSelected && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                                fxKey === 'girl'
                                  ? 'bg-rose-500 text-white'
                                  : fxKey === 'boy'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{preset.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? fxKey === 'girl'
                              ? 'border-rose-500 bg-rose-500 text-white'
                              : fxKey === 'boy'
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Audio Level Meter & Info Note */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Live Mic Activity
                </span>
                <span className="text-fuchsia-400 font-bold">
                  {activeEffect === 'girl' ? '+4.7st (Girl Formant)' : activeEffect === 'boy' ? '-4.3st (Deep Boy)' : '0.0st (Unmodified)'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    activeEffect === 'girl'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400'
                      : activeEffect === 'boy'
                      ? 'bg-gradient-to-r from-indigo-500 to-sky-400'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${Math.max(8, audioMeterLevel)}%` }}
                />
              </div>
            </div>

            {/* Close / Apply button */}
            <button
              onClick={() => {
                audioUtils.playPop();
                setShowVoiceMenu(false);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-fuchsia-950/50 active:scale-[0.98] transition-all"
            >
              Apply Voice & Continue Call
            </button>
          </div>
        </div>
      )}

      {/* Interactive Bottom Calling Controls Deck */}
      <div className="relative z-20 w-full max-w-xl mx-auto px-6 pb-8 pt-4">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-4 shadow-2xl shadow-black/60 flex items-center justify-around gap-2">
          {/* Mute Mic Toggle */}
          <button
            onClick={() => {
              audioUtils.playPop();
              onToggleMute();
            }}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex flex-col items-center gap-1 ${
              session.isMuted
                ? 'bg-rose-500 text-white shadow-rose-900/50 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={session.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {session.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-semibold">{session.isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Voice Changer Toggle Button */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setShowVoiceMenu(!showVoiceMenu);
            }}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex flex-col items-center gap-1 relative ${
              activeEffect === 'girl'
                ? 'bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-rose-950/60 ring-2 ring-rose-400/50 scale-105'
                : activeEffect === 'boy'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-950/60 ring-2 ring-indigo-400/50 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title="Open Voice Changer Menu"
          >
            <Wand2 className="w-5 h-5" />
            <span className="text-[9px] font-semibold">
              {activeEffect === 'girl' ? 'Girl FX' : activeEffect === 'boy' ? 'Boy FX' : 'Voice FX'}
            </span>
            {activeEffect !== 'original' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            )}
          </button>

          {/* Camera Video Toggle */}
          <button
            onClick={() => {
              audioUtils.playPop();
              onToggleVideo();
            }}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex flex-col items-center gap-1 ${
              session.isVideoOff
                ? 'bg-amber-500 text-white shadow-amber-900/50'
                : isVideo
                ? 'bg-fuchsia-600 text-white shadow-fuchsia-900/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={session.isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {session.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="text-[9px] font-semibold">{session.isVideoOff ? 'Cam Off' : 'Video'}</span>
          </button>

          {/* Camera Flip (Video mode only) */}
          {isVideo && (
            <button
              onClick={() => {
                audioUtils.playPop();
                onFlipCamera();
              }}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all shadow-md flex flex-col items-center gap-1"
              title="Flip Camera"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Flip</span>
            </button>
          )}

          {/* Speakerphone Toggle */}
          <button
            onClick={() => {
              audioUtils.playPop();
              onToggleSpeaker();
            }}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex flex-col items-center gap-1 ${
              session.isSpeakerOn
                ? 'bg-indigo-600 text-white shadow-indigo-900/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={session.isSpeakerOn ? 'Speaker On' : 'Earpiece Mode'}
          >
            {session.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="text-[9px] font-semibold">{session.isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              audioUtils.playPop();
              onEndCall();
            }}
            className="p-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold shadow-xl shadow-rose-950/60 hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-1"
            title="End Active Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[9px] font-bold">End</span>
          </button>
        </div>
      </div>
    </div>
  );
};

