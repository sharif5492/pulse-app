import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserConnection, ConnectionStatus } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Validate if environment provides a genuine supabase URL
const isValidSupabaseConfig = 
  Boolean(supabaseUrl) && 
  Boolean(supabaseAnonKey) && 
  !supabaseUrl.includes('xyzcompany') && 
  supabaseUrl.startsWith('https://');

export const isSupabaseConfigured = isValidSupabaseConfig;

export let supabase: SupabaseClient | null = null;

if (isValidSupabaseConfig) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
}

export interface AuthResponse {
  user: {
    id: string;
    email?: string;
    username: string;
    name: string;
    avatar: string;
  } | null;
  error?: string | null;
}

export const authService = {
  isLive: isSupabaseConfigured,
  
  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              username: data.user.user_metadata?.username || email.split('@')[0].toLowerCase(),
              avatar: data.user.user_metadata?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
            },
          };
        }
      } catch (err: any) {
        return { user: null, error: err.message || 'Authentication failed' };
      }
    }
    
    // Demo Mode fallback
    return {
      user: {
        id: 'usr_demo_pulse',
        email,
        name: email.split('@')[0] || 'Pulse Creator',
        username: (email.split('@')[0] || 'pulse_creator').toLowerCase().replace(/[^a-z0-9_]/g, ''),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      },
    };
  },

  async signUpWithPassword(email: string, password: string, name: string, username: string): Promise<AuthResponse> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              username: username,
              avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email,
              name: name || email.split('@')[0],
              username: username || email.split('@')[0].toLowerCase(),
              avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
            },
          };
        }
      } catch (err: any) {
        return { user: null, error: err.message || 'Signup failed' };
      }
    }

    // Demo Mode fallback
    return {
      user: {
        id: `usr_${Date.now()}`,
        email,
        name: name || 'Pulse Member',
        username: username || 'new_pulsar',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      },
    };
  },

  async signInWithGoogle(): Promise<{ error?: string | null }> {
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        return {};
      } catch (err: any) {
        return { error: err.message || 'Google OAuth failed' };
      }
    }

    return { error: null };
  },

  async signOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
  },
};


export const fetchNotifications = async (userId?: string) => {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching notifications:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('Supabase notifications fetch error:', e);
    return [];
  }
};

export const insertNotificationInSupabase = async (payload: {
  userId?: string;
  actor: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  type: 'live' | 'like' | 'comment' | 'gift' | 'follow' | 'mention' | 'connection_request' | 'connection_accepted';
  text: string;
  targetReelThumbnail?: string;
  targetLiveId?: string;
  connectionId?: string;
  connectionStatus?: 'pending' | 'accepted' | 'declined';
}) => {
  if (!supabase) return null;
  try {
    const insertObj: any = {
      user_id: payload.userId || null,
      type: payload.type,
      text: payload.text,
      target_reel_thumbnail: payload.targetReelThumbnail || null,
      target_live_id: payload.targetLiveId || null,
      connection_id: payload.connectionId || null,
      connection_status: payload.connectionStatus || null,
      is_read: false,
      created_at: new Date().toISOString(),
      // Store actor information in flexible ways
      actor_id: payload.actor.id,
      actor_name: payload.actor.name,
      actor_username: payload.actor.username,
      actor_avatar: payload.actor.avatar,
      actor: payload.actor,
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert notification error:', error);
      // Fallback try with minimal columns
      const fallbackObj = {
        type: payload.type,
        text: `${payload.actor.name} ${payload.text}`,
        is_read: false,
      };
      await supabase.from('notifications').insert([fallbackObj]);
    }
    return data;
  } catch (err) {
    console.warn('Failed to insert notification in Supabase:', err);
    return null;
  }
};

export const fetchUnreadNotificationCount = async (userId: string) => {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
};

export const markNotificationRead = async (id: string) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    return null;
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
};

/**
 * Storage Bucket 'media' Helper
 * Uploads video / image assets to Supabase Storage 'media' bucket
 */
