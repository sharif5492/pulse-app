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
    deleteDirectMessage,
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Message action sheet state (Delete / Copy)
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<any | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Full-size image preview state
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  // Real voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const stopAudioFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Focus input when entering conversation
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, [activeConversation?.id]);

  // Cleanup audio tracks and player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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

  // Real Gallery Mobile File Picker with automatic compression and server upload
  const handleGalleryClick = () => {
    if (isBlocked) return;
    galleryInputRef.current?.click();
  };

  // Helper: Compress client image before upload for fast, crisp delivery and low memory usage
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Helper: Upload media file to server endpoint for real persistent URLs
  const uploadMediaToServer = async (base64Data: string, type: 'image' | 'audio', ext?: string): Promise<string> => {
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64Data, type, ext }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('Server media upload fallback notice:', err);
    }
    return base64Data; // fallback to inline base64 if network upload fails
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file from your gallery');
      return;
    }

    try {
      audioUtils.playPop();
      // 1. Compress image to optimal web dimensions
      const compressedDataUrl = await compressImage(file);
      // 2. Upload to server to obtain permanent real media URL
      const realImageUrl = await uploadMediaToServer(compressedDataUrl, 'image', 'jpg');

      // 3. Send message with real image URL
      sendDirectMessage(
        activeConversation.id,
        'Photo',
        'image',
        realImageUrl
      );
    } catch (err) {
      console.error('Failed to send image:', err);
    }

    e.target.value = '';
  };

  // Real Voice Recording with MediaRecorder
  const handleStartVoiceRecording = async () => {
    if (isBlocked) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Test codecs starting with MP4 for maximum iOS/Safari & Android compatibility, then WebM
      const mimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac', 'audio/ogg;codecs=opus'];
      const supportedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = supportedMime 
        ? new MediaRecorder(stream, { mimeType: supportedMime }) 
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      audioUtils.playPop();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone permission is required to record real voice notes. Please grant microphone access.');
    }
  };

  const handleCancelVoiceRecording = () => {
    audioUtils.playPop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const handleSendVoiceRecording = () => {
    if (isBlocked) return;
    const duration = Math.max(1, recordingSeconds);
    audioUtils.playPop();
    setIsRecordingVoice(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';
          
          // Upload audio to server for permanent, seekable stream URL compatible with Desktop and PWA
          const realAudioUrl = await uploadMediaToServer(base64Audio, 'audio', ext);

          sendDirectMessage(
            activeConversation.id,
            `Voice Note (0:${duration < 10 ? `0${duration}` : duration})`,
            'audio',
            realAudioUrl,
            duration
          );
        };
        reader.readAsDataURL(recordedBlob);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  // Real Voice Note Playback with Universal Browser / PWA Audio Support
  const handleToggleVoicePlayback = async (msg: any) => {
    if (activePlayingId === msg.id) {
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch (e) {}
        audioPlayerRef.current = null;
      }
      if (stopAudioFnRef.current) {
        stopAudioFnRef.current();
        stopAudioFnRef.current = null;
      }
      setActivePlayingId(null);
      return;
    }

    // Stop currently playing
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch (e) {}
      audioPlayerRef.current = null;
    }
    if (stopAudioFnRef.current) {
      stopAudioFnRef.current();
      stopAudioFnRef.current = null;
    }

    if (!msg.mediaUrl) {
      // Fallback timer if no audio URL attached
      setActivePlayingId(msg.id);
      const timer = setTimeout(() => {
        setActivePlayingId(null);
      }, (msg.audioDuration || 4) * 1000);
      stopAudioFnRef.current = () => clearTimeout(timer);
      return;
    }

    setActivePlayingId(msg.id);

    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audioPlayerRef.current = audio;

      let isFinished = false;

      const cleanup = () => {
        if (!isFinished) {
          isFinished = true;
          setActivePlayingId((current) => (current === msg.id ? null : current));
          audioPlayerRef.current = null;
        }
      };

      audio.onended = cleanup;

      // Web Audio API fallback if HTML5 Audio fails or is restricted in PWA
      const tryWebAudioFallback = async () => {
        try {
          const res = await fetch(msg.mediaUrl);
          const arrayBuffer = await res.arrayBuffer();
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            cleanup();
            return;
          }
          const ctx = new AudioContextClass();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.connect(ctx.destination);
          source.onended = () => {
            cleanup();
            try { ctx.close(); } catch (e) {}
          };
          source.start(0);
          stopAudioFnRef.current = () => {
            try { source.stop(); } catch (e) {}
            try { ctx.close(); } catch (e) {}
          };
        } catch (webaudioErr) {
          console.error('Web Audio API playback failed:', webaudioErr);
          cleanup();
        }
      };

      audio.onerror = (e) => {
        console.warn('HTML5 Audio error in PWA, switching to Web Audio API fallback:', e);
        tryWebAudioFallback();
      };

      audio.src = msg.mediaUrl;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn('Audio play rejection, trying Web Audio API:', playErr);
          tryWebAudioFallback();
        });
      }

      stopAudioFnRef.current = () => {
        cleanup();
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
      };
    } catch (err) {
      console.error('Voice playback error:', err);
      setActivePlayingId(null);
    }
  };

  // Touch-and-Hold / Long-press to Delete Message
  const handleMessageTouchStart = (msg: any) => {
    longPressTimerRef.current = setTimeout(() => {
      audioUtils.playPop();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      setSelectedMessageForAction(msg);
    }, 450);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteSelectedMessage = () => {
    if (!selectedMessageForAction) return;
    deleteDirectMessage(activeConversation.id, selectedMessageForAction.id);
    setSelectedMessageForAction(null);
  };

  const handleCall = (type: 'audio' | 'video') => {
    audioUtils.playPop();
    if (isBlocked) return;
    startCall(activeConversation.participant, type);
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="shrink-0 p-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
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
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5 no-scrollbar">
        <div className="text-center py-4 space-y-1">
          <img
            src={activeConversation.participant.avatar}
            alt={activeConversation.participant.name}
            className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-slate-700 shadow-md"
          />
          <h4 className="text-sm font-bold text-white">{activeConversation.participant.name}</h4>
          <p className="text-[11px] text-slate-500">Pulse verified creator • End-to-end encrypted</p>
        </div>

        {activeConversation.messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.id || msg.senderId === 'usr_current';
          const isAudio = msg.mediaType === 'audio' || msg.text?.includes('Voice Note');
          const isImage = msg.mediaType === 'image';
          const isPlayingThisAudio = activePlayingId === msg.id;

          return (
            <div
              key={`${msg.id}-${idx}`}
              className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <img
                  src={activeConversation.participant.avatar}
                  alt={activeConversation.participant.name}
                  className="w-6 h-6 rounded-full object-cover mb-1 shrink-0"
                />
              )}

              {/* Message delete quick trigger for me */}
              {isMe && (
                <button
                  type="button"
                  onClick={() => setSelectedMessageForAction(msg)}
                  className="opacity-0 group-hover:opacity-80 hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded-full"
                  title="Message options"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                onTouchStart={() => handleMessageTouchStart(msg)}
                onTouchEnd={handleMessageTouchEnd}
                onTouchMove={handleMessageTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessageForAction(msg);
                }}
                className={`max-w-[78%] sm:max-w-xs rounded-2xl p-3 shadow-md select-none transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-br-none active:scale-[0.99]'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none active:scale-[0.99]'
                }`}
              >
                {/* Image Message Component */}
                {isImage && (
                  <div 
                    className="space-y-1.5 mb-2 overflow-hidden rounded-xl cursor-pointer"
                    onClick={() => msg.mediaUrl && setEnlargedImageUrl(msg.mediaUrl)}
                  >
                    {msg.mediaUrl ? (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared photo"
                        className="w-full max-h-64 object-cover rounded-xl border border-white/10 hover:opacity-95 transition-opacity"
                        loading="lazy"
                        onError={(e) => {
                          console.warn('Image rendering error for URL:', msg.mediaUrl);
                        }}
                      />
                    ) : (
                      <div className="w-48 h-32 bg-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 border border-white/10 p-3">
                        <Image className="w-5 h-5 text-fuchsia-400 animate-pulse" />
                        <span>Loading photo...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Note Audio Component */}
                {isAudio ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVoicePlayback(msg);
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                          isMe
                            ? 'bg-white text-fuchsia-600 shadow-sm'
                            : 'bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white shadow-sm'
                        }`}
                        title={isPlayingThisAudio ? 'Pause Voice Note' : 'Play Real Voice Note'}
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
                          <span>{msg.text || 'Voice Note'}</span>
                          <span>
                            {isPlayingThisAudio 
                              ? 'Playing...' 
                              : (msg.audioDuration ? `0:${msg.audioDuration < 10 ? '0' + msg.audioDuration : msg.audioDuration}` : 'Voice')}
                          </span>
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

              {/* Message delete quick trigger for incoming message */}
              {!isMe && (
                <button
                  type="button"
                  onClick={() => setSelectedMessageForAction(msg)}
                  className="opacity-0 group-hover:opacity-80 hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded-full"
                  title="Message options"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
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
            type="button"
            onClick={handleCancelVoiceRecording}
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
            title="Cancel voice recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 flex-1 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
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
            type="button"
            onClick={handleSendVoiceRecording}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 rounded-full text-white text-xs font-bold shadow-lg shadow-fuchsia-950/40 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Voice</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="shrink-0 z-30 p-2.5 sm:p-3 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          {/* Native Mobile Gallery File Input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileSelect}
          />

          {/* Open Real Mobile Gallery Button */}
          <button
            type="button"
            onClick={handleGalleryClick}
            className="p-2.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors shrink-0 active:scale-90"
            title="Open Mobile Gallery"
          >
            <Image className="w-4 h-4" />
          </button>

          {/* Real Microphone Recording Button */}
          <button
            type="button"
            onClick={handleStartVoiceRecording}
            className="p-2.5 text-fuchsia-400 hover:text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-full transition-colors shrink-0 active:scale-90"
            title="Record Real Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              id="chat-message-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
              }}
              placeholder={`Message @${activeConversation.participant.username || activeConversation.participant.name}...`}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-fuchsia-500 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-40 rounded-full text-white shadow-md transition-all shrink-0 active:scale-95"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Message Action Sheet Modal (Delete / Copy) */}
      {selectedMessageForAction && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedMessageForAction(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Message Options
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedMessageForAction(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 max-h-24 overflow-y-auto">
              {selectedMessageForAction.mediaType === 'image' && (
                <p className="flex items-center gap-1.5 text-fuchsia-400 font-medium">
                  <Image className="w-3.5 h-3.5" /> Photo Attachment
                </p>
              )}
              {selectedMessageForAction.mediaType === 'audio' && (
                <p className="flex items-center gap-1.5 text-fuchsia-400 font-medium">
                  <Mic className="w-3.5 h-3.5" /> Voice Note
                </p>
              )}
              {selectedMessageForAction.text && (
                <p className="break-words mt-1">{selectedMessageForAction.text}</p>
              )}
            </div>

            <div className="space-y-2">
              {selectedMessageForAction.text && selectedMessageForAction.mediaType !== 'image' && selectedMessageForAction.mediaType !== 'audio' && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMessageForAction.text) {
                      navigator.clipboard?.writeText(selectedMessageForAction.text);
                      setSelectedMessageForAction(null);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  Copy Text
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteSelectedMessage}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-950/50 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete Message
              </button>

              <button
                type="button"
                onClick={() => setSelectedMessageForAction(null)}
                className="w-full py-2 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Fullscreen Image Preview Modal */}
      {enlargedImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <button 
            type="button"
            onClick={() => setEnlargedImageUrl(null)}
            className="absolute top-5 right-5 p-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img 
            src={enlargedImageUrl} 
            alt="Enlarged photo" 
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
