# 🚀 Pulse - Social Video, Reels & Live Stream Platform

<div align="center">
  <img src="public/icons/icon-512x512.png" width="96" height="96" alt="Pulse Logo" style="border-radius: 20px;" />
  <h3>Next-Generation Social Media, Short Video Reels & Creator Ecosystem</h3>
  <p>Full-Stack PWA Built with React 18, TypeScript, Tailwind CSS, WebRTC, Supabase & Express</p>
</div>

---

## 📖 Welcome & Documentation Quick Links

Welcome to the official source code of **Pulse**! To get started immediately, explore the documentation files in the `Documentation/` folder:

- 📑 **Interactive HTML Guide**: Open [`Documentation/index.html`](Documentation/index.html) in your browser.
- 🔑 **API Keys & Setup Guide**: [`Documentation/API_KEYS_SETUP_GUIDE.md`](Documentation/API_KEYS_SETUP_GUIDE.md)
- 💻 **Installation & Deployment**: [`Documentation/INSTALLATION_AND_SETUP.md`](Documentation/INSTALLATION_AND_SETUP.md)
- 🌟 **Features & Architecture**: [`Documentation/FEATURES_AND_STRUCTURE.md`](Documentation/FEATURES_AND_STRUCTURE.md)
- 🗄️ **Database Schema**: [`Database/supabase-schema.sql`](Database/supabase-schema.sql)

---

## ⚡ 3-Minute Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials (see [`Documentation/API_KEYS_SETUP_GUIDE.md`](Documentation/API_KEYS_SETUP_GUIDE.md) for step-by-step instructions).

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at: **`http://localhost:3000`**

---

## 🌟 Key Product Features

- 🎥 **Vertical Video Reels**: Instagram/TikTok-style feed, smooth gestures, double-tap hearts, and rotating audio discs.
- 📸 **Ephemeral Stories**: Horizontal unread story rings, Instagram-style timer progress bars, and instant story creator.
- 💬 **Real-Time Direct Chat & Voice Notes**: 1-on-1 encrypted messaging with microphone audio waveform recording and playback.
- 👥 **Friend Request & Barcode System**: Bi-directional friend requests with real-time sync across devices, QR code generator, and live camera scanner.
- 📞 **WebRTC HD Voice & Video Calling**: 1-on-1 calling with incoming ringtones, camera flip, and mute controls.
- 🎙️ **Live Streaming Explorer**: Live rooms with viewer counts, comments, and animated virtual gifts.
- 💳 **Creator Wallet**: Coins balance with fiat conversion (PKR / USD) and support for JazzCash, Easypaisa, PayPal, and Skrill.
- 📱 **Progressive Web App (PWA)**: 1-click install on Android, iOS, Windows, and macOS without app store approvals.

---

## 📦 Project Scripts

- `npm run dev`: Launch local development server on port 3000.
- `npm run build`: Build production-optimized bundle to `/dist`.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run TypeScript strict type verification.

---

## 🔒 Security Notice

No secret API keys or private credentials are included in this source code package. All keys are managed via the `.env` file or the in-app Settings panel.

---

## 📄 License & Support

For licensing terms, review [`LICENSE.txt`](LICENSE.txt).
If you need assistance, please refer to the documentation or contact support via your Codester purchase page.