export const uploadMediaToStorage = async (
  file: File | Blob,
  pathPrefix = 'posts'
): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const ext = (file as File).name?.split('.').pop() || 'mp4';
    const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload error to media bucket:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('Storage upload exception:', err);
    return null;
  }
};

/**
 * Posts Service
 * Fetches and Inserts real posts/reels/stories to Supabase 'posts' table
 */
export const postsService = {
  async fetchPosts(): Promise<any[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch posts error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Posts fetch exception:', err);
      return [];
    }
  },

  async createPost(post: {
    userId: string;
    userName: string;
    userUsername: string;
    userAvatar: string;
    videoUrl?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption: string;
    tags?: string[];
    audioTitle?: string;
    audioArtist?: string;
    type?: 'reel' | 'story' | 'video' | 'post';
  }) {
    if (!supabase) return null;
    try {
      const row: any = {
        user_id: post.userId,
        caption: post.caption,
        video_url: post.videoUrl || post.mediaUrl || null,
        media_url: post.mediaUrl || post.videoUrl || null,
        thumbnail_url: post.thumbnailUrl || null,
        tags: post.tags || [],
        audio_title: post.audioTitle || 'Original Audio',
        audio_artist: post.audioArtist || post.userName,
        type: post.type || 'reel',
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        bookmarks_count: 0,
        views_count: 1,
        author_name: post.userName,
        author_username: post.userUsername,
        author_avatar: post.userAvatar,
        user_metadata: {
          id: post.userId,
          name: post.userName,
          username: post.userUsername,
          avatar: post.userAvatar,
        },
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('posts')
        .insert([row])
        .select()
        .single();

      if (error) {
        console.warn('Error inserting post to Supabase:', error);
        // Retry with minimal columns in case of strict table schema
        const minimalRow = {
          caption: post.caption,
          video_url: post.videoUrl || post.mediaUrl,
          media_url: post.mediaUrl || post.videoUrl,
          created_at: new Date().toISOString(),
        };
        const res = await supabase.from('posts').insert([minimalRow]).select();
        return res.data?.[0] || null;
      }
      return data;
    } catch (err) {
      console.warn('Create post exception:', err);
      return null;
    }
  },
};

/**
 * Bookmarks & Saved Posts Service
 * Persists and manages user bookmarks in Supabase 'bookmarks' / 'saved_posts' table
 * with seamless local caching and offline fallback.
 */
