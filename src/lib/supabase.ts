import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserConnection, ConnectionStatus } from '../types';
import { getPersistentAvatar, savePersistentAvatar, optimizeAvatarImage } from './avatarStorage';
import { areUserIdsEqual, getCanonicalConnectionPairKey, normalizeUserId } from '../utils/userIdUtils';

// Retrieve credentials from localStorage (if set by user in Settings) or environment variables
export function getStoredSupabaseConfig() {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') || '' : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();
  const isValid = 
    Boolean(url) && 
    Boolean(anonKey) && 
    !url.includes('xyzcompany') && 
    url.startsWith('https://');

  return { url, anonKey, isValid };
}

const initialConfig = getStoredSupabaseConfig();
export let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = initialConfig.isValid;
export const isValidSupabaseConfig = initialConfig.isValid;

export function initSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  const url = (customUrl !== undefined ? customUrl : config.url).trim();
  const key = (customKey !== undefined ? customKey : config.anonKey).trim();

  if (url && key && url.startsWith('https://') && !url.includes('xyzcompany')) {
    try {
      supabase = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      isSupabaseConfigured = true;
      return supabase;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabase = null;
      isSupabaseConfigured = false;
      return null;
    }
  }

  supabase = null;
  isSupabaseConfigured = false;
  return null;
}

// Initial bootstrap
if (initialConfig.isValid) {
  initSupabaseClient(initialConfig.url, initialConfig.anonKey);
}

export function saveSupabaseCredentials(url: string, anonKey: string): boolean {
  if (typeof window !== 'undefined') {
    if (url.trim() && anonKey.trim()) {
      localStorage.setItem('supabase_url', url.trim());
      localStorage.setItem('supabase_anon_key', anonKey.trim());
    } else {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_anon_key');
    }
  }
  const client = initSupabaseClient(url, anonKey);
  return Boolean(client);
}

