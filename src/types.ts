export type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface UserConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt?: string;
  requester?: User;
  receiver?: User;
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  verified?: boolean;
  bio?: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  isFollowing?: boolean;
  isPrivate?: boolean;
  connectionStatus?: ConnectionStatus;
  isIncomingRequest?: boolean;
}

export interface StoryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number; // in seconds
  caption?: string;
  timestamp: string;
  audioTrack?: {
    title: string;
    artist: string;
    url?: string;
    duration?: number;
  };
}

export interface Story {
  id: string;
  user: User;
  items: StoryItem[];
  hasUnread: boolean;
  isLiveNow?: boolean;
}

export interface ReelComment {
  id: string;
  user: User;
  text: string;
  likes: number;
  isLiked?: boolean;
  timestamp: string;
}

export interface Reel {
  id: string;
  user: User;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  tags: string[];
  audioTrack: {
    title: string;
    artist: string;
    albumCover?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  comments: ReelComment[];
  viewsCount: number;
}

export interface LiveGift {
  id: string;
  name: string;
  icon: string;
  cost: number;
  animationColor: string;
}

export interface LiveComment {
  id: string;
  user: User;
  text: string;
  isGift?: boolean;
  giftName?: string;
  giftIcon?: string;
  timestamp: string;
}

export interface LiveRoom {
  id: string;
  title: string;
  host: User;
  category: 'Trending' | 'Music' | 'Gaming' | 'Chat' | 'Creative';
  viewerCount: number;
  previewUrl: string;
  streamUrl?: string;
  startedAt: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  audioDuration?: number; // seconds
  timestamp: string;
  isRead: boolean;
  reactions?: string[];
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: ChatMessage[];
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'live' | 'gift' | 'connection_request' | 'connection_accepted';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: User;
  text: string;
  targetReelThumbnail?: string;
  targetLiveId?: string;
  timestamp: string;
  isRead: boolean;
  connectionId?: string;
  connectionStatus?: ConnectionStatus;
}

export interface BookmarkItem {
  id: string;
  userId: string;
  postId: string;
  postType?: 'reel' | 'story' | 'video' | 'post';
  createdAt: string;
  post?: Reel;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  blockedUser?: User;
  createdAt: string;
}

export type SavedPostReference = BookmarkItem;

export type TabType = 'home' | 'reels' | 'live' | 'dms' | 'messages' | 'notifications' | 'profile' | 'camera' | 'settings' | 'auth' | 'ai_chat';
export type AuthMode = 'login' | 'signup' | 'forgot';

export interface CameraFilter {
  id: string;
  name: string;
  icon: string;
  cssFilter: string;
  overlayStyle?: string;
  previewColor: string;
  description: string;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'incoming' | 'connected' | 'ended';
export type VoiceEffect = 'original' | 'girl' | 'boy';

export interface ActiveCallSession {
  id: string;
  callType: CallType;
  status: CallStatus;
  participant: User;
  isCaller: boolean;
  startedAt?: number;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isCameraFlipped?: boolean;
  voiceEffect?: VoiceEffect;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  networkQuality?: 'excellent' | 'good' | 'poor';
}

export interface CallSignalPayload {
  type: 'call-invite' | 'call-accepted' | 'call-rejected' | 'call-offer' | 'call-answer' | 'call-ice-candidate' | 'call-ended' | 'call-media-state';
  callId: string;
  caller?: User;
  receiverId?: string;
  callType?: CallType;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'paypal' | 'skrill';

export interface WalletTransaction {
  id: string;
  type: 'purchase' | 'withdrawal';
  coins: number;
  fiatAmount: number;
  currency: 'PKR' | 'USD';
  method: PaymentMethodType;
  accountDetails: string;
  accountTitle?: string;
  status: 'completed' | 'processing' | 'failed';
  timestamp: string;
  referenceId: string;
  notes?: string;
}

export interface WalletPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins?: number;
  pricePkr: number;
  priceUsd: number;
  popular?: boolean;
  badge?: string;
}

