# 🔑 Pulse - Complete API Keys & Environment Configuration Guide

This guide walks you through every single API key and configuration setting used in **Pulse (Social Video & Live Streaming Platform)**.

> **Important Security Notice**: Never commit your `.env` file containing real secret keys to public Git repositories (GitHub, GitLab, etc.). Keep a copy of `.env.example` as a template.

---

## 📁 Where to Put Your API Keys

In the root folder of the project, you will find a template file named:
```bash
.env.example
```

1. **Duplicate or rename** `.env.example` to:
   ```bash
   .env
   ```
2. Open `.env` in any code or text editor (VS Code, Notepad, Cursor, etc.).
3. Replace the placeholder values (`YOUR_API_KEY_HERE`) with your actual keys as explained below.

---

## 📋 Summary of All Environment Variables

| Variable Name | Required / Optional | Service / Purpose | Where to Get |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Required** | Cloud Database & Auth URL | [Supabase.com](https://supabase.com) |
| `VITE_SUPABASE_ANON_KEY` | **Required** | Public Anonymous API Key | [Supabase.com](https://supabase.com) |
| `GEMINI_API_KEY` | **Optional** | AI Video/Reel Generator & Assistant | [Google AI Studio](https://aistudio.google.com/) |
| `APP_URL` | **Optional** | Your live production domain/URL | Your domain / hosting provider |
| `VITE_ZEGOCLOUD_APP_ID` | **Optional** | WebRTC Live Audio/Video Rooms | [ZegoCloud](https://zegocloud.com) |
| `VITE_ZEGOCLOUD_APP_SIGN` | **Optional** | ZegoCloud Signing Secret | [ZegoCloud](https://zegocloud.com) |
| `VITE_ONESIGNAL_APP_ID` | **Optional** | Web & Mobile Push Notifications | [OneSignal](https://onesignal.com) |
| `VITE_FIREBASE_API_KEY` | **Optional** | Alternative Firebase Backend | [Firebase Console](https://console.firebase.google.com) |
| `VITE_FIREBASE_PROJECT_ID` | **Optional** | Alternative Firebase Backend | [Firebase Console](https://console.firebase.google.com) |

---

## 1. 🗄️ Supabase Configuration (Database, Real-time & Authentication)

Supabase provides the free PostgreSQL database, authentication (Email/Password, Google OAuth), and storage buckets for avatars, stories, and reels.

### Step-by-Step Instructions:

1. **Create an Account**:
   - Go to [https://supabase.com](https://supabase.com) and click **"Start your project"**.
   - Sign up with GitHub or your email (it is 100% free).

2. **Create a New Project**:
   - Click **"New Project"**.
   - Enter a Name (e.g., `Pulse-Social-App`).
   - Set a strong database password (keep it safe).
   - Choose a region closest to your users.
   - Click **"Create new project"** (takes about 1-2 minutes to provision).

3. **Get Your API URL and Anon Key**:
   - In your Supabase project dashboard, click on the **Settings (Gear icon ⚙️)** on the left sidebar.
   - Click **"API"** under Project Settings.
   - Under **Project URL**, copy the URL (looks like: `https://abcdefghijkl.supabase.co`).
   - Under **Project API Keys**, find the `anon` / `public` key (long string starting with `eyJhbGci...`).
   - Paste them into your `.env` file:
     ```env
     VITE_SUPABASE_URL="https://abcdefghijkl.supabase.co"
     VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     ```

4. **Run the Database Schema**:
   - In your Supabase Dashboard, click **"SQL Editor"** (terminal icon on left sidebar).
   - Click **"+ New Query"**.
   - Open the file `Database/supabase-schema.sql` (or `supabase-schema.sql` in the project root).
   - Copy all its SQL code and paste it into the Supabase SQL Editor.
   - Click the green **"Run"** button at the bottom right.
   - *Result: All tables (`posts`, `connections`, `friend_requests`, `notifications`, `bookmarks`, `user_blocks`, `conversations`) and storage policies are automatically created!*

> 💡 **In-App Config Fallback**: If you run the app without `.env`, users or admins can also connect Supabase directly from inside the app by opening **Settings ⚙️ -> Database & Cloud Sync** and entering their Supabase URL and Anon Key!

---

## 2. 🤖 Google Gemini AI API Key (AI Reel Ideas, Voice & Video Gen)

Pulse includes an AI Assistant that helps creators generate viral video captions, script ideas, and voice notes.

### Step-by-Step Instructions:

1. Go to [https://aistudio.google.com/](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** in the top navigation or sidebar.
4. Click **"Create API key in new project"** (or select an existing Google Cloud project).
5. Copy the generated key (starts with `AIzaSy...`).
6. Paste it into your `.env` file:
   ```env
   GEMINI_API_KEY="AIzaSyYourGeneratedGeminiKeyHere"
   ```

*Note: If you leave this empty, the rest of Pulse (Reels, Chat, Calls, Stories, Audio, Wallet) still functions seamlessly with built-in fallback suggestions.*

---

## 3. 📹 ZegoCloud Configuration (HD Audio/Video Calling & Live Streams)

Pulse includes built-in WebRTC audio & video calling as well as live streaming rooms. ZegoCloud provides generous free monthly minutes.

### Step-by-Step Instructions:

1. Visit [https://www.zegocloud.com/](https://www.zegocloud.com/) and register for a free account.
2. Go to the **Admin Console** -> **Projects** -> **Create Project**.
3. Select **"Voice & Video Call"** or **"Live Streaming"**.
4. Give your project a name (e.g. `PulseLive`).
5. In the project details, copy:
   - **AppID** (a numeric ID like `1234567890`)
   - **AppSign** (a 64-character hex string)
6. Paste them into your `.env` file:
   ```env
   VITE_ZEGOCLOUD_APP_ID="1234567890"
   VITE_ZEGOCLOUD_APP_SIGN="abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
   ```

---

## 4. 🔔 OneSignal Push Notifications (Optional)

Enables real-time push alerts on mobile devices and desktop browsers when someone likes, comments, or sends a friend request.

### Step-by-Step Instructions:

1. Go to [https://onesignal.com/](https://onesignal.com/) and sign up.
2. Click **"New App/Website"**.
3. Select **Web Push** as your platform.
4. Set your site name and live domain URL.
5. In **Settings -> Keys & IDs**, copy your **OneSignal App ID**.
6. Paste it into your `.env` file:
   ```env
   VITE_ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

---

## 5. 💰 Wallet & Payment Gateways Configuration

Pulse includes built-in wallet support for **JazzCash, Easypaisa, PayPal, and Skrill**.
Transactions are securely handled through standard payment intent workflows.
To customize payment receiver numbers/merchant accounts:
- Open `src/types.ts` and `src/components/WalletModal.tsx`.
- Adjust your merchant receiver numbers, titles, or exchange conversion rates (PKR / USD).

---

## 🧪 Testing Your Configuration

Once your `.env` is saved:

```bash
# 1. Start the development server
npm run dev

# 2. Open http://localhost:3000 in your browser
# 3. Check browser console (F12 -> Console):
#    - You will see: "Supabase client initialized successfully"
```

If you encounter any issues, check the `Documentation/INSTALLATION_AND_SETUP.md` guide or open an issue on your Codester purchase page!