export async function testSupabaseTables(): Promise<{
  connected: boolean;
  postsTable: boolean;
  connectionsTable: boolean;
  friendRequestsTable: boolean;
  error?: string;
}> {
  if (!supabase) {
    return {
      connected: false,
      postsTable: false,
      connectionsTable: false,
      friendRequestsTable: false,
      error: 'Supabase client is not initialized. Please enter valid Project URL and Anon Key.',
    };
  }

  let postsOk = false;
  let connsOk = false;
  let frOk = false;

  try {
    const { error: pErr } = await supabase.from('posts').select('id').limit(1);
    postsOk = !pErr || pErr.code !== '42P01'; // 42P01 is table does not exist
  } catch {}

  try {
    const { error: cErr } = await supabase.from('connections').select('id').limit(1);
    connsOk = !cErr || cErr.code !== '42P01';
  } catch {}

  try {
    const { error: fErr } = await supabase.from('friend_requests').select('id').limit(1);
    frOk = !fErr || fErr.code !== '42P01';
  } catch {}

  return {
    connected: true,
    postsTable: postsOk,
    connectionsTable: connsOk,
    friendRequestsTable: frOk,
  };
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

  async signInWithGoogle(): Promise<{ error?: string | null; redirected?: boolean }> {
    if (supabase && isValidSupabaseConfig) {
      try {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const safeRedirectTo = `${currentOrigin}${currentPath}`;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: safeRedirectTo,
            skipBrowserRedirect: false,
          },
        });

        if (error) {
          console.warn('Supabase Google OAuth provider notice:', error.message);
          // Return notice rather than throwing unhandled exception
          return { error: error.message };
        }

        // If data.url is returned or browser initiates redirect
        return { redirected: Boolean(data?.url) };
      } catch (err: any) {
        console.warn('Google OAuth exception caught:', err);
        return { error: err.message || 'Google OAuth authentication failed' };
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

export const profileService = {
  getCacheKey(userId: string): string {
    return `pulse_profile_${userId}`;
  },

  async getProfile(userId: string): Promise<Partial<User> | null> {
    const persistentAvatar = getPersistentAvatar(userId);
    let cachedProfile: Partial<User> | null = null;
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem(this.getCacheKey(userId));
        if (cachedStr) {
          cachedProfile = JSON.parse(cachedStr);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (cachedProfile && persistentAvatar) {
      cachedProfile.avatar = persistentAvatar;
    }

    if (!supabase || !isValidSupabaseConfig) {
      if (persistentAvatar && cachedProfile) {
        cachedProfile.avatar = persistentAvatar;
      }
      return cachedProfile;
    }

    // 1. Try fetching from Supabase 'profiles' table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const fetchedAvatar = persistentAvatar || data.avatar_url || data.avatar || cachedProfile?.avatar;
        const fetched: Partial<User> = {
          id: data.id,
          name: data.full_name || data.name || data.display_name || cachedProfile?.name,
          username: data.username || data.user_name || cachedProfile?.username,
          avatar: fetchedAvatar,
          bio: data.bio ?? data.about ?? cachedProfile?.bio,
          verified: data.verified ?? data.is_verified ?? cachedProfile?.verified,
          followersCount: data.followers_count ?? data.followersCount ?? cachedProfile?.followersCount,
          followingCount: data.following_count ?? data.followingCount ?? cachedProfile?.followingCount,
          likesCount: data.likes_count ?? data.likesCount ?? cachedProfile?.likesCount,
          isPrivate: data.is_private ?? data.isPrivate ?? cachedProfile?.isPrivate,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(this.getCacheKey(userId), JSON.stringify(fetched));
        }
        return fetched;
      }
    } catch (err) {
      // ignore table query errors
    }

    // 2. Try reading from auth.getUser() metadata
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.id === userId && authUser.user_metadata) {
        const meta = authUser.user_metadata;
        const fetchedAvatar = persistentAvatar || meta.avatar_url || meta.avatar || cachedProfile?.avatar;
        const fetched: Partial<User> = {
          id: authUser.id,
          name: meta.full_name || meta.name || authUser.email?.split('@')[0] || cachedProfile?.name,
          username: meta.username || authUser.email?.split('@')[0]?.toLowerCase() || cachedProfile?.username,
          avatar: fetchedAvatar,
          bio: meta.bio ?? cachedProfile?.bio,
          verified: meta.verified ?? cachedProfile?.verified,
          followersCount: meta.followers_count ?? cachedProfile?.followersCount,
          followingCount: meta.following_count ?? cachedProfile?.followingCount,
          likesCount: meta.likes_count ?? cachedProfile?.likesCount,
          isPrivate: meta.is_private ?? cachedProfile?.isPrivate,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(this.getCacheKey(userId), JSON.stringify(fetched));
        }
        return fetched;
      }
    } catch (e) {
      // ignore
    }

    return cachedProfile;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    let finalAvatar = updates.avatar;
    if (finalAvatar) {
      // Save avatar to persistent storage immediately
      try {
        finalAvatar = await optimizeAvatarImage(finalAvatar);
        updates.avatar = finalAvatar;
        await savePersistentAvatar(userId, finalAvatar);
      } catch (err) {
        console.warn('Avatar optimization notice:', err);
      }
    }

    // 1. Cache immediately in localStorage
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem(this.getCacheKey(userId));
        const prev = existing ? JSON.parse(existing) : {};
        const merged = { ...prev, ...updates, id: userId };
        localStorage.setItem(this.getCacheKey(userId), JSON.stringify(merged));
      } catch (e) {
        // ignore
      }
    }

    if (!supabase || !isValidSupabaseConfig) {
      return { success: true };
    }

    try {
      // 2. Update Supabase Auth user_metadata
      const authData: Record<string, any> = {};
      if (updates.name !== undefined) authData.full_name = updates.name;
      if (updates.username !== undefined) authData.username = updates.username;
      if (updates.avatar !== undefined) authData.avatar_url = updates.avatar;
      if (updates.bio !== undefined) authData.bio = updates.bio;
      if (updates.verified !== undefined) authData.verified = updates.verified;
      if (updates.followersCount !== undefined) authData.followers_count = updates.followersCount;
      if (updates.followingCount !== undefined) authData.following_count = updates.followingCount;
      if (updates.likesCount !== undefined) authData.likes_count = updates.likesCount;
      if (updates.isPrivate !== undefined) authData.is_private = updates.isPrivate;

      const { error: authError } = await supabase.auth.updateUser({
        data: authData,
      });
      if (authError) {
        console.warn('Supabase auth.updateUser note:', authError.message);
      }

      // 3. Upsert to 'profiles' table
      const profileRow: Record<string, any> = {
        id: userId,
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) {
        profileRow.full_name = updates.name;
        profileRow.name = updates.name;
      }
      if (updates.username !== undefined) profileRow.username = updates.username;
      if (updates.avatar !== undefined) {
        profileRow.avatar_url = updates.avatar;
        profileRow.avatar = updates.avatar;
      }
      if (updates.bio !== undefined) profileRow.bio = updates.bio;
      if (updates.verified !== undefined) profileRow.verified = updates.verified;
      if (updates.followersCount !== undefined) profileRow.followers_count = updates.followersCount;
      if (updates.followingCount !== undefined) profileRow.following_count = updates.followingCount;
      if (updates.likesCount !== undefined) profileRow.likes_count = updates.likesCount;
      if (updates.isPrivate !== undefined) profileRow.is_private = updates.isPrivate;

      const { error: profileDbErr } = await supabase.from('profiles').upsert([profileRow]);
      if (profileDbErr) {
        // Fallback to 'users' table if 'profiles' table name differs
        try {
          await supabase.from('users').upsert([profileRow]);
        } catch (uErr) {
          // ignore
        }
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Supabase profile sync note:', err?.message || err);
      return { success: false, error: err?.message || 'Sync failed' };
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
    if (!supabase) {
      console.warn('[Supabase] Warning: Supabase client is not connected. Reel saved only in local state. Go to Settings to configure Supabase URL & Key.');
      return null;
    }
    try {
      const row: any = {
        user_id: post.userId || 'usr_anonymous',
        caption: post.caption || '',
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
        console.warn('[Supabase] Primary posts insert notice:', error.message || error);
        if (error.code === '42P01') {
          console.error('[Supabase CRITICAL] Table "posts" does not exist in your Supabase database! Please run supabase-schema.sql in your Supabase SQL Editor.');
          return null;
        }

        // Retry with standard minimal columns
        const minimalRow: any = {
          user_id: post.userId || 'usr_anonymous',
          caption: post.caption || '',
          video_url: post.videoUrl || post.mediaUrl || '',
          media_url: post.mediaUrl || post.videoUrl || '',
          author_name: post.userName,
          author_username: post.userUsername,
          created_at: new Date().toISOString(),
        };
        const res = await supabase.from('posts').insert([minimalRow]).select();
        if (res.error) {
          console.warn('[Supabase] Minimal posts insert fallback also failed:', res.error);
          return null;
        }
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
    const candidateConnections: UserConnection[] = [];

    // 1. Fetch from shared backend API (supports multi-device cross-sync)
    try {
      const resp = await fetch(`/api/connections?userId=${encodeURIComponent(userId)}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.connections)) {
          for (const row of json.connections) {
            candidateConnections.push({
              id: String(row.id),
              requesterId: row.requesterId,
              receiverId: row.receiverId,
              status: row.status as ConnectionStatus,
              createdAt: row.createdAt || new Date().toISOString(),
              updatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
              requester: row.requester || undefined,
              receiver: row.receiver || undefined,
            });
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }

    if (supabase && userId) {
      try {
        const norm = normalizeUserId(userId);
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}${norm ? `,requester_id.eq.${norm},receiver_id.eq.${norm}` : ''}`);

        if (!error && data && data.length > 0) {
          for (const row of data) {
            candidateConnections.push({
              id: String(row.id),
              requesterId: row.requester_id,
              receiverId: row.receiver_id,
              status: row.status as ConnectionStatus,
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
              requester: row.requester_metadata || undefined,
              receiver: row.receiver_metadata || undefined,
            });
          }
        }
      } catch (err) {
        console.warn('Supabase fetchConnections warning:', err);
      }
    }

    // Merge with local cache: Canonical pair key deduplication with newest timestamp winning
    const dedupeMap = new Map<string, UserConnection>();

    const insertCandidate = (conn: UserConnection) => {
      if (conn.status === 'cancelled') return;
      const pairKey = getCanonicalConnectionPairKey(conn.requesterId, conn.receiverId);
      if (!pairKey) return;

      const existing = dedupeMap.get(pairKey);
      if (!existing) {
        dedupeMap.set(pairKey, conn);
      } else {
        // Keep the one with the newest updatedAt timestamp
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTime = new Date(conn.updatedAt || conn.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          dedupeMap.set(pairKey, conn);
        }
      }
    };

    // 1. Add cached first
    for (const c of cached) {
      insertCandidate(c);
    }
    // 2. Add server/Supabase candidates (they will update older cached ones)
    for (const c of candidateConnections) {
      insertCandidate(c);
    }

    const combined = Array.from(dedupeMap.values());
    this.setLocalConnections(userId, combined);
    return combined;
  },

  async sendConnectionRequest(
    requesterId: string, 
    receiverId: string, 
    requesterUser?: User, 
    receiverUser?: User
  ): Promise<UserConnection> {
    const pairKey = getCanonicalConnectionPairKey(requesterId, receiverId);
    const connId = `conn_${normalizeUserId(requesterId)}_${normalizeUserId(receiverId)}`;
    const now = new Date().toISOString();

    const newConn: UserConnection = {
      id: connId,
      requesterId,
      receiverId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      requester: requesterUser,
      receiver: receiverUser,
    };

    // Update requester's local cache immediately
    const currentRequesterList = this.getLocalConnections(requesterId);
    const filtered = currentRequesterList.filter(
      (c) => getCanonicalConnectionPairKey(c.requesterId, c.receiverId) !== pairKey
    );
    this.setLocalConnections(requesterId, [newConn, ...filtered]);

    // Send to shared backend API for instant cross-device delivery
    try {
      await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId,
          receiverId,
          requester: requesterUser,
          receiver: receiverUser,
        }),
      });
    } catch (e) {
      console.warn('Backend connection request error:', e);
    }

    if (supabase) {
      try {
        const connRecord = {
          id: newConn.id,
          requester_id: requesterId,
          sender_id: requesterId,
          receiver_id: receiverId,
          status: 'pending',
          requester_metadata: requesterUser || null,
          receiver_metadata: receiverUser || null,
          created_at: newConn.createdAt,
          updated_at: newConn.updatedAt,
        };
        await supabase.from('connections').upsert([connRecord]);
      } catch (err) {
        console.warn('Supabase sendConnectionRequest warning:', err);
      }
    }

    return newConn;
  },

  async acceptConnectionRequest(connectionId: string, requesterId: string, receiverId: string): Promise<boolean> {
    const pairKey = getCanonicalConnectionPairKey(requesterId, receiverId);
    const now = new Date().toISOString();

    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.map((c) => {
        if (c.id === connectionId || getCanonicalConnectionPairKey(c.requesterId, c.receiverId) === pairKey) {
          return { ...c, status: 'accepted' as ConnectionStatus, updatedAt: now };
        }
        return c;
      });
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    // Sync to shared backend API
    try {
      await fetch('/api/connections/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, requesterId, receiverId, status: 'accepted' }),
      });
    } catch {}

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: now })
          .or(`id.eq.${connectionId},and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId})`);
      } catch (err) {
        console.warn('Supabase acceptConnectionRequest warning:', err);
      }
    }
    return true;
  },

  async declineConnectionRequest(connectionId: string, requesterId: string, receiverId: string): Promise<boolean> {
    const pairKey = getCanonicalConnectionPairKey(requesterId, receiverId);
    const now = new Date().toISOString();

    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.map((c) => {
        if (c.id === connectionId || getCanonicalConnectionPairKey(c.requesterId, c.receiverId) === pairKey) {
          return { ...c, status: 'declined' as ConnectionStatus, updatedAt: now };
        }
        return c;
      });
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    // Sync to shared backend API
    try {
      await fetch('/api/connections/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, requesterId, receiverId, status: 'declined' }),
      });
    } catch {}

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .update({ status: 'declined', updated_at: now })
          .or(`id.eq.${connectionId},and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId})`);
      } catch (err) {
        console.warn('Supabase declineConnectionRequest warning:', err);
      }
    }
    return true;
  },

  async cancelConnectionRequest(requesterId: string, receiverId: string): Promise<boolean> {
    const pairKey = getCanonicalConnectionPairKey(requesterId, receiverId);

    const updateCache = (uId: string) => {
      const list = this.getLocalConnections(uId);
      const updated = list.filter(
        (c) => getCanonicalConnectionPairKey(c.requesterId, c.receiverId) !== pairKey
      );
      this.setLocalConnections(uId, updated);
    };

    updateCache(requesterId);
    updateCache(receiverId);

    try {
      await fetch('/api/connections/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, receiverId }),
      });
    } catch {}

    if (supabase) {
      try {
        await supabase
          .from('connections')
          .delete()
          .or(`and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`);
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
  private onlineUserIds: Set<string> = new Set(); // Real users only
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
            const activeIds = new Set<string>();
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

/**
 * Users Discovery & Search Service
 * Searches profiles across Supabase, Local Storage directory, and predefined active users
 */
export const usersDiscoveryService = {
  getStoredUsers(): User[] {
    try {
      const data = localStorage.getItem('pulse_registered_users');
      const users: User[] = data ? JSON.parse(data) : [];
      const DUMMY_IDS = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6']);
      return users.filter((u) => u && u.id && !DUMMY_IDS.has(u.id));
    } catch {
      return [];
    }
  },

  registerUserLocally(user: User) {
    if (!user || !user.id) return;
    const DUMMY_IDS = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6']);
    if (DUMMY_IDS.has(user.id)) return;
    try {
      const existing = this.getStoredUsers();
      const filtered = existing.filter((u) => u.id !== user.id && u.username !== user.username && !DUMMY_IDS.has(u.id));
      const updated = [user, ...filtered];
      localStorage.setItem('pulse_registered_users', JSON.stringify(updated.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to register user locally:', e);
    }
  },

  async getAllUsers(currentUserId?: string): Promise<User[]> {
    let serverUsers: User[] = [];
    try {
      const resp = await fetch(`/api/users${currentUserId ? `?exclude=${encodeURIComponent(currentUserId)}` : ''}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.users)) {
          serverUsers = data.users;
        }
      }
    } catch {}

    const localUsers = this.getStoredUsers();
    let dbUsers: User[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(50);

        if (!error && data && Array.isArray(data)) {
          dbUsers = data.map((d: any) => ({
            id: d.id,
            name: d.full_name || d.name || 'Pulse Member',
            username: d.username || d.user_name || 'pulsar',
            avatar: d.avatar_url || d.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            bio: d.bio || '',
            verified: Boolean(d.verified),
            followersCount: d.followers_count || 120,
            followingCount: d.following_count || 45,
            likesCount: d.likes_count || 320,
            isPrivate: Boolean(d.is_private),
          }));
        }
      } catch (err) {
        console.warn('Supabase getAllUsers note:', err);
      }
    }

    // Merge distinct users from all sources
    const DUMMY_IDS = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6']);
    const map = new Map<string, User>();
    for (const u of serverUsers) if (u.id && !DUMMY_IDS.has(u.id)) map.set(u.id, u);
    for (const u of dbUsers) if (u.id && !map.has(u.id) && !DUMMY_IDS.has(u.id)) map.set(u.id, u);
    for (const u of localUsers) if (u.id && !map.has(u.id) && !DUMMY_IDS.has(u.id)) map.set(u.id, u);

    return Array.from(map.values()).filter((u) => u.id !== currentUserId);
  },

  async searchUsers(
    query: string, 
    currentUserId?: string, 
    fallbackMockUsers: User[] = []
  ): Promise<{ users: User[]; isSelfQuery: boolean }> {
    const cleanQuery = query.trim().toLowerCase().replace(/^[@#]/, '');
    let serverResults: User[] = [];
    let serverSelfQuery = false;

    // 1. Query shared server registry across all devices
    try {
      const resp = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${encodeURIComponent(currentUserId || '')}`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.users)) {
          serverResults = data.users;
          serverSelfQuery = Boolean(data.isSelfQuery);
        }
      }
    } catch {}

    const allUsers = await this.getAllUsers(currentUserId);

    // Combine distinct users (strictly exclude any dummy IDs)
    const DUMMY_IDS = new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6']);
    const combinedMap = new Map<string, User>();
    for (const u of serverResults) {
      if (u.id && !DUMMY_IDS.has(u.id)) combinedMap.set(u.id, u);
    }
    for (const u of allUsers) {
      if (u.id && !combinedMap.has(u.id) && !DUMMY_IDS.has(u.id)) combinedMap.set(u.id, u);
    }

    const allList = Array.from(combinedMap.values());

    // Check if query is targeting current user's own identity
    let isSelfQuery = serverSelfQuery;
    if (currentUserId && cleanQuery) {
      if (
        currentUserId.toLowerCase() === cleanQuery || 
        currentUserId.toLowerCase().replace('usr_', '') === cleanQuery
      ) {
        isSelfQuery = true;
      }
    }

    if (!cleanQuery) {
      return { 
        users: allList.filter((u) => u.id !== currentUserId), 
        isSelfQuery: false 
      };
    }

    const filtered = allList.filter((u) => {
      // If it's explicitly searching for self, keep self in result list
      if (!isSelfQuery && currentUserId && u.id === currentUserId) {
        return false;
      }
      const matchId = u.id.toLowerCase().includes(cleanQuery) || u.id.toLowerCase().replace('usr_', '').includes(cleanQuery);
      const matchUsername = u.username.toLowerCase().includes(cleanQuery);
      const matchName = u.name.toLowerCase().includes(cleanQuery);
      const matchBio = u.bio ? u.bio.toLowerCase().includes(cleanQuery) : false;
      return matchId || matchUsername || matchName || matchBio;
    });

    return { users: filtered, isSelfQuery };
  },

  async lookupUser(idOrUsername: string): Promise<User | null> {
    if (!idOrUsername) return null;
    const clean = idOrUsername.trim().toLowerCase().replace(/^[@#]/, '');
    try {
      const resp = await fetch(`/api/users/lookup/${encodeURIComponent(clean)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.user) {
          return data.user;
        }
      }
    } catch {}
    return null;
  },
};
