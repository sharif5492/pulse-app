import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, MessageCircle, Share2, Bookmark, Music, Volume2, 
  VolumeX, Play, Plus, Check, Send, X, MoreVertical, Sparkles, ChevronUp, ChevronDown 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export const ReelsFeed: React.FC = () => {
  const { 
    reels, 
    activeReelIndex, 
    setActiveReelIndex, 
    isMuted, 
    toggleMute, 
    toggleLikeReel, 
    toggleBookmarkReel, 
    addReelComment, 
    toggleFollowUser 
  } = useApp();
  const { user } = useAuth();

  const [isPlaying, setIsPlaying] = useState(true);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentReel = reels[activeReelIndex] || reels[0];

  // Auto-play when active reel changes
  useEffect(() => {
    setIsPlaying(true);
    setExpandedCaption(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy might require mute
      });
    }
  }, [activeReelIndex]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentReel.isLiked) {
      toggleLikeReel(currentReel.id);
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  const handleNextReel = () => {
    if (activeReelIndex < reels.length - 1) {
      setActiveReelIndex(activeReelIndex + 1);
    }
  };

  const handlePrevReel = () => {
    if (activeReelIndex > 0) {
      setActiveReelIndex(activeReelIndex - 1);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addReelComment(currentReel.id, newCommentText);
    setNewCommentText('');
  };

  // Keyboard controls for up / down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentDrawerOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        handleNextReel();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        handlePrevReel();
      } else if (e.key === ' ' || e.key === 'm') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, commentDrawerOpen, reels.length]);

  if (!currentReel) return null;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] max-h-[860px] bg-slate-950 flex items-center justify-center overflow-hidden select-none">
      {/* Video Content Container */}
      <div 
        className="relative w-full h-full max-w-md bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center cursor-pointer"
        onClick={togglePlayPause}
        onDoubleClick={handleDoubleTap}
      >
        <video
          ref={videoRef}
          src={currentReel.videoUrl}
          poster={currentReel.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40 pointer-events-none" />

        {/* Big Double-Tap Animated Heart Burst */}
        {showHeartBurst && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
            <Heart className="w-28 h-28 text-fuchsia-500 fill-fuchsia-500 drop-shadow-2xl animate-bounce" />
          </div>
        )}

        {/* Play / Pause Indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-slate-950/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Play className="w-8 h-8 fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Top Sound Control & Reel Index indicator */}
        <div className="absolute top-14 left-4 z-20 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-white transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-fuchsia-400" />}
          </button>
          
          <span className="text-[11px] font-semibold text-white/90 bg-slate-950/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {activeReelIndex + 1} / {reels.length}
          </span>
        </div>

        {/* Right Action Rail */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4.5">
          {/* Creator Profile Avatar with Follow Plus button */}
          <div className="relative mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="w-11 h-11 rounded-full border-2 border-fuchsia-500 overflow-hidden shadow-lg hover:scale-105 transition-transform"
            >
              <img
                src={currentReel.user.avatar}
                alt={currentReel.user.name}
                className="w-full h-full object-cover"
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollowUser(currentReel.user.id);
              }}
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md transition-all ${
                currentReel.user.isFollowing
                  ? 'bg-slate-800 border border-slate-700 text-slate-300'
                  : 'bg-gradient-to-tr from-fuchsia-600 to-indigo-600 border border-white hover:scale-110'
              }`}
              title={currentReel.user.isFollowing ? "Following" : "Follow"}
            >
              {currentReel.user.isFollowing ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                <Plus className="w-3 h-3 stroke-[3]" />
              )}
            </button>
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLikeReel(currentReel.id);
              }}
              className={`p-2.5 rounded-full backdrop-blur-md transition-transform hover:scale-110 active:scale-90 ${
                currentReel.isLiked
                  ? 'bg-fuchsia-500/25 text-fuchsia-400'
                  : 'bg-slate-950/50 text-white hover:bg-slate-950/70'
              }`}
              aria-label="Like reel"
            >
              <Heart className={`w-6 h-6 ${currentReel.isLiked ? 'fill-fuchsia-500 stroke-fuchsia-500' : ''}`} />
            </button>
            <span className="text-[11px] font-semibold text-white mt-1 drop-shadow-md">
              {(currentReel.likesCount / 1000).toFixed(1)}k
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCommentDrawerOpen(true);
              }}
              className="p-2.5 rounded-full bg-slate-950/50 hover:bg-slate-950/70 text-white backdrop-blur-md transition-transform hover:scale-110"
              aria-label="Comments"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-white mt-1 drop-shadow-md">
              {currentReel.commentsCount}
            </span>
          </div>

          {/* Bookmark Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmarkReel(currentReel.id);
              }}
              className={`p-2.5 rounded-full backdrop-blur-md transition-transform hover:scale-110 ${
                currentReel.isBookmarked
                  ? 'bg-amber-500/25 text-amber-400'
                  : 'bg-slate-950/50 text-white hover:bg-slate-950/70'
              }`}
              aria-label="Bookmark reel"
            >
              <Bookmark className={`w-5 h-5 ${currentReel.isBookmarked ? 'fill-amber-400 stroke-amber-400' : ''}`} />
            </button>
            <span className="text-[11px] font-semibold text-white mt-1 drop-shadow-md">
              {currentReel.bookmarksCount}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2.5 rounded-full bg-slate-950/50 hover:bg-slate-950/70 text-white backdrop-blur-md transition-transform hover:scale-110 relative"
              aria-label="Share reel"
            >
              <Share2 className="w-5 h-5" />
              {shareSuccess && (
                <span className="absolute -left-20 top-1/2 -translate-y-1/2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                  Link Copied!
                </span>
              )}
            </button>
            <span className="text-[11px] font-semibold text-white mt-1 drop-shadow-md">
              Share
            </span>
          </div>

          {/* Rotating Vinyl Audio Disc */}
          <div className="relative mt-2">
            <div className={`w-9 h-9 rounded-full bg-slate-900 border-2 border-slate-700 overflow-hidden p-1 flex items-center justify-center shadow-lg ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
              <img
                src={currentReel.audioTrack.albumCover || currentReel.user.avatar}
                alt="Track Cover"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <Music className="w-3.5 h-3.5 text-fuchsia-400 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </div>

        {/* Bottom Metadata & Sound Track */}
        <div className="absolute left-4 right-18 bottom-4 z-20 space-y-2 pointer-events-auto">
          {/* Creator handle */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm drop-shadow-md">
              @{currentReel.user.username}
            </span>
            {currentReel.user.verified && (
              <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[9px] text-white font-black">
                ✓
              </span>
            )}
            <span className="text-white/70 text-xs">• {currentReel.viewsCount.toLocaleString()} views</span>
          </div>

          {/* Caption with See More */}
          <div className="text-xs text-white/95 leading-relaxed drop-shadow-md">
            <p className={expandedCaption ? '' : 'line-clamp-2'}>
              {currentReel.caption}
            </p>
            {currentReel.caption.length > 70 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCaption(!expandedCaption);
                }}
                className="text-white/70 font-semibold hover:text-white mt-0.5"
              >
                {expandedCaption ? 'less' : 'more'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {currentReel.tags.map((tag, idx) => (
              <span key={idx} className="text-[11px] font-semibold text-fuchsia-300 drop-shadow">
                {tag}
              </span>
            ))}
          </div>

          {/* Music Audio Track pill */}
          <div className="inline-flex items-center gap-2 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white max-w-full">
            <Music className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
            <div className="truncate text-[11px] font-medium">
              {currentReel.audioTrack.title} • {currentReel.audioTrack.artist}
            </div>
          </div>
        </div>

        {/* Up / Down Navigation Controls for Desktop */}
        <div className="hidden sm:flex flex-col gap-2 absolute left-4 top-1/2 -translate-y-1/2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevReel();
            }}
            disabled={activeReelIndex === 0}
            className="p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-white disabled:opacity-30 transition-colors"
            title="Previous Reel (Up Arrow)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextReel();
            }}
            disabled={activeReelIndex === reels.length - 1}
            className="p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-white disabled:opacity-30 transition-colors"
            title="Next Reel (Down Arrow)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Comments Sheet Drawer */}
      {commentDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setCommentDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 max-h-[70vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Comments</span>
                <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
                  {currentReel.comments.length}
                </span>
              </div>
              <button
                onClick={() => setCommentDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 max-h-[350px]">
              {currentReel.comments.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No comments yet. Be the first to start the conversation!
                </div>
              ) : (
                currentReel.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{comment.user.username}</span>
                        <span className="text-[10px] text-slate-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{comment.text}</p>
                    </div>
                    <button className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-fuchsia-400 shrink-0">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[9px]">{comment.likes}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt="User"
                className="w-7 h-7 rounded-full object-cover"
              />
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment on Pulse..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="p-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-40 rounded-full text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
