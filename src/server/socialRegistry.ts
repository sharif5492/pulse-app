import fs from 'fs';
import path from 'path';

export interface RegisteredUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  verified?: boolean;
  followersCount?: number;
  followingCount?: number;
  likesCount?: number;
  isPrivate?: boolean;
  lastActiveAt: number;
  isOnline?: boolean;
}

export interface ConnectionRecord {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  requester: RegisteredUser;
  receiver: RegisteredUser;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  audioDuration?: number;
  timestamp: string;
  createdAt: number;
}

export interface CallSignalRecord {
  id: string;
  from: string;
  to: string;
  signal: any;
  timestamp: number;
}

const STORAGE_FILE = path.join('/tmp', 'pulse_social_state.json');

// No dummy mock creators - strictly real user devices
const INITIAL_CREATORS: RegisteredUser[] = [];
const DUMMY_IDS = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6']);
const DUMMY_USERNAMES = new Set([
  'elenavance',
  'marcusbeats',
  'sophialux',
  'kaicodes',
  'chloevisuals',
  'liamambient',
  'mayalin'
]);

class SocialRegistry {
  private users: Map<string, RegisteredUser> = new Map();
  private connections: Map<string, ConnectionRecord> = new Map();
  private messages: ChatMessageRecord[] = [];
  private signals: CallSignalRecord[] = [];

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users && Array.isArray(data.users)) {
          for (const u of data.users) {
            if (u.id && !DUMMY_IDS.has(u.id) && !DUMMY_USERNAMES.has(u.username?.toLowerCase())) {
              this.users.set(u.id, u);
            }
          }
        }
        if (data.connections && Array.isArray(data.connections)) {
          for (const c of data.connections) {
            if (
              c.id && 
              !DUMMY_IDS.has(c.requesterId) && 
              !DUMMY_IDS.has(c.receiverId)
            ) {
              this.connections.set(c.id, c);
            }
          }
        }
        if (data.messages && Array.isArray(data.messages)) {
          this.messages = data.messages
            .filter((m: any) => !DUMMY_IDS.has(m.senderId) && !DUMMY_IDS.has(m.receiverId))
            .slice(-500);
        }
      }
      this.saveToDisk();
    } catch (e) {
      console.warn('[SocialRegistry] Disk load notice:', e);
    }
  }

  private saveToDisk() {
    try {
      const data = {
        users: Array.from(this.users.values()),
        connections: Array.from(this.connections.values()),
        messages: this.messages.slice(-500),
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[SocialRegistry] Disk save notice:', e);
    }
  }

  public registerOrUpdateUser(user: Partial<RegisteredUser> & { id: string }): RegisteredUser {
    const existing = this.users.get(user.id);
    const now = Date.now();

    const cleanUsername = (user.username || existing?.username || `user_${user.id.replace('usr_', '')}`)
      .toLowerCase()
      .replace(/^[@#]/, '')
      .trim();

    const updated: RegisteredUser = {
      id: user.id,
      name: user.name || existing?.name || 'Pulse Member',
      username: cleanUsername,
      avatar: user.avatar || existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: user.bio !== undefined ? user.bio : (existing?.bio || 'Exploring beats & reels on Pulse ✨'),
      verified: user.verified !== undefined ? user.verified : (existing?.verified || false),
      followersCount: user.followersCount !== undefined ? user.followersCount : (existing?.followersCount || 10),
      followingCount: user.followingCount !== undefined ? user.followingCount : (existing?.followingCount || 5),
      likesCount: user.likesCount !== undefined ? user.likesCount : (existing?.likesCount || 25),
      isPrivate: user.isPrivate !== undefined ? user.isPrivate : (existing?.isPrivate || false),
      lastActiveAt: now,
      isOnline: true,
    };

    this.users.set(user.id, updated);
    this.saveToDisk();
    return updated;
  }

  public getAllUsers(excludeUserId?: string): RegisteredUser[] {
    const now = Date.now();
    return Array.from(this.users.values())
      .filter((u) => !excludeUserId || u.id !== excludeUserId)
      .map((u) => ({
        ...u,
        // Mark as online if active in last 5 minutes
        isOnline: (now - u.lastActiveAt) < 5 * 60 * 1000,
      }));
  }

  public getUserByIdOrUsername(query: string): RegisteredUser | null {
    if (!query) return null;
    let clean = query.trim().toLowerCase();
    // Handle pulse://user/usr_... or URL formats
    if (clean.includes('pulse://user/')) {
      clean = clean.split('pulse://user/')[1] || clean;
    }
    clean = clean.replace(/^[@#]/, '').trim();

    for (const u of this.users.values()) {
      const uIdLower = u.id.toLowerCase();
      const uUsernameLower = u.username.toLowerCase();
      const uIdWithoutPrefix = uIdLower.replace('usr_', '');
      
      if (
        uIdLower === clean || 
        uUsernameLower === clean ||
        uIdWithoutPrefix === clean ||
        `usr_${clean}` === uIdLower
      ) {
        return u;
      }
    }
    return null;
  }

  public searchUsers(query: string, currentUserId?: string): { users: RegisteredUser[]; isSelfQuery: boolean } {
    const clean = query.trim().toLowerCase().replace(/^[@#]/, '');
    const all = this.getAllUsers();
    
    // Check if user is searching for their own ID / username
    let isSelfQuery = false;
    if (currentUserId && clean) {
      const currentUser = this.users.get(currentUserId);
      if (
        currentUserId.toLowerCase() === clean || 
        currentUserId.toLowerCase().replace('usr_', '') === clean ||
        (currentUser && currentUser.username.toLowerCase() === clean)
      ) {
        isSelfQuery = true;
      }
    }

    if (!clean) {
      return {
        users: all.filter((u) => !currentUserId || u.id !== currentUserId),
        isSelfQuery: false,
      };
    }

    const matches = all.filter((u) => {
      // Don't filter out self if user explicitly typed their own exact ID/username
      if (currentUserId && u.id === currentUserId && !isSelfQuery) {
        return false;
      }

      const matchId = u.id.toLowerCase().includes(clean) || u.id.toLowerCase().replace('usr_', '').includes(clean);
      const matchUsername = u.username.toLowerCase().includes(clean);
      const matchName = u.name.toLowerCase().includes(clean);
      const matchBio = u.bio ? u.bio.toLowerCase().includes(clean) : false;

      return matchId || matchUsername || matchName || matchBio;
    });

    return { users: matches, isSelfQuery };
  }

  // Cross-device Connection Management
  public createConnection(
    requesterId: string, 
    receiverId: string, 
    requesterData?: Partial<RegisteredUser>, 
    receiverData?: Partial<RegisteredUser>
  ): ConnectionRecord {
    const rawReqId = requesterId.trim();
    const rawRecId = receiverId.trim();

    // Resolve canonical user records from registry if present
    const matchedRequester = this.getUserByIdOrUsername(rawReqId);
    const matchedReceiver = this.getUserByIdOrUsername(rawRecId);

    const actualReqId = matchedRequester ? matchedRequester.id : rawReqId;
    const actualRecId = matchedReceiver ? matchedReceiver.id : rawRecId;

    const requester = this.registerOrUpdateUser({ 
      id: actualReqId, 
      ...(matchedRequester || {}),
      ...(requesterData || {}) 
    });

    const receiver = this.registerOrUpdateUser({ 
      id: actualRecId, 
      ...(matchedReceiver || {}),
      ...(receiverData || {}) 
    });

    const now = new Date().toISOString();
    const matchUsers = (id1: string, id2: string) => {
      const a = id1.toLowerCase().trim();
      const b = id2.toLowerCase().trim();
      return a === b || a.replace(/^usr_/, '') === b.replace(/^usr_/, '');
    };

    // Check if ANY connection between these two users already exists
    for (const existing of this.connections.values()) {
      const isMatch = 
        (matchUsers(existing.requesterId, actualReqId) && matchUsers(existing.receiverId, actualRecId)) ||
        (matchUsers(existing.requesterId, actualRecId) && matchUsers(existing.receiverId, actualReqId));

      if (isMatch) {
        // Re-issue friend request cleanly with latest requester & receiver
        existing.requesterId = actualReqId;
        existing.receiverId = actualRecId;
        existing.status = 'pending';
        existing.updatedAt = now;
        existing.requester = requester;
        existing.receiver = receiver;
        this.saveToDisk();
        return existing;
      }
    }

    const id = `conn_${actualReqId}_${actualRecId}`;
    const conn: ConnectionRecord = {
      id,
      requesterId: actualReqId,
      receiverId: actualRecId,
      status: 'pending',
      requester,
      receiver,
      createdAt: now,
      updatedAt: now,
    };

    this.connections.set(id, conn);
    this.saveToDisk();
    return conn;
  }

  public respondConnection(
    connectionIdOrUserIds: { connectionId?: string; requesterId?: string; receiverId?: string },
    status: 'accepted' | 'declined' | 'cancelled'
  ): ConnectionRecord | null {
    let found: ConnectionRecord | null = null;
    const now = new Date().toISOString();

    const matchUsers = (id1: string, id2: string) => {
      const a = id1.toLowerCase().trim();
      const b = id2.toLowerCase().trim();
      return a === b || a.replace(/^usr_/, '') === b.replace(/^usr_/, '');
    };

    if (connectionIdOrUserIds.connectionId && this.connections.has(connectionIdOrUserIds.connectionId)) {
      found = this.connections.get(connectionIdOrUserIds.connectionId)!;
    } else if (connectionIdOrUserIds.requesterId && connectionIdOrUserIds.receiverId) {
      const reqId = connectionIdOrUserIds.requesterId;
      const recId = connectionIdOrUserIds.receiverId;
      for (const c of this.connections.values()) {
        if (
          (matchUsers(c.requesterId, reqId) && matchUsers(c.receiverId, recId)) ||
          (matchUsers(c.requesterId, recId) && matchUsers(c.receiverId, reqId))
        ) {
          found = c;
          break;
        }
      }
    }

    if (found) {
      if (status === 'cancelled') {
        this.connections.delete(found.id);
        this.saveToDisk();
        return { ...found, status: 'cancelled', updatedAt: now };
      }
      found.status = status;
      found.updatedAt = now;
      this.connections.set(found.id, found);
      this.saveToDisk();
      return found;
    }
    return null;
  }

  public removeConnection(id1: string, id2: string): boolean {
    const matchUsers = (a: string, b: string) => {
      const x = a.toLowerCase().trim();
      const y = b.toLowerCase().trim();
      return x === y || x.replace(/^usr_/, '') === y.replace(/^usr_/, '');
    };

    let removed = false;
    for (const [key, c] of this.connections.entries()) {
      if (
        (matchUsers(c.requesterId, id1) && matchUsers(c.receiverId, id2)) ||
        (matchUsers(c.requesterId, id2) && matchUsers(c.receiverId, id1))
      ) {
        this.connections.delete(key);
        removed = true;
      }
    }
    if (removed) {
      this.saveToDisk();
    }
    return removed;
  }

  public getUserConnections(userId: string): ConnectionRecord[] {
    const clean = userId.toLowerCase().trim();
    const cleanWithout = clean.replace(/^usr_/, '');
    return Array.from(this.connections.values()).filter((c) => {
      const reqLower = c.requesterId.toLowerCase().trim();
      const recLower = c.receiverId.toLowerCase().trim();
      const reqWithout = reqLower.replace(/^usr_/, '');
      const recWithout = recLower.replace(/^usr_/, '');
      return (
        reqLower === clean ||
        reqWithout === cleanWithout ||
        recLower === clean ||
        recWithout === cleanWithout
      );
    });
  }

  // Cross-device Messaging
  public saveMessage(msg: {
    conversationId: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    receiverId?: string;
    text: string;
    mediaType?: 'image' | 'video' | 'audio';
    mediaUrl?: string;
    audioDuration?: number;
    timestamp?: string;
  }): ChatMessageRecord {
    const record: ChatMessageRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      receiverId: msg.receiverId,
      text: msg.text,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl,
      audioDuration: msg.audioDuration,
      timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    };

    this.messages.push(record);
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-500);
    }
    this.saveToDisk();
    return record;
  }

  public deleteMessage(messageId: string): boolean {
    const initialLen = this.messages.length;
    this.messages = this.messages.filter((m) => m.id !== messageId);
    if (this.messages.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public getMessagesForUser(userId: string, conversationId?: string, since?: number): ChatMessageRecord[] {
    const cleanUid = userId.toLowerCase().trim();
    const cleanWithout = cleanUid.replace('usr_', '');

    return this.messages.filter((m) => {
      const mSender = (m.senderId || '').toLowerCase().trim();
      const mReceiver = (m.receiverId || '').toLowerCase().trim();
      const mConv = (m.conversationId || '').toLowerCase().trim();

      const matchUser = 
        mSender === cleanUid || 
        mSender.replace('usr_', '') === cleanWithout ||
        mReceiver === cleanUid || 
        mReceiver.replace('usr_', '') === cleanWithout ||
        mConv.includes(cleanUid) ||
        mConv.includes(cleanWithout);

      let matchConv = true;
      if (conversationId) {
        const cleanConv = conversationId.toLowerCase().trim();
        matchConv = mConv === cleanConv || 
          mConv.includes(cleanConv.replace('conv_', '')) ||
          cleanConv.includes(mConv.replace('conv_', ''));
      }

      const matchSince = since !== undefined ? m.createdAt > since : true;
      return matchConv && matchUser && matchSince;
    });
  }

  // WebRTC Signaling
  public sendSignal(from: string, to: string, signal: any): CallSignalRecord {
    const record: CallSignalRecord = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      from,
      to,
      signal,
      timestamp: Date.now(),
    };

    this.signals.push(record);
    // Keep last 100 signals
    if (this.signals.length > 100) {
      this.signals = this.signals.slice(-100);
    }
    return record;
  }

  public getSignalsForUser(userId: string, since?: number): CallSignalRecord[] {
    const now = Date.now();
    // Only return signals from last 60 seconds
    const threshold = since || (now - 60000);
    return this.signals.filter((s) => s.to === userId && s.timestamp > threshold);
  }
}

export const socialRegistry = new SocialRegistry();
