import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Reel, Story, LiveRoom, Conversation, NotificationItem, 
  TabType, LiveComment, LiveGift, ChatMessage, User,
  ActiveCallSession, CallType, CallSignalPayload,
  UserConnection, ConnectionStatus, VoiceEffect
} from '../types';
import { 
  MOCK_REELS, MOCK_STORIES, MOCK_LIVE_ROOMS, 
  MOCK_CONVERSATIONS, MOCK_NOTIFICATIONS, LIVE_GIFTS,
  MOCK_USERS
} from '../mockData';
import { useAuth } from './AuthContext';
import { 
  supabase, 
  postsService, 
  bookmarksService,
  blocksService,
  connectionsService,
  presenceService,
  insertNotificationInSupabase, 
  uploadMediaToStorage,
  fetchNotifications as apiFetchNotifications,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead 
} from '../lib/supabase';
import { webrtcService } from '../lib/webrtcService';
import { audioUtils } from '../lib/audioUtils';
import confetti from 'canvas-confetti';

export interface FloatingHeart {
  id: string;
  x: number;
  color: string;
  size: number;
}

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  reels: Reel[];
  activeReelIndex: number;
  setActiveReelIndex: (index: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  toggleLikeReel: (reelId: string) => void;
  toggleBookmarkReel: (reelId: string) => void;
  savedPosts: Reel[];
  isBookmarksLoading: boolean;
  refreshBookmarks: () => Promise<void>;
  addReelComment: (reelId: string, text: string) => void;
  toggleFollowUser: (userId: string) => void;
  stories: Story[];
  activeStoryIndex: number | null;
  openStoryViewer: (index: number) => void;
  closeStoryViewer: () => void;
  markStoryRead: (storyId: string) => void;
  addStory: (itemUrl: string, caption?: string) => void;
  liveRooms: LiveRoom[];
  activeLiveRoom: LiveRoom | null;
  openLiveRoom: (room: LiveRoom) => void;
  closeLiveRoom: () => void;
  liveComments: LiveComment[];
  sendLiveComment: (text: string) => void;
  sendLiveGift: (gift: LiveGift) => boolean;
  floatingHearts: FloatingHeart[];
  triggerLiveHeart: () => void;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  openConversation: (conv: Conversation) => void;
  closeConversation: () => void;
  sendDirectMessage: (convId: string, text: string, mediaType?: 'image' | 'video' | 'audio') => void;
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  unreadDMsCount: number;
  markNotifAsRead: (id: string) => void;
  markAllNotifsAsRead: () => void;
  activeToast: { id: string; title: string; message: string; type: 'live' | 'like' | 'message' | 'gift' } | null;
  dismissToast: () => void;
  createModalOpen: boolean;
  openCreateModal: (defaultType?: 'reel' | 'story' | 'live') => void;
  closeCreateModal: () => void;
  createReel: (videoUrl: string, caption: string, tags: string[], audioTitle: string, mediaFile?: File | Blob) => Promise<void>;
  startLiveBroadcast: (title: string, category: LiveRoom['category']) => void;
  uploadMedia: (file: File | Blob) => Promise<string | null>;
  refreshPosts: () => Promise<void>;
  isMobilePreviewFrame: boolean;
  toggleMobilePreviewFrame: () => void;
  // User Block & Privacy System
  blockedUserIds: string[];
  blockedUsers: User[];
  isUserBlocked: (userId: string) => boolean;
  blockUser: (targetUser: User) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  toggleBlockUser: (targetUser: User) => Promise<void>;
  // Connections & Friend Requests
  connections: UserConnection[];
  getConnectionStatusWith: (targetUserId: string) => { status: ConnectionStatus; isIncoming: boolean; isOutgoing: boolean; connectionId?: string };
  sendConnectionRequest: (targetUser: User) => Promise<void>;
  acceptConnectionRequest: (connectionIdOrUserId: string) => Promise<void>;
  declineConnectionRequest: (connectionIdOrUserId: string) => Promise<void>;
  cancelConnectionRequest: (targetUserId: string) => Promise<void>;
  refreshConnections: () => Promise<void>;
  // Profile Viewer
  viewingProfileUser: User | null;
  viewProfileUser: (targetUser: User | null) => void;
  // Real-time Presence & Online Status
  onlineUserIds: Set<string>;
  isUserOnline: (userId: string) => boolean;
  // WebRTC Audio & Video Calling
  activeCall: ActiveCallSession | null;
  incomingCall: ActiveCallSession | null;
  startCall: (participant: User, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallVideo: () => void;
  flipCallCamera: () => void;
  toggleSpeaker: () => void;
  setCallVoiceEffect: (effect: VoiceEffect) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapPostToReel(post: any): Reel {
  const userObj: User = post.user_metadata || (post.author_name ? {
    id: post.user_id || 'usr_db',
    name: post.author_name,
    username: post.author_username || 'pulse_creator',
    avatar: post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    followersCount: 120,
    followingCount: 45,
    likesCount: post.likes_count || 10,
    verified: true,
  } : {
    id: post.user_id || 'usr_creator',
    name: 'Pulse Creator',
    username: 'pulse_artist',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    followersCount: 350,
    followingCount: 88,
    likesCount: 150,
  });

  const rawTags = post.tags;
  const parsedTags = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
    ? rawTags.split(/[ ,]+/).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`))
    : ['#Pulse', '#Viral'];

  return {
    id: String(post.id),
    user: userObj,
    videoUrl: post.video_url || post.media_url || 'https://assets.mixkit.co/videos/preview/mixkit-girl-dancing-in-a-party-with-neon-lights-42533-large.mp4',
    thumbnailUrl: post.thumbnail_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    caption: post.caption || 'Created on Pulse ✨',
    tags: parsedTags,
    audioTrack: {
      title: post.audio_title || 'Original Audio',
      artist: post.audio_artist || userObj.name,
      albumCover: userObj.avatar,
    },
    likesCount: Number(post.likes_count) || 12,
    commentsCount: Number(post.comments_count) || 0,
    sharesCount: Number(post.shares_count) || 0,
    bookmarksCount: Number(post.bookmarks_count) || 0,
    viewsCount: Number(post.views_count) || 120,
    isLiked: false,
    isBookmarked: false,
    comments: [],
  };
}

function mapDbNotification(notif: any): NotificationItem {
  const actor: User = notif.actor || {
    id: notif.actor_id || 'usr_actor',
    name: notif.actor_name || 'Pulse Member',
    username: notif.actor_username || 'pulse_user',
    avatar: notif.actor_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    followersCount: 50,
    followingCount: 50,
    likesCount: 100,
  };

  return {
    id: String(notif.id || `notif_${Date.now()}`),
    type: notif.type || 'like',
    actor,
    text: notif.text || 'interacted with your content',
    targetReelThumbnail: notif.target_reel_thumbnail || undefined,
    targetLiveId: notif.target_live_id || undefined,
    timestamp: notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    isRead: Boolean(notif.is_read),
    connectionId: notif.connection_id || notif.connectionId || undefined,
    connectionStatus: notif.connection_status || notif.connectionStatus || undefined,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, deductCoins } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [reels, setReels] = useState<Reel[]>(MOCK_REELS);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  
  // Live state
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>(MOCK_LIVE_ROOMS);
  const [activeLiveRoom, setActiveLiveRoom] = useState<LiveRoom | null>(null);
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  
  // Bookmarks & Saved posts state
  const [savedPosts, setSavedPosts] = useState<Reel[]>([]);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(false);
  
  // DMs state
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Blocked Users State & Privacy System
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);

  // Real-time User Presence State
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set(['usr_1', 'usr_2', 'usr_4', 'usr_5']));

  // Real-time Friend Request & Connections State
  const [connections, setConnections] = useState<UserConnection[]>([
    {
      id: 'conn_maya_alex',
      requesterId: 'usr_5',
      receiverId: 'usr_current',
      status: 'pending',
      createdAt: new Date(Date.now() - 300000).toISOString(),
      requester: MOCK_USERS[5],
    },
    {
      id: 'conn_kai_alex',
      requesterId: 'usr_4',
      receiverId: 'usr_current',
      status: 'accepted',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      requester: MOCK_USERS[4],
    },
  ]);
  
  // Real-time Audio & Video Calling State
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCallSession | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const autoSimulateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; message: string; type: 'live' | 'like' | 'message' | 'gift' } | null>(null);
  
  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'reel' | 'story' | 'live'>('reel');
  const [isMobilePreviewFrame, setIsMobilePreviewFrame] = useState(false);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;
  const unreadDMsCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleMobilePreviewFrame = () => setIsMobilePreviewFrame((prev) => !prev);

  // Fetch real posts from Supabase
  const refreshPosts = useCallback(async () => {
    try {
      const dbPosts = await postsService.fetchPosts();
      if (dbPosts && dbPosts.length > 0) {
        const mappedReels = dbPosts
          .filter((p) => p.type !== 'story')
          .map(mapPostToReel);

        if (mappedReels.length > 0) {
          setReels((prev) => {
            const existingIds = new Set(mappedReels.map((r) => r.id));
            const remainingMocks = prev.filter((r) => !existingIds.has(r.id) && r.id.startsWith('r_'));
            return [...mappedReels, ...remainingMocks];
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load posts from Supabase:', e);
    }
  }, []);

  // Fetch real notifications from Supabase
  const refreshNotifications = useCallback(async () => {
    try {
      const dbNotifs = await apiFetchNotifications(user?.id);
      if (dbNotifs && dbNotifs.length > 0) {
        const mappedNotifs = dbNotifs.map(mapDbNotification);
        setNotifications((prev) => {
          const existingIds = new Set(mappedNotifs.map((n) => n.id));
          const remainingMocks = prev.filter((n) => !existingIds.has(n.id) && n.id.startsWith('notif_'));
          return [...mappedNotifs, ...remainingMocks];
        });
      }
    } catch (e) {
      console.warn('Failed to load notifications from Supabase:', e);
    }
  }, [user?.id]);

  // Fetch real bookmarks from Supabase
  const refreshBookmarks = useCallback(async () => {
    setIsBookmarksLoading(true);
    try {
      const rawBookmarks = await bookmarksService.fetchBookmarks(user?.id);
      if (rawBookmarks && rawBookmarks.length > 0) {
        const bookmarkedIds = new Set(rawBookmarks.map((b: any) => String(b.post_id || b.postId || b.id)));
        
        // Update isBookmarked flag on current reels
        setReels((prev) =>
          prev.map((r) => ({
            ...r,
            isBookmarked: bookmarkedIds.has(r.id),
          }))
        );

        // Resolve saved reels from current reels or raw bookmark post_data
        const resolvedSaved: Reel[] = rawBookmarks.map((b: any) => {
          const targetId = String(b.post_id || b.postId || b.id);
          const foundInReels = reels.find((r) => r.id === targetId);
          if (foundInReels) {
            return { ...foundInReels, isBookmarked: true };
          }
          if (b.post_data) {
            return {
              id: targetId,
              user: b.post_data.user || {
                id: 'usr_creator',
                name: 'Pulse Creator',
                username: 'creator',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                followersCount: 150,
                followingCount: 60,
                likesCount: 300,
                verified: true,
              },
              videoUrl: b.post_data.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-girl-dancing-in-a-party-with-neon-lights-42533-large.mp4',
              thumbnailUrl: b.post_data.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
              caption: b.post_data.caption || 'Bookmarked reel on Pulse',
              tags: ['#Saved', '#Pulse'],
              audioTrack: { title: 'Original Audio', artist: 'Pulse' },
              likesCount: Number(b.post_data.likesCount) || 15,
              commentsCount: Number(b.post_data.commentsCount) || 0,
              sharesCount: 0,
              bookmarksCount: 1,
              isLiked: false,
              isBookmarked: true,
              comments: [],
              viewsCount: Number(b.post_data.viewsCount) || 150,
            };
          }

          // Fallback matching from mock reels
          const mockMatch = MOCK_REELS.find((m) => m.id === targetId);
          if (mockMatch) return { ...mockMatch, isBookmarked: true };

          return {
            id: targetId,
            user: {
              id: 'usr_saved',
              name: 'Pulse Creator',
              username: 'pulse_artist',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              followersCount: 200,
              followingCount: 80,
              likesCount: 400,
            },
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-dancing-in-a-party-with-neon-lights-42533-large.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
            caption: 'Saved Reel',
            tags: ['#Saved'],
            audioTrack: { title: 'Original Audio', artist: 'Pulse' },
            likesCount: 20,
            commentsCount: 2,
            sharesCount: 0,
            bookmarksCount: 1,
            isLiked: false,
            isBookmarked: true,
            comments: [],
            viewsCount: 210,
          };
        });

        setSavedPosts(resolvedSaved);
      } else {
        // If empty from DB, populate with currently bookmarked in-memory reels
        setSavedPosts((prev) => {
          const fromReels = reels.filter((r) => r.isBookmarked);
          return fromReels.length > 0 ? fromReels : prev;
        });
      }
    } catch (e) {
      console.warn('Failed to load bookmarks from Supabase:', e);
    } finally {
      setIsBookmarksLoading(false);
    }
  }, [user?.id, reels]);

  // Fetch real connections from Supabase & localStorage cache
  const refreshConnections = useCallback(async () => {
    const currentUid = user?.id || 'usr_current';
    try {
      const dbConnections = await connectionsService.fetchConnections(currentUid);
      if (dbConnections && dbConnections.length > 0) {
        setConnections((prev) => {
          const merged = [...dbConnections];
          for (const p of prev) {
            if (!merged.some((m) => m.id === p.id || (m.requesterId === p.requesterId && m.receiverId === p.receiverId))) {
              merged.push(p);
            }
          }
          return merged;
        });
      }
    } catch (e) {
      console.warn('Failed to load connections:', e);
    }
  }, [user?.id]);

  // Initial load & real-time Postgres subscriptions
  useEffect(() => {
    refreshPosts();
    refreshNotifications();
    refreshBookmarks();
    refreshConnections();

    if (!supabase) return;

    // Listen to real-time changes on posts table
    const postsChannel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.new) {
          const newReel = mapPostToReel(payload.new);
          setReels((prev) => {
            if (prev.some((r) => r.id === newReel.id)) return prev;
            return [newReel, ...prev];
          });
        }
      })
      .subscribe();

    // Listen to real-time changes on bookmarks table
    const bookmarksChannel = supabase
      .channel('public:bookmarks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, () => {
        refreshBookmarks();
      })
      .subscribe();

    // Listen to real-time changes on connections table
    const connectionsChannel = supabase
      .channel('public:connections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, (payload) => {
        refreshConnections();
        if (payload.new) {
          const updated = payload.new as any;
          if (updated.status === 'accepted') {
            audioUtils.playCallConnected();
          }
        }
      })
      .subscribe();

    // Listen to real-time changes on notifications table
    const notifsChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new) {
          const newNotif = mapDbNotification(payload.new);
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Trigger live toast alert
          setActiveToast({
            id: newNotif.id,
            title: `${newNotif.actor.name} • ${newNotif.type.toUpperCase()}`,
            message: newNotif.text,
            type: (newNotif.type as any) || 'like',
          });
        }
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(postsChannel);
      supabase?.removeChannel(bookmarksChannel);
      supabase?.removeChannel(connectionsChannel);
      supabase?.removeChannel(notifsChannel);
    };
  }, [refreshPosts, refreshNotifications, refreshBookmarks, refreshConnections]);

  // Presence subscription & Real-time online tracking
  useEffect(() => {
    const activeUser = user || {
      id: 'usr_current',
      name: 'Pulse Creator',
      username: 'pulse_creator',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };

    presenceService.initPresence(activeUser);

    const unsubscribe = presenceService.subscribe((activeIds) => {
      setOnlineUserIds(activeIds);
      // Synchronize presence states into conversations list
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          isOnline: activeIds.has(c.participant.id),
        }))
      );
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const isUserOnline = useCallback(
    (userId: string) => {
      if (!userId) return false;
      if (user && (userId === user.id || userId === 'usr_current')) return true;
      return onlineUserIds.has(userId) || presenceService.isUserOnline(userId);
    },
    [user, onlineUserIds]
  );

  // Load and sync blocked users
  const refreshBlockedUsers = useCallback(async () => {
    const blockerId = user?.id || 'usr_current';
    try {
      const res = await blocksService.fetchBlockedUsers(blockerId);
      setBlockedUserIds(res.blockedIds);
      setBlockedUsers(res.blockedUsers);
    } catch (err) {
      console.warn('Failed to load blocked users from Supabase/cache:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshBlockedUsers();
  }, [refreshBlockedUsers]);

  const isUserBlocked = useCallback(
    (userId: string) => {
      if (!userId) return false;
      return blockedUserIds.includes(userId);
    },
    [blockedUserIds]
  );

  const blockUser = async (targetUser: User) => {
    if (!targetUser || !targetUser.id) return;
    audioUtils.playPop();
    const blockerId = user?.id || 'usr_current';

    setBlockedUserIds((prev) => Array.from(new Set([...prev, targetUser.id])));
    setBlockedUsers((prev) => {
      if (prev.some((u) => u.id === targetUser.id)) return prev;
      return [targetUser, ...prev];
    });

    // Terminate any active calling session with blocked user immediately
    if (activeCall && activeCall.participant.id === targetUser.id) {
      endCall();
    }
    if (incomingCall && incomingCall.participant.id === targetUser.id) {
      rejectCall();
    }

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'User Blocked',
      message: `@${targetUser.username} has been blocked.`,
      type: 'like',
    });

    await blocksService.blockUser(blockerId, targetUser);
  };

  const unblockUser = async (targetUserId: string) => {
    if (!targetUserId) return;
    audioUtils.playPop();
    const blockerId = user?.id || 'usr_current';

    setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
    setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'User Unblocked',
      message: `User has been unblocked.`,
      type: 'like',
    });

    await blocksService.unblockUser(blockerId, targetUserId);
  };

  const toggleBlockUser = async (targetUser: User) => {
    if (isUserBlocked(targetUser.id)) {
      await unblockUser(targetUser.id);
    } else {
      await blockUser(targetUser);
    }
  };

  const viewProfileUser = (targetUser: User | null) => {
    audioUtils.playPop();
    setViewingProfileUser(targetUser);
    setActiveTab('profile');
  };

  // Connection & Friend Request System Handlers
  const getConnectionStatusWith = useCallback(
    (targetUserId: string): { status: ConnectionStatus; isIncoming: boolean; isOutgoing: boolean; connectionId?: string } => {
      const currentUserId = user?.id || 'usr_current';
      if (!targetUserId || targetUserId === currentUserId) {
        return { status: 'none', isIncoming: false, isOutgoing: false };
      }

      const conn = connections.find(
        (c) =>
          (c.requesterId === currentUserId && c.receiverId === targetUserId) ||
          (c.requesterId === targetUserId && c.receiverId === currentUserId) ||
          (c.requester?.id === targetUserId && (c.receiverId === currentUserId || c.receiverId === 'usr_current')) ||
          (c.receiver?.id === targetUserId && (c.requesterId === currentUserId || c.requesterId === 'usr_current'))
      );

      if (!conn) {
        return { status: 'none', isIncoming: false, isOutgoing: false };
      }

      const isIncoming = conn.receiverId === currentUserId || conn.receiver?.id === currentUserId || conn.receiverId === 'usr_current';
      const isOutgoing = conn.requesterId === currentUserId || conn.requester?.id === currentUserId || conn.requesterId === 'usr_current';

      return {
        status: conn.status,
        isIncoming,
        isOutgoing,
        connectionId: conn.id,
      };
    },
    [connections, user?.id]
  );

  const sendConnectionRequest = async (targetUser: User) => {
    const currentUid = user?.id || 'usr_current';
    const currentUserObj: User = user || {
      id: 'usr_current',
      name: 'Alex Rivera',
      username: 'alexrivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      followersCount: 142800,
      followingCount: 486,
      likesCount: 2900000,
    };

    audioUtils.playPop();
    const newConnection: UserConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requesterId: currentUid,
      receiverId: targetUser.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      requester: currentUserObj,
      receiver: targetUser,
    };

    setConnections((prev) => {
      const filtered = prev.filter(
        (c) =>
          !(c.requesterId === currentUid && c.receiverId === targetUser.id) &&
          !(c.requesterId === targetUser.id && c.receiverId === currentUid)
      );
      return [newConnection, ...filtered];
    });

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'Friend Request Sent',
      message: `Connection request sent to @${targetUser.username}.`,
      type: 'like',
    });

    // Send notification to target user in Supabase
    insertNotificationInSupabase({
      userId: targetUser.id,
      actor: {
        id: currentUserObj.id,
        name: currentUserObj.name,
        username: currentUserObj.username,
        avatar: currentUserObj.avatar,
      },
      type: 'connection_request',
      text: 'sent you a friend connection request',
      connectionId: newConnection.id,
      connectionStatus: 'pending',
    });

    await connectionsService.sendConnectionRequest(currentUid, targetUser.id, currentUserObj, targetUser);
  };

  const acceptConnectionRequest = async (connectionIdOrUserId: string) => {
    const currentUid = user?.id || 'usr_current';
    audioUtils.playCallConnected();
    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#ec4899', '#3b82f6'],
      });
    } catch {}

    let targetRequesterId = '';
    let targetRequesterName = 'friend';

    setConnections((prev) =>
      prev.map((c) => {
        if (
          c.id === connectionIdOrUserId ||
          c.requesterId === connectionIdOrUserId ||
          c.receiverId === connectionIdOrUserId ||
          c.requester?.id === connectionIdOrUserId
        ) {
          targetRequesterId = c.requesterId;
          targetRequesterName = c.requester?.name || 'Pulse user';
          return { ...c, status: 'accepted' as ConnectionStatus, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    );

    // Update local notification state to accepted
    setNotifications((prev) =>
      prev.map((n) => {
        if (
          n.connectionId === connectionIdOrUserId ||
          n.actor.id === connectionIdOrUserId ||
          n.id === connectionIdOrUserId
        ) {
          return {
            ...n,
            connectionStatus: 'accepted' as ConnectionStatus,
            text: 'connected with you as a friend on Pulse',
            isRead: true,
          };
        }
        return n;
      })
    );

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'Connection Accepted! 🎉',
      message: `You and ${targetRequesterName} are now connected.`,
      type: 'like',
    });

    if (targetRequesterId && user) {
      insertNotificationInSupabase({
        userId: targetRequesterId,
        actor: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
        type: 'connection_accepted',
        text: 'accepted your friend connection request',
      });
    }

    await connectionsService.acceptConnectionRequest(
      connectionIdOrUserId,
      targetRequesterId || connectionIdOrUserId,
      currentUid
    );
  };

  const declineConnectionRequest = async (connectionIdOrUserId: string) => {
    const currentUid = user?.id || 'usr_current';
    audioUtils.playPop();

    let targetRequesterId = '';
    setConnections((prev) =>
      prev.map((c) => {
        if (
          c.id === connectionIdOrUserId ||
          c.requesterId === connectionIdOrUserId ||
          c.receiverId === connectionIdOrUserId ||
          c.requester?.id === connectionIdOrUserId
        ) {
          targetRequesterId = c.requesterId;
          return { ...c, status: 'declined' as ConnectionStatus, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    );

    setNotifications((prev) =>
      prev.map((n) => {
        if (
          n.connectionId === connectionIdOrUserId ||
          n.actor.id === connectionIdOrUserId ||
          n.id === connectionIdOrUserId
        ) {
          return {
            ...n,
            connectionStatus: 'declined' as ConnectionStatus,
            isRead: true,
          };
        }
        return n;
      })
    );

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'Request Declined',
      message: 'Connection request declined.',
      type: 'message',
    });

    await connectionsService.declineConnectionRequest(
      connectionIdOrUserId,
      targetRequesterId || connectionIdOrUserId,
      currentUid
    );
  };

  const cancelConnectionRequest = async (targetUserId: string) => {
    const currentUid = user?.id || 'usr_current';
    audioUtils.playPop();

    setConnections((prev) =>
      prev.filter(
        (c) =>
          !(c.requesterId === currentUid && (c.receiverId === targetUserId || c.receiver?.id === targetUserId)) &&
          !(c.requesterId === targetUserId && (c.receiverId === currentUid || c.receiverId === 'usr_current'))
      )
    );

    setActiveToast({
      id: `toast_${Date.now()}`,
      title: 'Request Cancelled',
      message: 'Friend request was cancelled.',
      type: 'message',
    });

    await connectionsService.cancelConnectionRequest(currentUid, targetUserId);
  };

  // Media bucket upload wrapper
  const uploadMedia = async (file: File | Blob): Promise<string | null> => {
    return await uploadMediaToStorage(file, 'media_uploads');
  };

  // Simulated live interaction ticker when inside a live room
  useEffect(() => {
    if (!activeLiveRoom) return;

    // Seed initial live comments
    setLiveComments([
      {
        id: 'lc_1',
        user: { id: 'u_p1', name: 'Riku Tanaka', username: 'riku_t', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', followersCount: 10, followingCount: 20, likesCount: 50 },
        text: 'The visual transitions are looking so clean tonight! 🔥',
        timestamp: 'Just now',
      },
      {
        id: 'lc_2',
        user: { id: 'u_p2', name: 'Zoe Vance', username: 'zoev', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', followersCount: 10, followingCount: 20, likesCount: 50 },
        text: 'What audio DAW are you using for the live sync?',
        timestamp: 'Just now',
      },
    ]);

    // Interval to spawn incoming chatter and hearts
    const interval = setInterval(() => {
      const mockChatters = [
        { name: 'Leo Gomez', text: 'Insane audio design! 🎛️', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' },
        { name: 'Hana Mori', text: 'Greetings from Shibuya! 🇯🇵', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
        { name: 'Liam Wilson', text: 'Dropping hearts! ❤️❤️❤️', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
        { name: 'Aria Chen', text: 'Can you show the effects pedal chain?', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80' },
      ];

      const randomItem = mockChatters[Math.floor(Math.random() * mockChatters.length)];
      setLiveComments((prev) => [
        ...prev.slice(-15),
        {
          id: `lc_${Date.now()}`,
          user: {
            id: `u_${Date.now()}`,
            name: randomItem.name,
            username: randomItem.name.toLowerCase().replace(' ', '_'),
            avatar: randomItem.avatar,
            followersCount: 50,
            followingCount: 50,
            likesCount: 100,
          },
          text: randomItem.text,
          timestamp: 'Just now',
        },
      ]);

      // Random floating heart burst
      if (Math.random() > 0.3) {
        triggerLiveHeart();
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [activeLiveRoom]);

  // Periodic placeholder notification simulator to showcase real-time feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveToast({
        id: 'toast_1',
        title: 'Marcus Chen went LIVE! 🔴',
        message: '🎧 "Live Modular Jam & Q&A | Making Beats from Scratch"',
        type: 'live',
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, []);

  const dismissToast = () => setActiveToast(null);

  const toggleLikeReel = (reelId: string) => {
    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === reelId) {
          const isLiked = !reel.isLiked;
          const countChange = isLiked ? 1 : -1;

          // Trigger Supabase notification on like
          if (isLiked && user) {
            insertNotificationInSupabase({
              userId: reel.user.id,
              actor: {
                id: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar,
              },
              type: 'like',
              text: 'liked your reel video',
              targetReelThumbnail: reel.thumbnailUrl,
            });
          }

          return {
            ...reel,
            isLiked,
            likesCount: Math.max(0, reel.likesCount + countChange),
          };
        }
        return reel;
      })
    );
  };

  const toggleBookmarkReel = (reelId: string) => {
    const targetReel = reels.find((r) => r.id === reelId) || savedPosts.find((r) => r.id === reelId);
    const willBookmark = targetReel ? !targetReel.isBookmarked : true;

    // Update reels state optimistically
    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === reelId) {
          return {
            ...reel,
            isBookmarked: willBookmark,
            bookmarksCount: Math.max(0, reel.bookmarksCount + (willBookmark ? 1 : -1)),
          };
        }
        return reel;
      })
    );

    // Update savedPosts state optimistically
    if (willBookmark && targetReel) {
      const bookmarkedReelItem: Reel = {
        ...targetReel,
        isBookmarked: true,
        bookmarksCount: targetReel.bookmarksCount + 1,
      };
      setSavedPosts((prev) => {
        if (prev.some((p) => p.id === reelId)) return prev;
        return [bookmarkedReelItem, ...prev];
      });

      setActiveToast({
        id: `bm_${Date.now()}`,
        title: 'Saved Post',
        message: 'Saved to your profile bookmarks tab.',
        type: 'like',
      });
    } else {
      setSavedPosts((prev) => prev.filter((p) => p.id !== reelId));
    }

    // Persist to Supabase bookmarks table / localStorage cache
    const effectiveUserId = user?.id || 'usr_current';
    bookmarksService.toggleBookmark(effectiveUserId, reelId, targetReel).catch((err) => {
      console.warn('Supabase bookmark toggle error:', err);
    });
  };

  const addReelComment = (reelId: string, text: string) => {
    if (!text.trim() || !user) return;
    const newComment = {
      id: `c_${Date.now()}`,
      user,
      text,
      likes: 0,
      timestamp: 'Just now',
    };

    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === reelId) {
          // Trigger Supabase notification on comment
          insertNotificationInSupabase({
            userId: reel.user.id,
            actor: {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar,
            },
            type: 'comment',
            text: `commented: "${text.length > 25 ? text.substring(0, 25) + '...' : text}"`,
            targetReelThumbnail: reel.thumbnailUrl,
          });

          return {
            ...reel,
            commentsCount: reel.commentsCount + 1,
            comments: [newComment, ...reel.comments],
          };
        }
        return reel;
      })
    );
  };

  const toggleFollowUser = (userId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.user.id === userId) {
          const nextFollowing = !r.user.isFollowing;
          if (nextFollowing && user) {
            insertNotificationInSupabase({
              userId,
              actor: {
                id: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar,
              },
              type: 'follow',
              text: 'started following your pulse profile',
            });
          }
          return {
            ...r,
            user: { ...r.user, isFollowing: nextFollowing },
          };
        }
        return r;
      })
    );
  };

  const openStoryViewer = (index: number) => {
    setActiveStoryIndex(index);
    if (stories[index]) {
      markStoryRead(stories[index].id);
    }
  };

  const closeStoryViewer = () => {
    setActiveStoryIndex(null);
  };

  const markStoryRead = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, hasUnread: false } : s))
    );
  };

  const addStory = async (itemUrl: string, caption?: string) => {
    if (!user) return;
    const newStoryItem = {
      id: `st_item_${Date.now()}`,
      type: 'image' as const,
      url: itemUrl,
      duration: 5,
      caption: caption || 'Moments on Pulse ⚡',
      timestamp: 'Just now',
    };

    setStories((prev) => {
      const myStoryIndex = prev.findIndex((s) => s.user.id === user.id || s.id === 'story_me');
      if (myStoryIndex >= 0) {
        const updated = [...prev];
        updated[myStoryIndex] = {
          ...updated[myStoryIndex],
          items: [...updated[myStoryIndex].items, newStoryItem],
          hasUnread: false,
        };
        return updated;
      }
      return [
        {
          id: `story_${Date.now()}`,
          user,
          items: [newStoryItem],
          hasUnread: false,
        },
        ...prev,
      ];
    });

    // Save story to Supabase posts table
    postsService.createPost({
      userId: user.id,
      userName: user.name,
      userUsername: user.username,
      userAvatar: user.avatar,
      mediaUrl: itemUrl,
      caption: caption || 'Story snapshot on Pulse',
      type: 'story',
    });
  };

  const openLiveRoom = (room: LiveRoom) => {
    setActiveLiveRoom(room);
  };

  const closeLiveRoom = () => {
    setActiveLiveRoom(null);
  };

  const sendLiveComment = (text: string) => {
    if (!text.trim() || !user) return;
    setLiveComments((prev) => [
      ...prev,
      {
        id: `lc_${Date.now()}`,
        user,
        text,
        timestamp: 'Just now',
      },
    ]);
  };

  const sendLiveGift = (gift: LiveGift): boolean => {
    if (!user) return false;
    const success = deductCoins(gift.cost);
    if (!success) return false;

    // Trigger visual confetti
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.75 },
        colors: [gift.animationColor, '#ffffff', '#fb7185', '#38bdf8'],
      });
    } catch (e) {
      // safe fallback
    }

    if (activeLiveRoom) {
      insertNotificationInSupabase({
        userId: activeLiveRoom.host.id,
        actor: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
        type: 'gift',
        text: `sent ${gift.name} ${gift.icon} in your live room`,
        targetLiveId: activeLiveRoom.id,
      });
    }

    setLiveComments((prev) => [
      ...prev,
      {
        id: `lc_gift_${Date.now()}`,
        user,
        text: `Sent ${gift.name} ${gift.icon}`,
        isGift: true,
        giftName: gift.name,
        giftIcon: gift.icon,
        timestamp: 'Just now',
      },
    ]);

    return true;
  };

  const triggerLiveHeart = () => {
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308'];
    const newHeart: FloatingHeart = {
      id: `fh_${Date.now()}_${Math.random()}`,
      x: 60 + Math.random() * 30, // right percentage
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 20 + Math.floor(Math.random() * 16),
    };
    setFloatingHearts((prev) => [...prev.slice(-20), newHeart]);

    // Clean up after animation
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const closeConversation = () => {
    setActiveConversation(null);
  };

  const sendDirectMessage = (convId: string, text: string, mediaType?: 'image' | 'video' | 'audio') => {
    if (!user || (!text.trim() && !mediaType)) return;

    // Check if target conversation is with a blocked user
    const targetConv = conversations.find((c) => c.id === convId);
    if (targetConv && isUserBlocked(targetConv.participant.id)) {
      setActiveToast({
        id: `toast_${Date.now()}`,
        title: 'Cannot Send Message',
        message: `You cannot send messages to @${targetConv.participant.username} while they are blocked.`,
        type: 'message',
      });
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      text,
      mediaType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updatedMessages = [...c.messages, newMsg];
          const updatedConv = {
            ...c,
            lastMessage: text || (mediaType ? `Sent a ${mediaType}` : ''),
            lastMessageTime: 'Just now',
            messages: updatedMessages,
          };
          if (activeConversation?.id === convId) {
            setActiveConversation(updatedConv);
          }
          return updatedConv;
        }
        return c;
      })
    );
  };

  const markNotifAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    apiMarkNotificationRead(id);
  };

  const markAllNotifsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (user?.id) {
      apiMarkAllNotificationsRead(user.id);
    }
  };

  const openCreateModal = (defaultType: 'reel' | 'story' | 'live' = 'reel') => {
    setCreateType(defaultType);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
  };

  const createReel = async (
    videoUrl: string, 
    caption: string, 
    tags: string[], 
    audioTitle: string,
    mediaFile?: File | Blob
  ) => {
    if (!user) return;
    
    let finalVideoUrl = videoUrl;

    // Upload to media bucket if a real file is passed
    if (mediaFile) {
      const uploadedUrl = await uploadMediaToStorage(mediaFile, 'reels');
      if (uploadedUrl) {
        finalVideoUrl = uploadedUrl;
      }
    }

    const newReel: Reel = {
      id: `reel_${Date.now()}`,
      user,
      videoUrl: finalVideoUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      caption,
      tags: tags.length ? tags : ['#PulseOriginal', '#Trending'],
      audioTrack: {
        title: audioTitle || 'Original Audio',
        artist: user.name,
        albumCover: user.avatar,
      },
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      bookmarksCount: 0,
      isLiked: true,
      isBookmarked: false,
      viewsCount: 1,
      comments: [],
    };

    // Optimistic UI update
    setReels((prev) => [newReel, ...prev]);
    setActiveTab('reels');
    setActiveReelIndex(0);
    closeCreateModal();

    // Persist to Supabase 'posts' table
    try {
      await postsService.createPost({
        userId: user.id,
        userName: user.name,
        userUsername: user.username,
        userAvatar: user.avatar,
        videoUrl: finalVideoUrl,
        thumbnailUrl: newReel.thumbnailUrl,
        caption,
        tags,
        audioTitle: newReel.audioTrack.title,
        audioArtist: newReel.audioTrack.artist,
        type: 'reel',
      });

      // Insert real notification to Supabase
      await insertNotificationInSupabase({
        userId: user.id,
        actor: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
        type: 'like',
        text: 'published a new video reel on Pulse',
        targetReelThumbnail: newReel.thumbnailUrl,
      });
    } catch (err) {
      console.warn('Supabase post creation sync error:', err);
    }
  };

  // WebRTC Signal Subscriptions and Call Event Listeners
  useEffect(() => {
    webrtcService.subscribeToSignals(user?.id);

    webrtcService.setCallbacks({
      onLocalStream: (stream) => {
        setActiveCall((prev) => (prev ? { ...prev, localStream: stream } : null));
      },
      onRemoteStream: (stream) => {
        if (stopRingtoneRef.current) {
          stopRingtoneRef.current();
          stopRingtoneRef.current = null;
        }
        audioUtils.playCallConnected();
        setActiveCall((prev) => (prev ? { ...prev, remoteStream: stream, status: 'connected', startedAt: Date.now() } : null));
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          if (stopRingtoneRef.current) {
            stopRingtoneRef.current();
            stopRingtoneRef.current = null;
          }
          audioUtils.playCallConnected();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null));
        } else if (state === 'disconnected' || state === 'failed') {
          endCall();
        }
      },
      onSignalMessage: async (signal: CallSignalPayload) => {
        if (!signal) return;

        // Discard any incoming signaling packets from blocked users
        if (signal.caller && isUserBlocked(signal.caller.id)) {
          console.log('Ignored WebRTC signaling from blocked caller:', signal.caller.id);
          return;
        }

        if (signal.type === 'call-offer' || signal.type === 'call-invite') {
          // If targeted to us or global room and we are not in active call
          if (!activeCall && signal.caller && signal.caller.id !== user?.id) {
            incomingOfferRef.current = signal.sdp || null;
            const newIncoming: ActiveCallSession = {
              id: signal.callId,
              callType: signal.callType || 'video',
              status: 'incoming',
              participant: signal.caller,
              isCaller: false,
              durationSeconds: 0,
              isMuted: false,
              isVideoOff: false,
              isSpeakerOn: true,
              isCameraFlipped: false,
            };
            setIncomingCall(newIncoming);
            if (stopRingtoneRef.current) stopRingtoneRef.current();
            stopRingtoneRef.current = audioUtils.playIncomingRingtone();
          }
        } else if (signal.type === 'call-accepted') {
          if (stopRingtoneRef.current) {
            stopRingtoneRef.current();
            stopRingtoneRef.current = null;
          }
          audioUtils.playCallConnected();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null));
        } else if (signal.type === 'call-answer') {
          if (signal.sdp) {
            await webrtcService.handleAnswer(signal.sdp);
          }
          if (stopRingtoneRef.current) {
            stopRingtoneRef.current();
            stopRingtoneRef.current = null;
          }
          audioUtils.playCallConnected();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null));
        } else if (signal.type === 'call-ice-candidate') {
          if (signal.candidate) {
            await webrtcService.handleIceCandidate(signal.candidate);
          }
        } else if (signal.type === 'call-ended' || signal.type === 'call-rejected') {
          if (stopRingtoneRef.current) {
            stopRingtoneRef.current();
            stopRingtoneRef.current = null;
          }
          audioUtils.playCallEnded();
          setActiveCall(null);
          setIncomingCall(null);
        }
      },
    });

    return () => {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
      }
    };
  }, [user?.id, activeCall]);

  // Active call duration timer
  useEffect(() => {
    let timer: any = null;
    if (activeCall && activeCall.status === 'connected') {
      timer = setInterval(() => {
        setActiveCall((prev) => {
          if (!prev || prev.status !== 'connected') return prev;
          return {
            ...prev,
            durationSeconds: prev.durationSeconds + 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall?.status]);

  const startCall = async (participant: User, callType: CallType) => {
    audioUtils.playPop();

    // Prevent call initiation if target user is blocked
    if (isUserBlocked(participant.id)) {
      setActiveToast({
        id: `toast_${Date.now()}`,
        title: 'Call Blocked',
        message: `You have blocked @${participant.username}. Unblock them to place a call.`,
        type: 'message',
      });
      return;
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (stopRingtoneRef.current) stopRingtoneRef.current();
    stopRingtoneRef.current = audioUtils.playOutgoingRing();

    const newCallSession: ActiveCallSession = {
      id: callId,
      callType,
      status: 'calling',
      participant,
      isCaller: true,
      durationSeconds: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      isCameraFlipped: false,
    };

    setActiveCall(newCallSession);

    const currentUserObj: User = user || {
      id: 'usr_current',
      name: 'Pulse User',
      username: 'pulse_user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      followersCount: 120,
      followingCount: 50,
      likesCount: 100,
    };

    try {
      await webrtcService.createOffer(callId, callType, currentUserObj, participant.id);
    } catch (err) {
      console.warn('WebRTC offer initialization error:', err);
    }

    // Auto-answer simulation for instant testing of WebRTC interface
    if (autoSimulateTimerRef.current) clearTimeout(autoSimulateTimerRef.current);
    autoSimulateTimerRef.current = setTimeout(() => {
      setActiveCall((prev) => {
        if (!prev || prev.status !== 'calling') return prev;
        if (stopRingtoneRef.current) {
          stopRingtoneRef.current();
          stopRingtoneRef.current = null;
        }
        audioUtils.playCallConnected();
        return {
          ...prev,
          status: 'connected',
          startedAt: Date.now(),
        };
      });
    }, 3500);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    audioUtils.playPop();

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    audioUtils.playCallConnected();

    const acceptedSession: ActiveCallSession = {
      ...incomingCall,
      status: 'connected',
      startedAt: Date.now(),
    };

    setActiveCall(acceptedSession);
    setIncomingCall(null);

    try {
      if (incomingOfferRef.current) {
        await webrtcService.handleOffer(acceptedSession.id, incomingOfferRef.current, acceptedSession.callType);
        incomingOfferRef.current = null;
      } else {
        await webrtcService.setupMediaStream(acceptedSession.callType);
        await webrtcService.sendSignal({
          type: 'call-accepted',
          callId: acceptedSession.id,
        });
      }
    } catch (err) {
      console.warn('WebRTC accept call error:', err);
    }
  };

  const rejectCall = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    audioUtils.playCallEnded();

    if (incomingCall) {
      webrtcService.sendSignal({
        type: 'call-rejected',
        callId: incomingCall.id,
      });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    if (autoSimulateTimerRef.current) {
      clearTimeout(autoSimulateTimerRef.current);
    }
    audioUtils.playCallEnded();

    if (activeCall) {
      webrtcService.endCall(activeCall.id);
    } else {
      webrtcService.endCall();
    }

    setActiveCall(null);
    setIncomingCall(null);
  };

  const toggleCallMute = () => {
    if (!activeCall) return;
    const nextMuted = !activeCall.isMuted;
    setActiveCall((prev) => (prev ? { ...prev, isMuted: nextMuted } : null));
    webrtcService.toggleAudio(!nextMuted);
  };

  const toggleCallVideo = () => {
    if (!activeCall) return;
    const nextVideoOff = !activeCall.isVideoOff;
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff: nextVideoOff } : null));
    webrtcService.toggleVideo(!nextVideoOff);
  };

  const flipCallCamera = async () => {
    if (!activeCall) return;
    const newStream = await webrtcService.switchCamera(activeCall.callType);
    if (newStream) {
      setActiveCall((prev) => (prev ? { ...prev, localStream: newStream, isCameraFlipped: !prev.isCameraFlipped } : null));
    }
  };

  const toggleSpeaker = () => {
    if (!activeCall) return;
    setActiveCall((prev) => (prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : null));
  };

  const setCallVoiceEffect = (effect: VoiceEffect) => {
    if (!activeCall) return;
    audioUtils.playVoiceEffectSwitched(effect);
    setActiveCall((prev) => (prev ? { ...prev, voiceEffect: effect } : null));
    webrtcService.setVoiceEffect(effect);
  };

  const startLiveBroadcast = (title: string, category: LiveRoom['category']) => {
    if (!user) return;
    const newRoom: LiveRoom = {
      id: `live_my_${Date.now()}`,
      title,
      host: user,
      category,
      viewerCount: 1,
      previewUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      startedAt: 'Just now',
      tags: ['#LiveHost', '#PulseBroadcast'],
    };

    setLiveRooms((prev) => [newRoom, ...prev]);
    setActiveLiveRoom(newRoom);
    closeCreateModal();

    // Trigger Supabase notification for Live Broadcast
    insertNotificationInSupabase({
      userId: user.id,
      actor: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      },
      type: 'live',
      text: `started a LIVE room: "${title}"`,
      targetLiveId: newRoom.id,
    });
  };

  // Content Filtering for Blocked Users
  const visibleReels = reels.filter((r) => !blockedUserIds.includes(r.user.id));
  const visibleStories = stories.filter((s) => !blockedUserIds.includes(s.user.id));
  const visibleLiveRooms = liveRooms.filter((lr) => !blockedUserIds.includes(lr.host.id));
  const visibleConversations = conversations.filter((c) => !blockedUserIds.includes(c.participant.id));
  const visibleNotifications = notifications.filter((n) => !blockedUserIds.includes(n.actor.id));

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        reels: visibleReels,
        activeReelIndex,
        setActiveReelIndex,
        isMuted,
        toggleMute,
        toggleLikeReel,
        toggleBookmarkReel,
        savedPosts,
        isBookmarksLoading,
        refreshBookmarks,
        addReelComment,
        toggleFollowUser,
        stories: visibleStories,
        activeStoryIndex,
        openStoryViewer,
        closeStoryViewer,
        markStoryRead,
        addStory,
        liveRooms: visibleLiveRooms,
        activeLiveRoom,
        openLiveRoom,
        closeLiveRoom,
        liveComments,
        sendLiveComment,
        sendLiveGift,
        floatingHearts,
        triggerLiveHeart,
        conversations: visibleConversations,
        activeConversation,
        openConversation,
        closeConversation,
        sendDirectMessage,
        notifications: visibleNotifications,
        unreadNotifsCount,
        unreadDMsCount,
        markNotifAsRead,
        markAllNotifsAsRead,
        activeToast,
        dismissToast,
        createModalOpen,
        openCreateModal,
        closeCreateModal,
        createReel,
        startLiveBroadcast,
        uploadMedia,
        refreshPosts,
        isMobilePreviewFrame,
        toggleMobilePreviewFrame,
        // User Block & Privacy System
        blockedUserIds,
        blockedUsers,
        isUserBlocked,
        blockUser,
        unblockUser,
        toggleBlockUser,
        // Connections & Friend Requests
        connections,
        getConnectionStatusWith,
        sendConnectionRequest,
        acceptConnectionRequest,
        declineConnectionRequest,
        cancelConnectionRequest,
        refreshConnections,
        // Profile Navigation
        viewingProfileUser,
        viewProfileUser,
        // Real-time Presence
        onlineUserIds,
        isUserOnline,
        // Real-time Calling
        activeCall,
        incomingCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleCallMute,
        toggleCallVideo,
        flipCallCamera,
        toggleSpeaker,
        setCallVoiceEffect,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
