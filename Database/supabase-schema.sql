-- =======================================================
-- PULSE PWA - SUPABASE DATABASE COMPLETE SETUP SCRIPT
-- =======================================================
-- Run this SQL in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard
-- 2. Open your Project -> Click "SQL Editor" on the left menu
-- 3. Click "+ New Query"
-- 4. Paste this entire script and click "Run" (green button)
-- =======================================================

-- 1. POSTS & REELS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'usr_anonymous',
  author_name TEXT DEFAULT 'Pulse User',
  author_username TEXT DEFAULT 'user',
  author_avatar TEXT,
  caption TEXT,
  video_url TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  audio_title TEXT DEFAULT 'Original Audio',
  audio_artist TEXT DEFAULT 'Original Artist',
  type TEXT DEFAULT 'reel',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  bookmarks_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 1,
  user_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.connections (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requester_metadata JSONB,
  receiver_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_username TEXT,
  actor_avatar TEXT,
  type TEXT NOT NULL,
  text TEXT,
  post_id TEXT,
  media_url TEXT,
  connection_id TEXT,
  connection_status TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  username TEXT UNIQUE,
  avatar TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ENABLE ROW LEVEL SECURITY & OPEN POLICIES
-- Ensures data can be read, created, and queried without permission errors
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public posts read" ON public.posts;
CREATE POLICY "Public posts read" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public posts insert" ON public.posts;
CREATE POLICY "Public posts insert" ON public.posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public posts update" ON public.posts;
CREATE POLICY "Public posts update" ON public.posts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public posts delete" ON public.posts;
CREATE POLICY "Public posts delete" ON public.posts FOR DELETE USING (true);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public connections all" ON public.connections;
CREATE POLICY "Public connections all" ON public.connections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public friend_requests all" ON public.friend_requests;
CREATE POLICY "Public friend_requests all" ON public.friend_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notifications all" ON public.notifications;
CREATE POLICY "Public notifications all" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles all" ON public.profiles;
CREATE POLICY "Public profiles all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public bookmarks all" ON public.bookmarks;
CREATE POLICY "Public bookmarks all" ON public.bookmarks FOR ALL USING (true) WITH CHECK (true);

-- 8. ENABLE REALTIME SYNC (Optional: for instant sync across devices)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