export const bookmarksService = {
  async fetchBookmarks(userId?: string): Promise<any[]> {
    const fallbackCacheKey = `pulse_bookmarks_${userId || 'guest'}`;
    
    if (supabase && userId) {
      try {
        // Try fetching from 'bookmarks' table
        const { data, error } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Sync with local cache
          try {
            localStorage.setItem(fallbackCacheKey, JSON.stringify(data));
          } catch {}
          return data;
        }

        // Alternative check on 'saved_posts' table if bookmarks table returned error
        if (error) {
          const { data: savedData, error: savedErr } = await supabase
            .from('saved_posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!savedErr && savedData) {
            return savedData;
          }
        }
      } catch (err) {
        console.warn('Bookmarks fetch error from Supabase, loading fallback cache:', err);
      }
    }

    // Return cached bookmarks from localStorage if offline or Supabase table not created
    try {
      const cached = localStorage.getItem(fallbackCacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return [];
  },

  async toggleBookmark(
    userId: string,
    postId: string,
    postData?: any
  ): Promise<{ bookmarked: boolean; data?: any }> {
    const fallbackCacheKey = `pulse_bookmarks_${userId}`;
    let currentCache: any[] = [];
    try {
      const cachedStr = localStorage.getItem(fallbackCacheKey);
      if (cachedStr) currentCache = JSON.parse(cachedStr);
    } catch {}

    const existingIndex = currentCache.findIndex((b) => (b.post_id || b.postId) === postId);
    const willBookmark = existingIndex === -1;

    // Update local cache optimistically
    if (willBookmark) {
      const newBookmark = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        post_id: postId,
        post_type: postData?.type || 'reel',
        created_at: new Date().toISOString(),
        post_data: postData || null,
      };
      currentCache.unshift(newBookmark);
    } else {
      currentCache.splice(existingIndex, 1);
    }

    try {
      localStorage.setItem(fallbackCacheKey, JSON.stringify(currentCache));
    } catch {}

    // Persist to Supabase if connected
    if (supabase && userId) {
      try {
        if (willBookmark) {
          const bookmarkRow = {
            user_id: userId,
            post_id: postId,
            post_data: postData ? {
              id: postData.id,
              caption: postData.caption,
              thumbnailUrl: postData.thumbnailUrl,
              videoUrl: postData.videoUrl,
              user: postData.user,
              likesCount: postData.likesCount,
              commentsCount: postData.commentsCount,
              viewsCount: postData.viewsCount,
            } : null,
            created_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('bookmarks')
            .insert([bookmarkRow])
            .select()
            .single();

          if (error) {
            // Attempt minimal insert or fallback to saved_posts
            try {
              await supabase.from('bookmarks').insert([{ user_id: userId, post_id: postId }]);
            } catch {}
          }

          // Safely increment bookmarks_count on posts table
          try {
            await supabase.rpc('increment_bookmark_count', { post_id_arg: postId });
          } catch {}

          return { bookmarked: true, data: data || bookmarkRow };
        } else {
          // Delete bookmark
          await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);

          return { bookmarked: false };
        }
      } catch (err) {
        console.warn('Error syncing bookmark with Supabase:', err);
      }
    }

    return { bookmarked: willBookmark };
  },

  async fetchBookmarkedPostIds(userId?: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const bookmarks = await this.fetchBookmarks(userId);
      return bookmarks.map((b) => b.post_id || b.postId || b.id).filter(Boolean);
    } catch {
      return [];
    }
  },
};

/**
 * User Block & Privacy Management Service
 * Supports 'blocks' table (blocker_id, blocked_id, blocked_user, created_at)
 * with instant local cache fallback
 */
export interface BlockRecord {
  id: string;
  blocker_id: string;
  blocked_id: string;
  blocked_user?: any;
  created_at: string;
}

