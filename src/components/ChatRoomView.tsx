import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Send, Image, Mic, MoreVertical, Phone, 
  Video, Smile, CheckCheck, Play, Pause, Sparkles, Trash2, X,
  ShieldAlert, UserCheck, UserX, User as UserIcon, BellOff, Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { audioUtils } from '../lib/audioUtils';
import { UserStatusBadge } from './UserStatusBadge';

export const ChatRoomView: React.FC = () => {
  const { 
    activeConversation, 
    closeConversation, 
    sendDirectMessage, 
    startCall,
    isUserBlocked,
    toggleBlockUser,
    unblockUser,
    viewProfileUser,
    isUserOnline
  } = useApp();
  const { user } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopAudioFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Handle voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecordingVoice]);

  if (!activeConversation) return null;

  const isBlocked = isUserBlocked(activeConversation.participant.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isBlocked) return;
    
    audioUtils.playPop();
    sendDirectMessage(activeConversation.id, inputMessage);
    setInputMessage('');

    // Simulate friend replying
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        sendDirectMessage(activeConversation.id, `Sounds awesome! Catch you on the Pulse stream! 🚀`);
      }, 2000);
    }, 1200);
  };

  const handleStartVoiceRecording = () => {
    if (isBlocked) return;
    audioUtils.playPop();
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
  };

  const handleCancelVoiceRecording = () => {
    audioUtils.playPop();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoiceRecording = () => {
    if (isBlocked) return;
    const duration = Math.max(2, recordingSeconds);
    audioUtils.playPop();
    setIsRecordingVoice(false);
    
    sendDirectMessage(
      activeConversation.id,
      `Voice Note (0:${duration < 10 ? `0${duration}` : duration})`,
      'audio'
    );

    // Simulate friend response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        sendDirectMessage(
          activeConversation.id,
          'Heard your audio! Love that new beat idea 🎧',
          'text'
        );
      }, 2400);
    }, 1500);
  };

  const handleToggleVoicePlayback = (msgId: string, durationSec: number = 4) => {
    if (activePlayingId === msgId) {
      if (stopAudioFnRef.current) {
        stopAudioFnRef.current();
      }
      setActivePlayingId(null);
    } else {
      if (stopAudioFnRef.current) {
        stopAudioFnRef.current();
      }
      setActivePlayingId(msgId);
      stopAudioFnRef.current = audioUtils.playVoiceNotePlayback(durationSec, () => {
        setActivePlayingId(null);
      });
    }
  };

  const handleSendQuickImage = () => {
    if (isBlocked) return;
    audioUtils.playPop();
    sendDirectMessage(
      activeConversation.id,
      'Shared a new moodboard snapshot',
      'image'
    );
  };

  const handleCall = (type: 'audio' | 'video') => {
    audioUtils.playPop();
    if (isBlocked) return;
    startCall(activeConversation.participant, type);
  };

  return (
    <div className="w-full max-w-xl mx-auto h-[calc(100vh-68px)] max-h-[860px] flex flex-col bg-slate-950 sm:border border-slate-800 sm:rounded-3xl overflow-hidden select-none">
      {/* Top Header */}
      <div className="relative p-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={closeConversation}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            aria-label="Back to DMs list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div 
            className="relative cursor-pointer group"
            onClick={() => {
              audioUtils.playPop();
              viewProfileUser(activeConversation.participant);
            }}
          >
            <img
              src={activeConversation.participant.avatar}
              alt={activeConversation.participant.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-700 group-hover:border-fuchsia-500 transition-colors"
            />
            {!isBlocked && (
              <UserStatusBadge
                isOnline={isUserOnline(activeConversation.participant.id) ?? activeConversation.isOnline}
                size="xs"
                className="absolute bottom-0 right-0"
              />
            )}
            {isBlocked && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[7px] text-white">
                ✕
              </span>
            )}
          </div>

          <div 
            className="cursor-pointer"
            onClick={() => {
              audioUtils.playPop();
              viewProfileUser(activeConversation.participant);
            }}
          >
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-white hover:text-fuchsia-400 transition-colors">
                {activeConversation.participant.name}
              </span>
              {activeConversation.participant.verified && (
                <span className="text-[9px] text-fuchsia-400 font-bold">✓</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {isBlocked ? (
                <span className="text-rose-400 font-medium">Blocked</span>
              ) : isTyping ? (
                <span className="text-fuchsia-400 font-medium animate-pulse">Typing...</span>
              ) : (isUserOnline(activeConversation.participant.id) ?? activeConversation.isOnline) ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  Active now
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400">
          {/* Real-time WebRTC Audio Call */}
          <button 
            onClick={() => handleCall('audio')}
            disabled={isBlocked}
            className={`p-2 rounded-full transition-colors group relative ${
              isBlocked 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:text-white hover:bg-slate-800'
            }`}
            title={isBlocked ? 'User is blocked' : 'Start Audio Call'}
            aria-label="Start Audio Call"
          >
            <Phone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Real-time WebRTC Video Call */}
          <button 
            onClick={() => handleCall('video')}
            disabled={isBlocked}
            className={`p-2 rounded-full transition-colors group relative ${
              isBlocked 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:text-white hover:bg-slate-800'
            }`}
            title={isBlocked ? 'User is blocked' : 'Start Video Call'}
            aria-label="Start Video Call"
          >
            <Video className="w-4 h-4 text-fuchsia-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Dropdown Options Menu */}
          <div className="relative">
            <button
              onClick={() => {
                audioUtils.playPop();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-2 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="More Chat Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl space-y-1 z-30 animate-in fade-in">
                <button
                  onClick={() => {
                    audioUtils.playPop();
                    setIsMenuOpen(false);
                    viewProfileUser(activeConversation.participant);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>View Profile</span>
                </button>

                <button
                  onClick={() => {
                    audioUtils.playPop();
                    setIsMenuOpen(false);
                    toggleBlockUser(activeConversation.participant);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                    isBlocked
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  {isBlocked ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unblock User</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Block User</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blocked User Top Warning Banner */}
      {isBlocked && (
        <div className="p-3 bg-rose-950/60 border-b border-rose-500/30 flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-xs text-rose-200 truncate">
              You have blocked <span className="font-bold">@{activeConversation.participant.username}</span>. Messages and calls are disabled.
            </p>
          </div>
          <button
            onClick={() => {
              audioUtils.playPop();
              unblockUser(activeConversation.participant.id);
            }}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-md"
          >
            Unblock
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div className="text-center py-4 space-y-1">
          <img
            src={activeConversation.participant.avatar}
            alt={activeConversation.participant.name}
            className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-slate-700 shadow-md"
          />
          <h4 className="text-sm font-bold text-white">{activeConversation.participant.name}</h4>
          <p className="text-[11px] text-slate-500">Pulse verified creator • End-to-end encrypted</p>
        </div>

        {activeConversation.messages.map((msg) => {
          const isMe = msg.senderId === user?.id || msg.senderId === 'usr_current';
          const isAudio = msg.mediaType === 'audio' || msg.text.includes('Voice Note');
          const isImage = msg.mediaType === 'image';
          const isPlayingThisAudio = activePlayingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <img
                  src={activeConversation.participant.avatar}
                  alt={activeConversation.participant.name}
                  className="w-6 h-6 rounded-full object-cover mb-1 shrink-0"
                />
              )}

              <div
                className={`max-w-[78%] sm:max-w-xs rounded-2xl p-3 shadow-md ${
                  isMe
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}
              >
                {/* Image Message Component */}
                {isImage && (
                  <div className="space-y-1.5 mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80"
                      alt="Shared snapshot"
                      className="w-full h-36 rounded-xl object-cover border border-white/10"
                    />
                  </div>
                )}

                {/* Voice Note Audio Component */}
                {isAudio ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleToggleVoicePlayback(msg.id, 5)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                          isMe
                            ? 'bg-white text-fuchsia-600 shadow-sm'
                            : 'bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white shadow-sm'
                        }`}
                      >
                        {isPlayingThisAudio ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 space-y-1">
                        {/* Audio Waveform visualization */}
                        <div className="flex items-center gap-0.5 h-4">
                          {[30, 70, 45, 90, 60, 100, 50, 80, 40, 65, 30, 85, 45].map((h, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full transition-all duration-300 ${
                                isMe ? 'bg-white/80' : 'bg-fuchsia-400'
                              } ${isPlayingThisAudio ? 'animate-pulse' : ''}`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] opacity-80">
                          <span>{msg.text}</span>
                          <span>{isPlayingThisAudio ? 'Playing' : '0:05'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                )}

                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-white/90" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && !isBlocked && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping" />
          <span className="text-[11px] text-fuchsia-300">
            {activeConversation.participant.name} is typing...
          </span>
        </div>
      )}

      {/* Voice Recording Active Bar OR Input Form */}
      {isBlocked ? (
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center space-y-1 text-slate-500">
          <p className="text-xs font-semibold text-slate-400">
            You cannot message @{activeConversation.participant.username} while they are blocked.
          </p>
          <button
            onClick={() => {
              audioUtils.playPop();
              unblockUser(activeConversation.participant.id);
            }}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
          >
            Unblock account to chat
          </button>
        </div>
      ) : isRecordingVoice ? (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 animate-in fade-in">
          <button
            onClick={handleCancelVoiceRecording}
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
            title="Cancel voice recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 flex-1 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-white">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </div>

            {/* Dynamic visualizer bars */}
            <div className="flex items-center gap-0.5 h-5 pl-2">
              {[20, 60, 40, 90, 50, 80, 100, 70, 45, 85, 30].map((h, idx) => (
                <span
                  key={idx}
                  className="w-1 bg-fuchsia-400 rounded-full animate-pulse"
                  style={{
                    height: `${(h * ((recordingSeconds % 3) + 1)) % 100}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSendVoiceRecording}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 rounded-full text-white text-xs font-bold shadow-lg shadow-fuchsia-950/40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Audio</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleSendQuickImage}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            title="Send image"
          >
            <Image className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleStartVoiceRecording}
            className="p-2 text-fuchsia-400 hover:text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-full transition-colors"
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Message or voice note on Pulse..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-40 rounded-full text-white shadow-md transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
