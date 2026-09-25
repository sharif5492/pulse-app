# 🌟 Pulse - Features & Architecture Overview

Pulse is a modern, responsive, mobile-first social media and interactive video platform designed for creators, short-form video reels, real-time live rooms, encrypted messaging, and digital creator rewards.

---

## ✨ Key Features Breakdown

### 1. 🎥 TikTok/Instagram-Style Reels Feed
- **Vertical Fullscreen Video Feed** with smooth touch gestures, swipe navigation, and keyboard arrow controls.
- **Double-Tap to Like** with floating animated hearts and sound feedback.
- **Interactive Comment Section** with threaded user comments, avatar tags, and real-time like counts.
- **Audio Track Tagging**: Real music metadata displaying rotating vinyl album artwork and track titles.
- **Creator Follow System**: Follow/Unfollow creators with dynamic follower counter updates.
- **Share & Bookmark**: Instant copy-to-clipboard reel links and private bookmarks library.

### 2. 📸 Stories & Ephemeral Highlights
- Top-mounted horizontal stories tray with unread gradient rings.
- Instagram-like timed story viewer with progress segment bars, tap-to-pause, and tap left/right to skip.
- Story camera for snapping instant photo or video stories with custom captions.

### 3. 💬 Real-Time Direct Messaging & Voice Notes
- 1-on-1 encrypted chat conversations with real-time status indicators (Online / Offline).
- **Real Voice Audio Notes**: High-fidelity microphone recorder with sound wave visualizer and audio playback.
- **Photo & Media Sharing**: Upload images from camera or gallery with instant preview.
- **Message Reactions**: Quick emoji reactions (❤️, 😂, 🔥, 👍, 😮).
- **AI Creative Assistant**: Built-in chat bot powered by Gemini AI to help creators write viral video scripts and hashtags.

### 4. 👥 Cross-Device Friend Request & Network System
- **Direct ID & Username Search**: Instant search for any user across the network.
- **QR / Barcode Center**:
  - Personal QR barcode generator for every user.
  - Live camera QR code scanner with auto-focus and screenshot upload scanner.
- **Bi-Directional Friend Requests**: Send, cancel, accept, and decline connection requests with instant real-time sync across mobile PWA and desktop browsers.
- **Celebration Confetti**: Visual celebration animation when mutual friend connections are established.

### 5. 📞 HD Audio & Video Calling
- Built-in WebRTC 1-on-1 voice and video calling.
- Incoming call ringtones, caller avatar identification, mute microphone, flip camera, and speakerphone toggles.
- Real-time call timer and quality indicators.

### 6. 🎙️ Live Rooms & Virtual Gifts
- Live streaming room explorer with live viewer counters and category tags (Trending, Gaming, Music, Creative).
- Real-time live comments and floating virtual gift animations (Roses, Diamonds, Supercars, Pulse Rocket).

### 7. 💳 Multi-Currency Creator Wallet
- Integrated wallet with Coins balance and real-time fiat conversion (PKR / USD).
- Deposit & Top-Up packages.
- Supported Gateways:
  - **JazzCash** (Mobile Account / Direct Debit)
  - **Easypaisa** (Mobile Account / Direct QR)
  - **PayPal** (Global Digital Payments)
  - **Skrill** (Global e-Wallet)
- Transaction ledger recording purchases, withdrawals, and status updates.

### 8. 📱 Progressive Web App (PWA) Ready
- Installable on Android, iOS, Windows, and macOS without needing the Google Play Store or Apple App Store.
- Standalone app mode with custom app icons, splash screens, and offline caching.

---

## 🏗️ Codebase Structure

```
pulse-social-platform/
├── Documentation/                 # Comprehensive documentation for buyers
│   ├── index.html                 # Interactive HTML Documentation
│   ├── API_KEYS_SETUP_GUIDE.md    # API keys setup tutorial
│   ├── INSTALLATION_AND_SETUP.md  # Installation and deployment guide
│   └── FEATURES_AND_STRUCTURE.md  # Features and architecture
├── Database/                      # Database assets
│   ├── supabase-schema.sql        # Supabase PostgreSQL schema & tables
│   └── README.md                  # Quick database import instructions
├── public/                        # Static assets & PWA files
│   ├── icons/                     # PWA app icons (192x192, 512x512, maskable)
│   ├── manifest.json              # Web app manifest for PWA install
│   └── service-worker.js          # Service worker for offline asset caching
├── src/                           # Frontend React & TypeScript source
│   ├── components/                # Modular UI components
│   │   ├── ReelsView.tsx          # Main vertical video reels player
│   │   ├── StoriesBar.tsx         # Stories tray and full-screen viewer
│   │   ├── DirectMessagesView.tsx # Chat rooms and active messaging
│   │   ├── UserSearchModal.tsx    # Friend search and request center
│   │   ├── FriendBarcodeCenter.tsx# QR scanner and barcode generator
│   │   ├── WalletModal.tsx        # Coins wallet and payment modal
│   │   ├── LiveRoomsView.tsx      # Interactive live streaming explorer
│   │   ├── NotificationsView.tsx  # Activity and alert notifications
│   │   └── SettingsView.tsx       # Profile, privacy, and theme settings
│   ├── context/                   # Global React state management
│   │   ├── AppContext.tsx         # Central application state & SSE listeners
│   │   └── AuthContext.tsx        # User authentication & session state
│   ├── lib/                       # Utility libraries and API connectors
│   │   ├── supabase.ts            # Supabase database & storage service
│   │   ├── audioUtils.ts          # Sound effects and audio feedback
│   │   ├── webrtcService.ts       # WebRTC calling signaling
│   │   └── avatarStorage.ts       # Persistent user avatars
│   ├── utils/                     # Helper functions
│   │   └── userIdUtils.ts         # User ID normalization & canonical pairing
│   ├── types.ts                   # TypeScript interfaces & data contracts
│   ├── mockData.ts                # Default seed data and fallback creators
│   ├── App.tsx                    # Root React component and navigation bar
│   ├── main.tsx                   # React 18 DOM entry point
│   └── index.css                  # Tailwind CSS styling and animations
├── server.ts                      # Node.js Express server with Vite middleware
├── vite.config.ts                 # Vite bundler configuration
├── package.json                   # Project dependencies and npm scripts
├── tsconfig.json                  # TypeScript compiler settings
├── .env.example                   # Environment variable template
└── README.md                      # Main project README
```

---

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti, jsQR, QRCode.
- **Backend / Server**: Node.js, Express, Server-Sent Events (SSE).
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Storage Buckets).
- **AI Engine**: Google Gemini API (@google/genai).
- **Real-Time Communication**: WebRTC (Audio/Video calling) & SSE.
- **Build System**: Vite 5.
