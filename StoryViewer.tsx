import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles, Trash2, Plus, Eye, Music, Disc } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export const StoryViewer: React.FC = () => {
  const { 
    stories, 
    activeStoryIndex, 
    closeStoryViewer, 
    sendDirectMessage, 
    conversations,
    openCreateModal,
    deleteStoryItem
  } = useApp();
  const { user } = useAuth();

  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const currentItem = currentStory && currentStory.items ? currentStory.items[itemIndex] : null;
  const isOwnStory = !!(currentStory && (currentStory.id === 'story_me' || (user && currentStory.user?.id === user.id)));

  // Reset item index whenever active story changes
  useEffect(() => {
    setItemIndex(0);
    setProgress(0);
    progressRef.current = 0;
    setIsLiked(false);
  }, [activeStoryIndex]);

  // Synchronize story audio track
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (currentItem?.audioTrack?.url) {
      audioEl.src = currentItem.audioTrack.url;
      audioEl.currentTime = 0;
      audioEl.muted = isMuted;
      if (!isPaused) {
        audioEl.play().catch((err) => {
          console.warn('Autoplay audio notice:', err);
        });
      }
    } else {
      audioEl.pause();
      audioEl.src = '';
    }

    return () => {
      audioEl.pause();
    };
  }, [currentItem, activeStoryIndex, itemIndex]);

  // Handle pause / unpause on audio
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !currentItem?.audioTrack?.url) return;

    if (isPaused) {
      audioEl.pause();
    } else if (!isMuted) {
      audioEl.play().catch(() => {});
    }
  }, [isPaused, isMuted, currentItem]);

  // Handle mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Story playback timer
  useEffect(() => {
    if (!currentStory || !currentItem || isPaused) return;

    progressRef.current = 0;
    setProgress(0);

    const durationMs = (currentItem.duration || 5) * 1000;
    const intervalTime = 50;
    const step = (intervalTime / durationMs) * 100;

    const interval = setInterval(() => {
      progressRef.current += step;
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        setProgress(0);
        // Advance to next item in this story or next story
        if (itemIndex < currentStory.items.length - 1) {
          setItemIndex((i) => i + 1);
        } else if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
          // Next story
          setItemIndex(0);
        } else {
          closeStoryViewer();
        }
      } else {
        setProgress(progressRef.current);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentStory, currentItem, itemIndex, activeStoryIndex, isPaused, stories.length, closeStoryViewer]);

  if (!currentStory || !currentItem) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
      setProgress(0);
    } else if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (itemIndex < currentStory.items.length - 1) {
      setItemIndex((i) => i + 1);
      setProgress(0);
    } else {
      closeStoryViewer();
    }
  };

  const handleDeleteCurrentSnap = () => {
    if (deleteStoryItem && currentItem) {
      deleteStoryItem(currentItem.id);
      if (currentStory.items.length <= 1) {
        closeStoryViewer();
      } else {
        setItemIndex(Math.max(0, itemIndex - 1));
        setProgress(0);
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.85, x: 0.8 },
          colors: ['#c026d3', '#6366f1', '#ec4899', '#a855f7'],
        });
      } catch (e) {}
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const targetConv = conversations.find((c) => c.participant.id === currentStory.user.id);
    if (targetConv) {
      sendDirectMessage(targetConv.id, `Replied to story: "${replyText}"`);
    }

    setReplyText('');
    closeStoryViewer();
  };

  const isVideo = currentItem.type === 'video' || currentItem.url.includes('.mp4') || currentItem.url.includes('mixkit');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-150">
      {/* Hidden audio element for story music playback */}
      <audio ref={audioRef} playsInline loop className="hidden" />

      <div 
        className="relative w-full max-w-md h-full sm:h-[90vh] sm:max-h-[850px] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex flex-col justify-between select-none border border-slate-800/80"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Story Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {currentStory.items.map((item, idx) => (
            <div key={item.id || idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all ease-linear"
                style={{
                  width:
                    idx < itemIndex
                      ? '100%'
                      : idx === itemIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header (User Info, Delete, Audio Mute & Close) */}
        <div className="absolute top-8 left-0 right-0 z-20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={isOwnStory ? user?.avatar || currentStory.user.avatar : currentStory.user.avatar}
              alt={currentStory.user.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-fuchsia-500/60 shadow-md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {isOwnStory ? 'Your Story' : currentStory.user.username}
                </span>
                {currentStory.user.verified && !isOwnStory && (
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[9px] text-white font-black">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/70">{currentItem.timestamp}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Mute / Unmute Toggle */}
            {currentItem.audioTrack && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-full backdrop-blur-md transition-all ${
                  isMuted 
                    ? 'bg-slate-950/60 text-slate-400 hover:text-white' 
                    : 'bg-fuchsia-600/70 text-white shadow-lg shadow-fuchsia-600/30'
                }`}
                title={isMuted ? 'Unmute Story Music' : 'Mute Story Music'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
              </button>
            )}

            {isOwnStory && (
              <button
                onClick={handleDeleteCurrentSnap}
                className="p-2 text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 rounded-full backdrop-blur-md transition-colors"
                title="Delete this snapshot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeStoryViewer}
              className="p-2 text-white/80 hover:text-white bg-slate-950/40 hover:bg-slate-950/70 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Background */}
        <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center">
          {isVideo ? (
            <video
              src={currentItem.url}
              autoPlay
              playsInline
              muted={!!currentItem.audioTrack || isMuted}
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentItem.url}
              alt="Story media"
              className="w-full h-full object-cover"
            />
          )}
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />
        </div>

        {/* Music Sticker Badge (if story has background music) */}
        {currentItem.audioTrack && (
          <div className="absolute top-20 left-4 z-20 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-xl">
              <div className="relative flex items-center justify-center">
                <Disc className={`w-4 h-4 text-fuchsia-400 ${!isPaused && !isMuted ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                <span className="absolute w-1.5 h-1.5 rounded-full bg-slate-950" />
              </div>
              <div className="flex items-center gap-1 overflow-hidden max-w-[200px]">
                <span className="font-semibold text-white truncate">{currentItem.audioTrack.title}</span>
                <span className="text-white/60 text-[10px] truncate">• {currentItem.audioTrack.artist}</span>
              </div>
              {!isPaused && !isMuted && (
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 h-full bg-fuchsia-400 animate-pulse rounded-full" />
                  <span className="w-0.5 h-2/3 bg-indigo-400 animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-4/5 bg-pink-400 animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tap areas for navigation */}
        <div className="absolute inset-y-16 inset-x-0 z-10 grid grid-cols-2">
          <div onClick={handlePrev} className="cursor-pointer" />
          <div onClick={handleNext} className="cursor-pointer" />
        </div>

        {/* Caption (if any) */}
        {currentItem.caption && (
          <div className="absolute bottom-20 left-0 right-0 z-20 px-4 text-center">
            <p className="inline-block bg-slate-950/70 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-medium text-white shadow-lg border border-white/10">
              {currentItem.caption}
            </p>
          </div>
        )}

        {/* Bottom Bar: Interactions or Own Story Tools */}
        <div className="relative z-20 p-4 pb-6 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex items-center gap-3">
          {isOwnStory ? (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Active Story • {currentStory.items.length} {currentStory.items.length === 1 ? 'snap' : 'snaps'}</span>
              </div>
              <button
                onClick={() => {
                  closeStoryViewer();
                  openCreateModal('story');
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 rounded-full text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Snap</span>
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${currentStory.user.username}...`}
                  className="w-full bg-white/10 hover:bg-white/20 focus:bg-white/20 border border-white/20 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-fuchsia-400 backdrop-blur-md transition-all"
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    className="p-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 rounded-full text-white shadow-md transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              <button
                onClick={handleLike}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                  isLiked
                    ? 'bg-fuchsia-500/30 border-fuchsia-500 text-fuchsia-400 scale-110'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
                aria-label="Like story"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-fuchsia-500' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