export const blocksService = {
  async fetchBlockedUsers(blockerId?: string): Promise<{ blockedIds: string[]; blockedUsers: any[] }> {
    if (!blockerId) return { blockedIds: [], blockedUsers: [] };
    const fallbackCacheKey = `pulse_blocked_${blockerId}`;
    let cachedList: any[] = [];
    try {
      const cached = localStorage.getItem(fallbackCacheKey);
      if (cached) cachedList = JSON.parse(cached);
    } catch {}

    if (supabase && blockerId) {
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('*')
          .eq('blocker_id', blockerId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const ids = data.map((b: any) => b.blocked_id);
          const users = data.map((b: any) => b.blocked_user || { 
            id: b.blocked_id, 
            name: 'Blocked User', 
            username: 'blocked_user',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          });
          
          try {
            localStorage.setItem(fallbackCacheKey, JSON.stringify(data));
          } catch {}

          return { blockedIds: ids, blockedUsers: users };
        }
      } catch (err) {
        console.warn('Supabase fetch blocks fallback active:', err);
      }
    }

    const ids = cachedList.map((b: any) => b.blocked_id || b.blockedId || b.id);
    const users = cachedList.map((b: any) => b.blocked_user || b.blockedUser || b);
    return { blockedIds: ids, blockedUsers: users };
  },

  async blockUser(
    blockerId: string, 
    blockedUser: { id: string; name: string; username: string; avatar: string; verified?: boolean }
  ): Promise<boolean> {
    if (!blockerId || !blockedUser || !blockedUser.id) return false;
    const fallbackCacheKey = `pulse_blocked_${blockerId}`;
    let cachedList: any[] = [];
    try {
      const cached = localStorage.getItem(fallbackCacheKey);
      if (cached) cachedList = JSON.parse(cached);
    } catch {}

    const alreadyBlocked = cachedList.some((b: any) => (b.blocked_id || b.id) === blockedUser.id);
    if (!alreadyBlocked) {
      const newBlock: BlockRecord = {
        id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        blocker_id: blockerId,
        blocked_id: blockedUser.id,
        blocked_user: {
          id: blockedUser.id,
          name: blockedUser.name,
          username: blockedUser.username,
          avatar: blockedUser.avatar,
          verified: blockedUser.verified,
        },
        created_at: new Date().toISOString(),
      };
      cachedList.unshift(newBlock);
      try {
        localStorage.setItem(fallbackCacheKey, JSON.stringify(cachedList));
      } catch {}
    }

    if (supabase && blockerId) {
      try {
        await supabase.from('blocks').upsert([
          {
            blocker_id: blockerId,
            blocked_id: blockedUser.id,
            blocked_user: {
              id: blockedUser.id,
              name: blockedUser.name,
              username: blockedUser.username,
              avatar: blockedUser.avatar,
              verified: blockedUser.verified,
            },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.warn('Supabase blockUser sync warning:', err);
      }
    }
    return true;
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (!blockerId || !blockedId) return false;
    const fallbackCacheKey = `pulse_blocked_${blockerId}`;
    let cachedList: any[] = [];
    try {
      const cached = localStorage.getItem(fallbackCacheKey);
      if (cached) cachedList = JSON.parse(cached);
    } catch {}

    cachedList = cachedList.filter((b: any) => (b.blocked_id || b.id || b.blockedId) !== blockedId);
    try {
      localStorage.setItem(fallbackCacheKey, JSON.stringify(cachedList));
    } catch {}

    if (supabase && blockerId) {
      try {
        await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', blockerId)
          .eq('blocked_id', blockedId);
      } catch (err) {
        console.warn('Supabase unblockUser sync warning:', err);
      }
    }
    return true;
  },
};

/**
 * Real-time Friend Request & Connections Service
 * Manages states: 'pending', 'accepted', 'declined' with Supabase and localStorage fallbacks
 */
export const connectionsService = {
  isLive: isSupabaseConfigured,

  getCacheKey(userId: string): string {
    return `pulse_connections_${userId || 'current'}`;
  },

  getLocalConnections(userId: string): UserConnection[] {
    try {
      const data = localStorage.getItem(this.getCacheKey(userId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setLocalConnections(userId: string, list: UserConnection[]) {
    try {
      localStorage.setItem(this.getCacheKey(userId), JSON.stringify(list));
    } catch {}
  },

  async fetchConnections(userId: string): Promise<UserConnection[]> {
    const cached = this.getLocalConnections(userId);

    if (supabase && userId) {
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

        if (!error && data && data.length > 0) {
          const mapped: UserConnection[] = data.map((row: any) => ({
            id: String(row.id),
            requesterId: row.requester_id,
            receiverId: row.receiver_id,
            status: row.status as ConnectionStatus,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
            requester: row.requester_metadata || undefined,
            receiver: row.receiver_metadata || undefined,
          }));

          // Merge with cached list
          const combined = [...mapped];
          for (const c of cached) {
            if (!combined.some((item) => item.id === c.id || (item.requesterId === c.requesterId && item.receiverId === c.receiverId))) {
              combined.push(c);
            }
          }
          this.setLocalConnections(userId, combined);
          return combined;
        }
      } catch (err) {
        console.warn('Supabase fetchConnections warning:', err);
      }
    }

    return cached;
  },

  async sendConnectionRequest(
    requesterId: string, 
    receiverId: string, 
    requesterUser?: User, 
    receiverUser?: User
  ): Promise<UserConnection> {
    const newConn: UserConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requesterId,
      receiverId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requester: requesterUser,
      receiver: receiverUser,
    };

    // Update requester's local cache
    const currentRequesterList = this.getLocalConnections(requesterId);
    const filtered = currentRequesterList.filter(
      (c) => !(c.requesterId === requesterId && c.receiverId === receiverId) && !(c.requesterId === receiverId && c.receiverId === requesterId)
    );
    this.setLocalConnections(requesterId, [newConn, ...filtered]);

    // Update receiver's local cache if accessible
    const currentReceiverList = this.getLocalConnections(receiverId);
    this.setLocalConnections(receiverId, [newConn, ...currentReceiverList.filter((c) => c.id !== newConn.id)]);

    if (supabase) {
      try {
        await supabase.from('connections').upsert([
          {
            id: newConn.id,
            requester_id: requesterId,
            receiver_id: receiverId,
            status: 'pending',
            requester_metadata: requesterUser || null,
            receiver_metadata: receiverUser || null,
            created_at: newConn.createdAt,
            updated_at: newConn.updatedAt,
          },
        ]);
      } catch (err) {
        console.warn('Supabase sendConnectionRequest warning:', err);
      }
    }

    return newConn;
  },

  async acceptConnectionRequest(connectionId: string, requesterId: string, receiverId: string): Promise<boolean> {
    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.map((c) => {
        if (c.id === connectionId || (c.requesterId === requesterId && c.receiverId === receiverId) || (c.requesterId === receiverId && c.receiverId === requesterId)) {
          return { ...c, status: 'accepted' as ConnectionStatus, updatedAt: new Date().toISOString() };
        }
        return c;
      });
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .or(`id.eq.${connectionId},and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId})`);
      } catch (err) {
        console.warn('Supabase acceptConnectionRequest warning:', err);
      }
    }
    return true;
  },

  async declineConnectionRequest(connectionId: string, requesterId: string, receiverId: string): Promise<boolean> {
    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.map((c) => {
        if (c.id === connectionId || (c.requesterId === requesterId && c.receiverId === receiverId) || (c.requesterId === receiverId && c.receiverId === requesterId)) {
          return { ...c, status: 'declined' as ConnectionStatus, updatedAt: new Date().toISOString() };
        }
        return c;
      });
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .or(`id.eq.${connectionId},and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId})`);
      } catch (err) {
        console.warn('Supabase declineConnectionRequest warning:', err);
      }
    }
    return true;
  },

  async cancelConnectionRequest(requesterId: string, receiverId: string): Promise<boolean> {
    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.filter(
        (c) => !(c.requesterId === requesterId && c.receiverId === receiverId)
      );
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .delete()
          .match({ requester_id: requesterId, receiver_id: receiverId });
      } catch (err) {
        console.warn('Supabase cancelConnectionRequest warning:', err);
      }
    }
    return true;
  },
};

