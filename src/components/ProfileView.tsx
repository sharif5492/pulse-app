import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, Grid, Heart, Bookmark, 
  Sparkles, Edit3, Share2, 
  Play, Camera, Mic, Volume2, Check, RefreshCw,
  BookmarkCheck, ArrowLeft,
  ShieldAlert, UserCheck, Phone, Video, MessageSquare,
  UserX, UserPlus, Lock, Clock, Copy
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Reel, User } from '../types';
import { EditProfileModal } from './EditProfileModal';
import { BlockedUsersModal } from './BlockedUsersModal';
import { audioUtils } from '../lib/audioUtils';
import { UserStatusBadge } from './UserStatusBadge';
import { optimizeAvatarImage, savePersistentAvatar, getPersistentAvatar } from '../lib/avatarStorage';
import { usersDiscoveryService } from '../lib/supabase';
import { areUserIdsEqual } from '../utils/userIdUtils';
import { ErrorBoundary } from './ErrorBoundary';

interface OtherUserProfileViewProps {
  targetUser: User;
  onBack: () => void;
}

export const OtherUserProfileView: React.FC<OtherUserProfileViewProps> = ({ targetUser, onBack }) => {
  const { 
    reels, 
    setActiveTab, 
    setActiveReelIndex, 
    isUserBlocked,
    toggleBlockUser,
    unblockUser,
    startCall,
    startChatWithUser,
    getConnectionStatusWith,
    sendConnectionRequest,
    acceptConnectionRequest,
    cancelConnectionRequest,
    isUserOnline,
  } = useApp();

  const [isFollowingTarget, setIsFollowingTarget] = useState(false);

  const safeTargetId = targetUser?.id || '';

  const [profileData, setProfileData] = useState<User>(() => {
    const rawId = targetUser?.id || '';
    const persistentAv = getPersistentAvatar(rawId);
    const localMatch = usersDiscoveryService.getStoredUsers().find((u) => areUserIdsEqual(u.id, rawId));
    const safeUname = (targetUser?.username && !targetUser.username.startsWith('usr_'))
      ? targetUser.username.replace(/^@/, '')
      : (localMatch?.username ? localMatch.username.replace(/^@/, '') : (targetUser?.username || `user_${rawId.replace(/^usr_/, '').slice(0, 8)}`));
    const safeNm = (targetUser?.name && !targetUser.name.startsWith('usr_') && !targetUser.name.includes('Pulse User'))
      ? targetUser.name
      : (localMatch?.name || (safeUname ? `@${safeUname}` : 'Pulse Member'));

    return {
      ...targetUser,
      name: safeNm,
      username: safeUname,
      avatar: targetUser?.avatar || localMatch?.avatar || persistentAv || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    };
  });

  useEffect(() => {
    const rawId = targetUser?.id;
    if (!rawId) return;

    usersDiscoveryService.lookupUser(rawId).then((found) => {
      if (found) {
        setProfileData((prev) => ({
          ...prev,
          name: (found.name && !found.name.startsWith('usr_')) ? found.name : prev.name,
          username: (found.username && !found.username.startsWith('usr_')) ? found.username.replace(/^@/, '') : prev.username,
          avatar: found.avatar || prev.avatar,
          bio: found.bio || prev.bio,
          verified: found.verified ?? prev.verified,
        }));
      }
    });
  }, [targetUser?.id]);

  const isBlocked = safeTargetId ? isUserBlocked(safeTargetId) : false;
  const isPrivate = Boolean(profileData?.isPrivate);
  const connInfo = safeTargetId 
    ? getConnectionStatusWith(safeTargetId) 
    : { status: 'none' as const, isIncoming: false, isOutgoing: false };
  const isConnected = connInfo.status === 'accepted' || isFollowingTarget;
  const isPendingOutgoing = connInfo.status === 'pending' && (connInfo.isOutgoing || !connInfo.isIncoming);
  const isPendingIncoming = connInfo.status === 'pending' && connInfo.isIncoming;

  const safeUsername = (profileData?.username || `user_${safeTargetId.replace(/^usr_/, '').slice(0, 8)}`).replace(/^@/, '');
  const safeName = profileData?.name || `@${safeUsername}` || 'Pulse Member';
  const safeAvatar = profileData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

  const fullTargetUser: User = {
    ...targetUser,
    ...profileData,
    id: safeTargetId,
    name: safeName,
    username: safeUsername,
    avatar: safeAvatar,
  };

  const creatorReels = (reels || []).filter(
    (r) =>
      r &&
      r.user &&
      ((safeTargetId && (r.user.id === safeTargetId || areUserIdsEqual(r.user.id, safeTargetId))) ||
        (safeUsername && r.user.username && r.user.username.toLowerCase() === safeUsername.toLowerCase()))
  );

  const handleStartTargetCall = (type: 'audio' | 'video') => {
    audioUtils.playPop();
    if (isBlocked) return;
    startCall(fullTargetUser, type);
  };

  const handleOpenTargetChat = () => {
    audioUtils.playPop();
    if (targetUser) {
      startChatWithUser(fullTargetUser);
    }
  };

  const handleConnectionButtonClick = () => {
    audioUtils.playPop();
    if (isPrivate) {
      if (isConnected) {
        setIsFollowingTarget(false);
        cancelConnectionRequest(safeTargetId);
      } else if (isPendingOutgoing) {
        cancelConnectionRequest(safeTargetId);
      } else if (isPendingIncoming) {
        acceptConnectionRequest(connInfo.connectionId || safeTargetId);
        setIsFollowingTarget(true);
      } else {
        sendConnectionRequest(fullTargetUser);
      }
    } else {
      setIsFollowingTarget((prev) => !prev);
      if (!isFollowingTarget) {
        sendConnectionRequest(fullTargetUser);
      } else {
        cancelConnectionRequest(safeTargetId);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-5 pb-24 text-slate-100 animate-in fade-in">
      {/* Top navigation header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            audioUtils.playPop();
            onBack();
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-fuchsia-400" />
          <span>Back to My Profile</span>
        </button>

        {/* Block / Unblock direct button */}
        <button
          onClick={() => {
            audioUtils.playPop();
            toggleBlockUser(targetUser);
          }}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isBlocked
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
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

      {/* Creator Profile Card */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-5 overflow-hidden shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={safeAvatar}
                alt={safeName}
                className="w-16 h-16 rounded-full object-cover border-2 border-fuchsia-500/80 shadow-md"
              />
              {!isBlocked && (
                <UserStatusBadge
                  isOnline={isUserOnline(safeTargetId)}
                  size="md"
                  className="absolute bottom-0 right-0 z-10"
                />
              )}
              {isBlocked && (
                <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-rose-400">
                  <Lock className="w-6 h-6" />
                </div>
              )}
              {isPrivate && !isBlocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center text-fuchsia-400 shadow">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white tracking-tight">{safeName}</h2>
                {targetUser.verified && (
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[9px] text-white font-black">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-slate-400">@{safeUsername}</span>
                {safeTargetId && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 select-all">
                    {safeTargetId}
                  </span>
                )}
                {isPrivate && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-fuchsia-400" />
                    Private
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {isBlocked ? (
                  <div className="flex items-center gap-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Blocked Account</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit">
                      <Sparkles className="w-3 h-3 text-fuchsia-400" />
                      <span>Pulse Creator</span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isUserOnline(safeTargetId)
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    }`}>
                      <UserStatusBadge isOnline={isUserOnline(safeTargetId)} size="xs" />
                      <span>{isUserOnline(safeTargetId) ? 'Online' : 'Offline'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Blocked Account Warning Banner */}
        {isBlocked && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>You have blocked @{safeUsername}</span>
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              They cannot message you, place audio/video calls, or view your shared reels and stories. You won't see their posts in your feed.
            </p>
            <button
              onClick={() => {
                audioUtils.playPop();
                unblockUser(safeTargetId);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Unblock @{safeUsername}</span>
            </button>
          </div>
        )}

        {/* Bio */}
        {targetUser.bio && (
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
            {targetUser.bio}
          </p>
        )}

        {/* Action Row for Unblocked Users */}
        {!isBlocked && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={handleConnectionButtonClick}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isPrivate
                  ? isConnected
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-750'
                    : isPendingOutgoing
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : isPendingIncoming
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white border-fuchsia-500/50 shadow-md shadow-fuchsia-600/20'
                  : isConnected
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  : 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white border-fuchsia-500/50 shadow-md shadow-fuchsia-600/20'
              }`}
            >
              {isPrivate ? (
                isConnected ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Connected</span>
                  </>
                ) : isPendingOutgoing ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="truncate">Requested</span>
                  </>
                ) : isPendingIncoming ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </>
                )
              ) : isConnected ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenTargetChat}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Send Message"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Message</span>
            </button>

            <button
              onClick={() => handleStartTargetCall('audio')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-xs font-bold text-white hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Start Audio Call"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call</span>
            </button>

            <button
              onClick={() => handleStartTargetCall('video')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-fuchsia-500/20 border border-slate-700 hover:border-fuchsia-500/40 text-xs font-bold text-white hover:text-fuchsia-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Start Video Call"
            >
              <Video className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Video</span>
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
          <div>
            <div className="text-sm font-bold text-white">
              {(((Number(targetUser.followersCount) || 12)) / 1000).toFixed(1)}k
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Followers</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">{Number(targetUser.followingCount) || 5}</div>
            <span className="text-[10px] text-slate-400 font-medium">Following</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {(((Number(targetUser.likesCount) || 28)) / 1000).toFixed(1)}k
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Likes</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {isBlocked ? (
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400">Content Hidden</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            You must unblock @{safeUsername} to view their reels, audio, and stories.
          </p>
        </div>
      ) : isPrivate && !isConnected ? (
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto text-fuchsia-400">
            <Lock className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-200">This Account is Private</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Follow or send a friend connection request to see @{safeUsername}'s photos, reels, and stories.
          </p>
          {!isPendingOutgoing && (
            <button
              onClick={handleConnectionButtonClick}
              className="mt-2 px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-fuchsia-600/25 hover:brightness-110 transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Send Connection Request</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Grid className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Posts & Reels ({creatorReels.length})</span>
          </h3>

          {creatorReels.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
              No reels uploaded by this creator yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {creatorReels.map((reel, idx) => (
                <div
                  key={`${reel.id}-${idx}`}
                  onClick={() => {
                    audioUtils.playPop();
                    const originalIndex = reels.findIndex((r) => r && r.id === reel.id);
                    if (originalIndex >= 0) setActiveReelIndex(originalIndex);
                    setActiveTab('reels');
                  }}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 cursor-pointer group shadow-lg"
                >
                  <img
                    src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600'}
                    alt={reel.caption || 'Pulse Reel'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-2.5">
                    <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                      {reel.caption || 'Reel'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-300">
                      <div className="flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>{((Number(reel.viewsCount) || 0) / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                        <span>{Number(reel.likesCount) || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MyProfileView: React.FC = () => {
  const { 
    reels, 
    savedPosts, 
    isBookmarksLoading, 
    refreshBookmarks, 
    toggleBookmarkReel, 
    setActiveTab, 
    setActiveReelIndex, 
    blockedUserIds,
    openUserSearchModal,
  } = useApp();
  const { user, openAuthModal, updateUserProfile } = useAuth();
  const directAvatarInputRef = useRef<HTMLInputElement>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<'reels' | 'liked' | 'saved' | 'audio'>('reels');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [isRefreshingBookmarks, setIsRefreshingBookmarks] = useState(false);
  const [avatarUploadNotice, setAvatarUploadNotice] = useState<string | null>(null);

  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioUtils.playCameraShutter();
      try {
        const optimized = await optimizeAvatarImage(file);
        if (optimized) {
          await updateUserProfile({ avatar: optimized });
          if (user?.id) {
            await savePersistentAvatar(user.id, optimized);
          }
          setAvatarUploadNotice('Profile photo updated!');
          setTimeout(() => setAvatarUploadNotice(null), 2500);
        }
      } catch (err) {
        console.warn('Direct avatar upload error:', err);
      }
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-fuchsia-500 shadow-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Sign in to Pulse</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Create reels, join live broadcast spaces, customize your profile, and connect with creators.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-fuchsia-600/30 hover:brightness-110 transition-all cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const deduplicate = (list: Reel[]): Reel[] => {
    const seen = new Set<string>();
    return list.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const myReels = deduplicate(
    (reels || []).filter(
      (r) => r && r.user && (r.user.id === user.id || r.user.id === 'usr_current' || areUserIdsEqual(r.user.id, user.id))
    )
  );
  const likedReels = deduplicate((reels || []).filter((r) => r && r.isLiked));
  
  const activeSavedList = deduplicate(
    savedPosts.length > 0 
      ? savedPosts 
      : reels.filter((r) => r.isBookmarked)
  );

  const handleShareProfile = () => {
    audioUtils.playPop();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleManualRefreshBookmarks = async () => {
    audioUtils.playPop();
    setIsRefreshingBookmarks(true);
    await refreshBookmarks();
    setTimeout(() => setIsRefreshingBookmarks(false), 600);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-5 pb-24 text-slate-100">
      {/* Native file input for photo gallery or camera avatar upload */}
      <input
        ref={directAvatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleDirectAvatarUpload}
        className="hidden"
        id="direct-profile-avatar-input"
        aria-label="Upload profile photo"
      />

      {avatarUploadNotice && (
        <div className="p-3 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span>{avatarUploadNotice}</span>
          </div>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Profile Header Card */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-5 overflow-hidden shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={user.avatar}
                alt={user.name}
                onClick={() => setIsEditModalOpen(true)}
                className="w-18 h-18 rounded-full object-cover border-2 border-fuchsia-500 shadow-md group-hover:opacity-90 transition-opacity cursor-pointer"
              />
              <button
                type="button"
                id="profile-header-camera-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  audioUtils.playPop();
                  directAvatarInputRef.current?.click();
                }}
                className="absolute bottom-0 right-0 p-1.5 bg-gradient-to-tr from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 rounded-full text-white shadow-md border-2 border-slate-900 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-20"
                title="Tap to take photo or choose from gallery"
                aria-label="Upload avatar image"
              >
                <Camera className="w-3 h-3" />
              </button>
              <div 
                onClick={() => setIsEditModalOpen(true)}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white tracking-tight">{user.name}</h2>
                {user.verified && (
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[9px] text-white font-black">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-xs font-medium text-slate-400">@{user.username}</span>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    audioUtils.playPop();
                    navigator.clipboard.writeText(user.id);
                    setCopiedUserId(true);
                    setTimeout(() => setCopiedUserId(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white hover:border-fuchsia-500/50 transition-colors cursor-pointer"
                  title="Click to copy your User ID for other mobiles to search"
                >
                  <span>ID: {user.id}</span>
                  {copiedUserId ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Status Badge & Blocked Quick Badge */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit">
                  <UserStatusBadge isOnline={true} size="xs" />
                  <span>Online (You)</span>
                </div>

                {blockedUserIds.length > 0 && (
                  <button
                    onClick={() => {
                      audioUtils.playPop();
                      setIsBlockedModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>{blockedUserIds.length} Blocked</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('camera')}
              className="p-2 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-400 border border-fuchsia-500/40 transition-colors cursor-pointer"
              title="Open Camera & Filters"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Settings & Privacy"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-xs text-slate-300 mt-3.5 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
            {user.bio}
          </p>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleShareProfile}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Find & Add Friends by ID or Username */}
        <button
          onClick={() => {
            audioUtils.playPop();
            openUserSearchModal();
          }}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-fuchsia-900/30 active:scale-[0.99] cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Find & Add Friends (Search ID)</span>
        </button>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div>
            <div className="text-sm font-bold text-white">
              {((Number(user.followersCount) || 0) / 1000).toFixed(1)}k
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Followers</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">{Number(user.followingCount) || 0}</div>
            <span className="text-[10px] text-slate-400 font-medium">Following</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {((Number(user.likesCount) || 0) / 1000000).toFixed(1)}M
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Total Likes</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-4 p-1 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveSubTab('reels');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'reels' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Reels</span>
        </button>

        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveSubTab('liked');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'liked' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Liked</span>
        </button>

        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveSubTab('saved');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'saved' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved</span>
        </button>

        <button
          onClick={() => {
            audioUtils.playPop();
            setActiveSubTab('audio');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'audio' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Audio</span>
        </button>
      </div>

      {/* Tab 1: My Reels Grid */}
      {activeSubTab === 'reels' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {myReels.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-850 p-4 space-y-2">
              <p>No reels posted yet.</p>
              <button
                onClick={() => setActiveTab('camera')}
                className="px-4 py-1.5 bg-fuchsia-600 text-white rounded-full font-bold text-xs hover:brightness-110 cursor-pointer"
              >
                Record First Reel
              </button>
            </div>
          ) : (
            myReels.map((reel, idx) => (
              <div
                key={`${reel.id}-${idx}`}
                onClick={() => {
                  audioUtils.playPop();
                  const originalIndex = reels.findIndex((r) => r && r.id === reel.id);
                  if (originalIndex >= 0) setActiveReelIndex(originalIndex);
                  setActiveTab('reels');
                }}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 cursor-pointer group shadow-lg"
              >
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-2.5">
                  <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                    {reel.caption}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-300">
                    <div className="flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>{((Number(reel.viewsCount) || 0) / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                      <span>{Number(reel.likesCount) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Liked Reels */}
      {activeSubTab === 'liked' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {likedReels.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-850 p-4">
              You haven't liked any reels yet.
            </div>
          ) : (
            likedReels.map((reel, idx) => (
              <div
                key={`${reel.id}-${idx}`}
                onClick={() => {
                  audioUtils.playPop();
                  const originalIndex = reels.findIndex((r) => r && r.id === reel.id);
                  if (originalIndex >= 0) setActiveReelIndex(originalIndex);
                  setActiveTab('reels');
                }}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 cursor-pointer group shadow-lg"
              >
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-2.5">
                  <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                    {reel.caption}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-300">
                    <div className="flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>{((Number(reel.viewsCount) || 0) / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                      <span>{Number(reel.likesCount) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Saved / Bookmarks Tab */}
      {activeSubTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <BookmarkCheck className="w-4 h-4 text-fuchsia-400" />
                <span>Saved Bookmarks ({activeSavedList.length})</span>
              </div>
              {isBookmarksLoading && (
                <span className="text-[10px] text-fuchsia-400 animate-pulse">Syncing...</span>
              )}
            </div>

            <button
              onClick={handleManualRefreshBookmarks}
              disabled={isRefreshingBookmarks}
              className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-750 transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Refresh Saved Bookmarks from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBookmarks ? 'animate-spin text-fuchsia-400' : ''}`} />
              <span className="text-[10px] font-medium hidden sm:inline">Refresh</span>
            </button>
          </div>

          {activeSavedList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-fuchsia-400/80">
                <Bookmark className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-300">No Saved Posts Yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Bookmark reels while browsing the feed to save them to your private collection.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('reels')}
                className="px-4 py-1.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-full font-bold text-xs shadow-md hover:brightness-110 cursor-pointer"
              >
                Browse Reels
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activeSavedList.map((reel, idx) => (
                <div
                  key={`${reel.id}-${idx}`}
                  onClick={() => {
                    audioUtils.playPop();
                    const originalIndex = reels.findIndex((r) => r && r.id === reel.id);
                    if (originalIndex >= 0) {
                      setActiveReelIndex(originalIndex);
                      setActiveTab('reels');
                    }
                  }}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 cursor-pointer group shadow-lg"
                >
                  <img
                    src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'}
                    alt={reel.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioUtils.playPop();
                      toggleBookmarkReel(reel.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-500/80 text-white backdrop-blur-md transition-colors opacity-90 group-hover:opacity-100 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-fuchsia-400 text-fuchsia-400 group-hover:text-white group-hover:fill-white" />
                  </button>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img
                        src={reel.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={reel.user?.name || 'Creator'}
                        className="w-4 h-4 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-[10px] text-slate-300 font-semibold truncate">
                        @{reel.user?.username || 'creator'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                      {reel.caption}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-300">
                      <div className="flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>{((Number(reel.viewsCount) || 0) / 1000).toFixed(0)}k</span>
                      </div>
                      <span className="text-[9px] text-indigo-300 font-semibold bg-indigo-500/20 px-1.5 py-0.2 rounded">
                        Bookmarked
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audio / Voice Notes */}
      {activeSubTab === 'audio' && (
        <div className="space-y-2.5">
          {[
            { title: 'Synthwave Night Loop #4', duration: '0:34', plays: '14.2k' },
            { title: 'Cyberpunk Tokyo Drift Audio', duration: '0:18', plays: '48.9k' },
            { title: 'Studio Live Modular Session', duration: '0:45', plays: '8.1k' },
          ].map((audio, i) => (
            <div
              key={i}
              className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-fuchsia-500/40 transition-colors cursor-pointer"
              onClick={() => audioUtils.playPop()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{audio.title}</div>
                  <div className="text-[10px] text-slate-400">{audio.duration} • {audio.plays} uses</div>
                </div>
              </div>
              <button className="px-3 py-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 rounded-full text-[10px] font-bold cursor-pointer">
                Use Sound
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Blocked Accounts Management Modal */}
      <BlockedUsersModal
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
      />
    </div>
  );
};

export const ProfileView: React.FC = () => {
  const { viewingProfileUser, viewProfileUser } = useApp();

  return (
    <ErrorBoundary
      key={viewingProfileUser ? `profile-${viewingProfileUser.id}` : 'my-profile'}
      onReset={() => viewProfileUser(null)}
      fallbackView={
        <div className="w-full max-w-md mx-auto px-4 py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Profile Loading Notice</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Unable to load this user's profile. Tap below to return to your profile.
          </p>
          <button
            onClick={() => viewProfileUser(null)}
            className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            Back to My Profile
          </button>
        </div>
      }
    >
      {viewingProfileUser ? (
        <OtherUserProfileView 
          targetUser={viewingProfileUser} 
          onBack={() => viewProfileUser(null)} 
        />
      ) : (
        <MyProfileView />
      )}
    </ErrorBoundary>
  );
};
