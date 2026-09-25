# 🗄️ Database Setup Instructions

This folder contains the complete, ready-to-run PostgreSQL schema for **Pulse**.

---

## ⚡ How to Import Into Supabase

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Click the **SQL Editor** tab (the `>_` icon on the left sidebar).
4. Click **"+ New Query"**.
5. Open the `supabase-schema.sql` file in this folder, select all text (`Ctrl+A` or `Cmd+A`), and copy it.
6. Paste the SQL code into the Supabase SQL editor window.
7. Click the green **"Run"** button in the bottom right corner.
8. That's it! All required tables, default values, and indexes are now created and ready to use.

---

## 📋 Tables Included in Schema

1. `posts` - Vertical reels, stories, video URLs, captions, tags, audio tracks, and counters.
2. `connections` - Bi-directional friend connections and mutual statuses (`pending`, `accepted`, `declined`, `cancelled`).
3. `friend_requests` - Incoming/outgoing request tracking.
4. `notifications` - In-app alerts, likes, comments, friend requests, and system updates.
5. `bookmarks` - Saved reels and creator bookmarks.
6. `user_blocks` - Blocked user registry and privacy protection.
7. `conversations` - Chat messaging threads and participant metadata.