/**
 * Dynamic Push Token & Device Registration Stream
 * Captures native browser / device notification permissions directly
 * and maintains fallback registration token when Firebase Service Account is pending
 */
export interface PushRegistrationResult {
  status: 'granted' | 'denied' | 'default' | 'unsupported';
  token: string | null;
  endpoint?: string;
  source: 'native-browser' | 'service-worker' | 'onesignal-fallback';
}

export const requestAndRegisterPushToken = async (
  userId?: string
): Promise<PushRegistrationResult> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      status: 'unsupported',
      token: null,
      source: 'native-browser',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return {
        status: permission,
        token: null,
        source: 'native-browser',
      };
    }

    // Attempt service worker registration if available
    let deviceToken = `pulse_web_token_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    let endpointUrl: string | undefined;

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        if (registration) {
          const subscription = await registration.pushManager?.getSubscription() || 
            await registration.pushManager?.subscribe({
              userVisibleOnly: true,
              applicationServerKey: new Uint8Array([4, 24, 130, 240, 88, 12, 90, 44]), // fallback standard key
            }).catch(() => null);

          if (subscription) {
            endpointUrl = subscription.endpoint;
            deviceToken = btoa(subscription.endpoint).substring(0, 48);
          }
        }
      } catch (swErr) {
        console.warn('Service worker push registration fallback active:', swErr);
      }
    }

    // Persist registered device token in Supabase notifications/devices if available
    if (supabase && userId) {
      try {
        await supabase.from('device_tokens').upsert([
          {
            user_id: userId,
            token: deviceToken,
            endpoint: endpointUrl || null,
            platform: 'web',
            updated_at: new Date().toISOString(),
          },
        ]);
      } catch {
        // Fallback gracefully without throwing
      }
    }

    // Store token in localStorage for instant retrieval
    try {
      localStorage.setItem('pulse_push_token', deviceToken);
    } catch {
      // safe fallback
    }

    return {
      status: 'granted',
      token: deviceToken,
      endpoint: endpointUrl,
      source: 'service-worker',
    };
  } catch (err) {
    console.warn('Push registration stream exception:', err);
    return {
      status: 'denied',
      token: null,
      source: 'native-browser',
    };
  }
};

/**
 * Direct native or service-worker web notification dispatcher
 */
export const triggerLocalPushNotification = (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: options?.body || 'New live update on Pulse',
        icon: options?.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        badge: options?.badge || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80',
        ...options,
      });
    } catch {
      // fallback in iFrames
    }
  }
};

/**
 * Real-time Online / Offline User Presence Monitoring Service
 * Integrates Supabase Realtime Presence API to track user connectivity lifecycle
 * (joins, leaves, disconnects, tab unloads) and synchronizes user states dynamically.
 */
export interface UserPresenceState {
  user_id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline';
  online_at: string;
  last_seen?: string;
}

export type PresenceChangeCallback = (
  onlineUserIds: Set<string>,
  presenceMap: Map<string, UserPresenceState>
) => void;

class RealtimePresenceService {
  private channel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentUser: UserPresenceState | null = null;
  private onlineUserIds: Set<string> = new Set(['usr_1', 'usr_2', 'usr_4', 'usr_5']); // Default active mock creators
  private presenceMap: Map<string, UserPresenceState> = new Map();
  private listeners: Set<PresenceChangeCallback> = new Set();
  private isInitialized = false;

  constructor() {
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pulse_realtime_presence_mesh');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'PRESENCE_SYNC') {
            const { userId, status, state } = event.data;
            if (status === 'online') {
              this.onlineUserIds.add(userId);
              if (state) this.presenceMap.set(userId, state);
            } else {
              this.onlineUserIds.delete(userId);
              if (state) this.presenceMap.set(userId, { ...state, status: 'offline' });
            }
            this.notifyListeners();
          }
        };
      } catch (err) {
        console.warn('Presence BroadcastChannel fallback initialized:', err);
      }
    }
  }

  /**
   * Initializes presence tracking for the authenticated/active user
   */
  public async initPresence(user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  }) {
    if (!user || !user.id) return;

    this.currentUser = {
      user_id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      status: 'online',
      online_at: new Date().toISOString(),
    };

    this.onlineUserIds.add(user.id);
    this.presenceMap.set(user.id, this.currentUser);
    this.notifyListeners();

    // Broadcast on local mesh
    this.broadcastChannel?.postMessage({
      type: 'PRESENCE_SYNC',
      userId: user.id,
      status: 'online',
      state: this.currentUser,
    });

    // Update backend presence database table if Supabase is active
    if (supabase) {
      try {
        await supabase.from('user_presence').upsert([
          {
            user_id: user.id,
            is_online: true,
            status: 'online',
            last_seen: new Date().toISOString(),
            metadata: {
              name: user.name,
              username: user.username,
              avatar: user.avatar,
            },
          },
        ]);
      } catch (err) {
        console.warn('Backend user_presence upsert notice:', err);
      }

      try {
        // Connect to Supabase Realtime Presence channel
        const channelName = 'pulse_presence_global';
        if (this.channel) {
          supabase.removeChannel(this.channel);
        }

        this.channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        this.channel
          .on('presence', { event: 'sync' }, () => {
            const state = this.channel.presenceState();
            const activeIds = new Set<string>(['usr_1', 'usr_2', 'usr_4', 'usr_5']); // Keep active mock creators
            activeIds.add(user.id);

            Object.keys(state).forEach((key) => {
              activeIds.add(key);
              const userPresences = state[key];
              if (userPresences && userPresences.length > 0) {
                const latest = userPresences[userPresences.length - 1];
                this.presenceMap.set(key, {
                  user_id: key,
                  name: latest.name || 'Pulse Member',
                  username: latest.username || 'user',
                  avatar: latest.avatar || '',
                  status: 'online',
                  online_at: latest.online_at || new Date().toISOString(),
                });
              }
            });

            this.onlineUserIds = activeIds;
            this.notifyListeners();
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
            this.onlineUserIds.add(key);
            if (newPresences && newPresences.length > 0) {
              const latest = newPresences[0];
              this.presenceMap.set(key, {
                user_id: key,
                name: latest.name || 'Pulse Member',
                username: latest.username || 'user',
                avatar: latest.avatar || '',
                status: 'online',
                online_at: latest.online_at || new Date().toISOString(),
              });
            }
            this.notifyListeners();
          })
          .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
            if (key !== user.id) {
              this.onlineUserIds.delete(key);
              const existing = this.presenceMap.get(key);
              if (existing) {
                this.presenceMap.set(key, {
                  ...existing,
                  status: 'offline',
                  last_seen: new Date().toISOString(),
                });
              }
              this.notifyListeners();
            }
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED' && this.currentUser) {
              await this.channel.track(this.currentUser);
            }
          });
      } catch (e) {
        console.warn('Supabase Realtime Presence channel subscription error:', e);
      }
    }

    if (!this.isInitialized && typeof window !== 'undefined') {
      this.isInitialized = true;
      const handleUnload = () => {
        this.setOffline(user.id);
      };
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }

  /**
   * Tracks user leaving or moving offline
   */
  public async setOffline(userId: string) {
    if (!userId) return;
    this.onlineUserIds.delete(userId);
    const existing = this.presenceMap.get(userId);
    if (existing) {
      this.presenceMap.set(userId, {
        ...existing,
        status: 'offline',
        last_seen: new Date().toISOString(),
      });
    }

    this.broadcastChannel?.postMessage({
      type: 'PRESENCE_SYNC',
      userId,
      status: 'offline',
      state: existing ? { ...existing, status: 'offline' } : null,
    });

    this.notifyListeners();

    if (this.channel) {
      try {
        await this.channel.untrack();
      } catch {}
    }

    if (supabase) {
      try {
        await supabase.from('user_presence').upsert([
          {
            user_id: userId,
            is_online: false,
            status: 'offline',
            last_seen: new Date().toISOString(),
          },
        ]);
      } catch {}
    }
  }

  /**
   * Subscribe to live presence changes
   */
  public subscribe(callback: PresenceChangeCallback): () => void {
    this.listeners.add(callback);
    // Initial call
    callback(new Set(this.onlineUserIds), new Map(this.presenceMap));
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if a specific user ID is active/online
   */
  public isUserOnline(userId: string, defaultFallback: boolean = false): boolean {
    if (!userId) return defaultFallback;
    if (this.onlineUserIds.has(userId)) return true;
    const state = this.presenceMap.get(userId);
    if (state) return state.status === 'online';
    return defaultFallback;
  }

  public getOnlineUserIds(): Set<string> {
    return new Set(this.onlineUserIds);
  }

  private notifyListeners() {
    const idsCopy = new Set(this.onlineUserIds);
    const mapCopy = new Map(this.presenceMap);
    this.listeners.forEach((listener) => {
      try {
        listener(idsCopy, mapCopy);
      } catch (err) {
        console.warn('Presence listener error:', err);
      }
    });
  }

  public cleanup() {
    if (this.currentUser) {
      this.setOffline(this.currentUser.user_id);
    }
    if (this.channel && supabase) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const presenceService = new RealtimePresenceService();
