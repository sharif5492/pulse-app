# 🚀 Pulse - Next-Gen Social Video, Reels, Live Streams & WebRTC Calling

<div align="center">
  <img src="public/icon-512.png" width="100" height="100" alt="Pulse Logo" style="border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" />
  <h2>Pulse Social Media Platform</h2>
  <p><strong>TikTok & Instagram-Style Full-Stack PWA | React 18, TypeScript, Tailwind CSS, WebRTC, Supabase & Express</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/WebRTC-HD%20Calling-ff4081.svg?style=flat-square" alt="WebRTC" />
    <img src="https://img.shields.io/badge/PWA-Ready-f59e0b.svg?style=flat-square" alt="PWA" />
    <img src="https://img.shields.io/badge/License-Codester%20Standard-blue.svg?style=flat-square" alt="License" />
  </p>
</div>

---

## 📑 Table of Contents

1. [✨ Key Features](#-key-features)
2. [⚡ 3-Minute Quick Start](#-3-minute-quick-start)
3. [🔑 Complete API Keys Setup Guide](#-complete-api-keys-setup-guide)
   - [1. Supabase (Database & Authentication)](#1-supabase-database--auth---required)
   - [2. ZEGOCLOUD (Video & Voice Calling / Live Streams)](#2-zegocloud-calling--live-streams---optional)
   - [3. Google Gemini AI (AI Creator Assistant)](#3-google-gemini-ai---optional)
   - [4. OneSignal (Push Notifications)](#4-onesignal-push-notifications---optional)
   - [5. Payment Gateways (JazzCash, Easypaisa, PayPal, Skrill)](#5-creator-wallet--payment-gateways)
4. [🗄️ Database Setup in Supabase](#️-database-setup-in-supabase)
5. [🌐 Production Deployment Guide](#-production-deployment-guide)
   - [Deploying to Vercel (1-Click)](#deploy-to-vercel-recommended)
   - [Deploying to Render or Railway](#deploy-to-render--railway)
   - [Deploying to VPS (Ubuntu + Nginx + PM2)](#deploy-to-ubuntu-vps)
6. [📱 Android APK Generation Guide](#-android-apk-generation-guide)
7. [🎨 Whitelabeling & Custom Branding](#-whitelabeling--custom-branding)
8. [📁 Project Structure](#-project-structure)
9. [❓ FAQ & Troubleshooting](#-faq--troubleshooting)

---

## ✨ Key Features

- 🎥 **Full-Screen Vertical Video Reels**: TikTok/Instagram-style gestures, double-tap heart animations, sound rotation discs, comment drawer, bookmarking, and instant sharing.
- 📸 **Ephemeral Stories Tray**: Animated story rings, progressive timer bars, tap navigation, and instant photo/video story creator.
- 📞 **WebRTC HD Voice & Video Calling**: 1-on-1 real-time voice and video calling with ringtones, camera flip, and mute controls.
- 🎙️ **Live Streaming Rooms**: Browse live interactive broadcasts with animated virtual gift explosions, live viewer chat, and host tools.
- 💬 **Encrypted Direct Chat & Voice Notes**: Instant 1-on-1 direct messaging, read delivery receipts, and microphone voice recording with live audio waveform visualization.
- 👥 **Snapchat-Style Friend Barcode System**: Every user gets a unique User ID and custom QR barcode. Scan barcodes with live camera or share WhatsApp invite links.
- 💳 **Creator Monetization Wallet**: Digital coin balance, fiat conversion (PKR / USD), and integrated deposit methods for **JazzCash, Easypaisa, PayPal, and Skrill**.
- 🤖 **Google Gemini AI Integration**: Auto-generate viral video captions, creative hashtag sets, and AI chatbot assistance.
- 📱 **Progressive Web App (PWA)**: 1-click install banner on Android, iOS, Windows, and macOS without app store approvals.

---

## ⚡ 3-Minute Quick Start

### Step 1: Install Dependencies
Open your terminal in the extracted project folder and run:
```bash
npm install
```

### Step 2: Configure Environment File
Create your `.env` file from the provided `.env.example`:
```bash
# Linux / macOS
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell)
cp .env.example .env
```

### Step 3: Run the Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser!

---

## 🔑 Complete API Keys Setup Guide

All keys are configured in your `.env` file (or can be configured inside the app via **Settings ⚙️ -> Database & Cloud Sync**).

### 1. Supabase (Database & Auth) - REQUIRED
Supabase gives you a 100% free PostgreSQL cloud database and user authentication.

1. Go to [https://supabase.com](https://supabase.com) and click **"Start your project"**.
2. Sign in and click **"New Project"**. Enter a project name (e.g. `PulseApp`) and a secure password.
3. In your project dashboard, click **Settings (Gear icon ⚙️)** -> **API**.
4. Copy:
   - **Project URL** (e.g. `https://xyzabcdef.supabase.co`)
   - **Project API Key (`anon` / `public`)** (starts with `eyJ...`)
5. Paste them into your `.env` file:
   ```env
   VITE_SUPABASE_URL="https://xyzabcdef.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

### 2. ZEGOCLOUD (Calling & Live Streams) - OPTIONAL
Provides peer-to-peer WebRTC video calling and live broadcasting with free monthly minutes.

1. Go to [https://www.zegocloud.com](https://www.zegocloud.com) and register for a free account.
2. In the **Admin Console**, click **Create Project** -> select **Voice & Video Call** or **Live Streaming**.
3. Copy your:
   - **AppID** (Numeric ID, e.g. `123456789`)
   - **AppSign** (64-character hexadecimal string)
4. Paste into your `.env` file:
   ```env
   VITE_ZEGOCLOUD_APP_ID="123456789"
   VITE_ZEGOCLOUD_APP_SIGN="abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
   ```

### 3. Google Gemini AI - OPTIONAL
Powers the AI script assistant and viral caption suggestions.

1. Visit [https://aistudio.google.com/](https://aistudio.google.com/).
2. Click **"Get API key"** -> **"Create API key in new project"**.
3. Copy your key (starts with `AIzaSy...`) and paste it into `.env`:
   ```env
   GEMINI_API_KEY="AIzaSyYourGeneratedGeminiKeyHere"
   ```

### 4. OneSignal (Push Notifications) - OPTIONAL
Sends browser and mobile push alerts for new messages, likes, and friend requests.

1. Go to [https://onesignal.com](https://onesignal.com) and create an account.
2. Click **"New App/Website"** -> select **Web Push**.
3. In **Settings -> Keys & IDs**, copy your **OneSignal App ID**.
4. Paste into `.env`:
   ```env
   VITE_ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

### 5. Creator Wallet & Payment Gateways
The app comes pre-configured with support for **JazzCash, Easypaisa, PayPal, and Skrill**.
- To change receiver account titles, phone numbers, or exchange rates, open:
  - `src/types.ts` (PaymentMethodType & WalletTransaction)
  - `src/components/PaymentWalletModal.tsx`
- You can adjust default pricing, coin packages, and merchant accounts in seconds.

---

## 🗄️ Database Setup in Supabase

To initialize all database tables, foreign keys, and indexes:

1. Open your Supabase Dashboard: [https://supabase.com](https://supabase.com).
2. Click **"SQL Editor"** on the left menu (terminal icon `>_`).
3. Click **"+ New Query"**.
4. Open the file `Database/supabase-schema.sql` (or `supabase-schema.sql` in the project root).
5. Copy all contents and paste them into the SQL Editor query window.
6. Click the green **"Run"** button.
7. *Done! Tables for reels (`posts`), stories, friends (`connections`), bookmarks, notifications, and profiles are created with secure Row-Level Security policies.*

---

## 🌐 Production Deployment Guide

### Deploy to Vercel (Recommended)
1. Push your project to a GitHub repository.
2. Go to [https://vercel.com](https://vercel.com) and click **"New Project"**.
3. Import your GitHub repository.
4. Set **Framework Preset**: `Vite`.
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (And any optional keys like `GEMINI_API_KEY`, `VITE_ZEGOCLOUD_APP_ID`).
6. Click **Deploy**. Vercel will build the app and assign a high-speed SSL domain!

### Deploy to Render / Railway
Because Pulse includes an Express server for media uploads and SSE:
1. Create a **Web Service** on [Railway.app](https://railway.app) or [Render.com](https://render.com).
2. Set Build Command: `npm run build`.
3. Set Start Command: `npm start`.
4. Add your `.env` variables and deploy.

### Deploy to Ubuntu VPS
```bash
# 1. Clone repository on VPS
git clone <your-repo-url> pulse
cd pulse

# 2. Install dependencies & build
npm install
npm run build

# 3. Start process with PM2
npm install -g pm2
pm2 start server.ts --name pulse --interpreter tsx
pm2 save
pm2 startup
```

---

## 📱 Android APK Generation Guide

Pulse is 100% PWA compliant and includes full Capacitor Android configuration files:

### Method 1: Automated GitHub Actions (Included!)
1. Look at `.github/workflows/main.yml`.
2. Push your code to your GitHub repository.
3. In GitHub, open the **Actions** tab.
4. Click **Build Android APK** -> **Run Workflow**.
5. When complete, download the built APK from the **Artifacts** section!

### Method 2: Local Android Studio Build
```bash
# 1. Install Capacitor Android bridge
npm install @capacitor/core @capacitor/android
npx cap add android

# 2. Build the web app
npm run build

# 3. Sync web assets to Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```
In Android Studio, click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.

---

## 🎨 Whitelabeling & Custom Branding

To customize the app with your own branding:

1. **Change App Name & Title**:
   - Open `index.html` and update `<title>Pulse</title>` and `<meta name="description">`.
   - Open `public/manifest.json` and change `"name": "Pulse"` and `"short_name": "Pulse"`.
   - Open `metadata.json` and adjust name and description.
2. **Change App Icon & Logo**:
   - Replace `public/icon-192.png`, `public/icon-512.png`, and `public/icon.svg` with your own PNG/SVG logo.
3. **Change Brand Colors**:
   - The app uses Tailwind CSS classes (e.g. `from-fuchsia-600 to-indigo-600`).
   - You can global search and replace gradient classes with your brand colors (e.g. `from-emerald-500 to-teal-500`).

---

## 📁 Project Structure

```
├── .github/
│   └── workflows/main.yml        # Automated Android APK compilation workflow
├── Database/
│   └── supabase-schema.sql       # Full PostgreSQL database schema & tables
├── Documentation/
│   ├── index.html                # Interactive HTML documentation
│   ├── API_KEYS_SETUP_GUIDE.md   # Step-by-step key acquisition guide
│   ├── INSTALLATION_AND_SETUP.md # Detailed server installation guide
│   └── FEATURES_AND_STRUCTURE.md # Technical architectural guide
├── public/                       # PWA manifest, service workers & app icons
├── src/
│   ├── components/               # UI Views (Reels, Stories, Chat, Calls, Wallet, Profile)
│   ├── context/                  # AppContext & AuthContext state providers
│   ├── hooks/                    # WebRTC Call hooks
│   ├── lib/                      # Supabase client, WebRTC, ZegoCloud & Audio utilities
│   ├── types.ts                  # Complete TypeScript definitions
│   └── App.tsx                   # Main React entry point
├── server.ts                     # Full-Stack Express server with media persistence
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite build configuration with Tailwind CSS v4
```

---

## ❓ FAQ & Troubleshooting

#### Q: Does the app work without Supabase credentials?
**A:** Yes! Pulse includes an intelligent offline/demo mode with local persistence, mock data, and persistent avatar storage so you can test all features immediately without any configuration.

#### Q: How do users add friends?
**A:** Users can share their unique User ID, generate a custom QR barcode, share a direct WhatsApp invite link, or search by username/ID in the Add Friends modal.

#### Q: Can I upload video reels from mobile phones?
**A:** Yes! The Create Reel modal allows selecting any MP4/WebM video from phone galleries or recording directly from the camera.

---

## 📄 License & Support

Distributed under standard marketplace licensing.  
If you need any assistance, reach out via your **Codester Purchase / Messages page**.
We respond promptly to all verified buyers! ⭐⭐⭐⭐⭐
