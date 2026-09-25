# PULSE PWA - Whitelabel & Rebranding Guide

This guide explains how to customize, rebrand, and deploy the Pulse Progressive Web App (PWA) under your own brand name, domain, and API keys.

---

## 1. Quick Rebranding Checklist

### 1.1 App Name & Metadata
- **`metadata.json`**: Update `"name"` and `"description"` with your business information.
- **`index.html`**:
  - Change `<title>Pulse - Short Videos, Live Streams & Calls</title>` to your custom app title.
  - Update `<meta name="description">` and OpenGraph tags (`og:title`, `og:description`).
  - Update `<meta name="apple-mobile-web-app-title">` with your brand name.
- **`public/manifest.json`**:
  - Update `"name"`, `"short_name"`, and `"description"`.
  - Update `"theme_color"` and `"background_color"` to match your brand palette.

### 1.2 Logos & App Icons
Replace the following image files in the `/public` directory with your brand logos:
- **`public/icon.svg`**: Main high-definition vector logo.
- **`public/icon-192.png`**: Standard 192x192 PNG icon.
- **`public/icon-512.png`**: High-resolution 512x512 PNG icon.
- **`public/icon-maskable-192.png` & `public/icon-maskable-512.png`**: Android adaptive icons (full bleed with 20% safe-zone margin).
- **`public/apple-touch-icon.png`**: iOS home screen icon (180x180 PNG).

### 1.3 Brand Colors & Styling
- The application is styled using **Tailwind CSS**.
- Primary gradient accents (`#f43f5e` Rose / `#ec4899` Pink / `#8b5cf6` Purple) can be adjusted across components in `/src/components` or customized globally in `/src/index.css`.

---

## 2. Backend & Cloud Integration

Configure your credentials in `.env` (refer to `.env.example`):

### 2.1 Database & Authentication (Supabase / Firebase)
- **`VITE_SUPABASE_URL`**: Your Supabase project URL (`https://your-project.supabase.co`).
- **`VITE_SUPABASE_ANON_KEY`**: Your public client anon key.
- Enable Email/Password auth and Google OAuth in your Supabase Auth dashboard under *Authentication > Providers*.

### 2.2 WebRTC Audio & Video Calling (ZEGOCLOUD)
- **`VITE_ZEGOCLOUD_APP_ID`**: Your ZEGOCLOUD AppID from console.zegocloud.com.
- **`VITE_ZEGOCLOUD_APP_SIGN`**: Your ZEGOCLOUD AppSign key.

### 2.3 Web Push Notifications (OneSignal)
- **`VITE_ONESIGNAL_APP_ID`**: Your OneSignal App ID.
- Alternatively, administrators can configure the OneSignal App ID directly from the in-app **Settings** panel.

---

## 3. Local Development & Deployment

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Run in Development
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 3.3 Build for Production
```bash
npm run build
npm start
```

### 3.4 Deploy to Cloud (Cloud Run, Vercel, VPS)
- **Node.js**: Requires Node 18+.
- **PWA Requirement**: PWA installation and service workers require an HTTPS domain (e.g. via Cloudflare, Let's Encrypt, or managed hosting).

---

## 4. Support & Customization
For technical assistance or custom feature development, refer to your license agreement or contact your developer.
