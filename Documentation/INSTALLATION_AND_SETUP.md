# 🚀 Pulse - Installation & Deployment Guide

This document provides complete instructions to set up, run, and deploy the **Pulse Social Video & Live Streaming Platform**.

---

## 💻 System Requirements

Before running the application, make sure you have:
- **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **NPM** (comes with Node.js) or **Yarn** / **Bun** / **PNPM**
- A modern web browser (Chrome, Edge, Safari, Firefox, or Brave)
- A code editor such as [Visual Studio Code](https://code.visualstudio.com/)

---

## ⚡ Quick Start (Local Setup)

### Step 1: Extract the Package
Unzip the downloaded package on your computer:
```bash
unzip Pulse-Social-Video-Platform-Codester.zip
cd Pulse-Social-Video-Platform
```

### Step 2: Install Dependencies
Open your terminal inside the project directory and run:
```bash
npm install
```
*(All required libraries including React 18, Vite, Lucide icons, Canvas Confetti, Supabase SDK, Tailwind CSS, and WebRTC helpers will be installed automatically).*

### Step 3: Configure Environment Variables
Copy the `.env.example` file and create a new file named `.env`:
```bash
# On Linux / macOS:
cp .env.example .env

# On Windows (Command Prompt):
copy .env.example .env

# On Windows (PowerShell):
cp .env.example .env
```
Open `.env` and configure your API keys (follow the detailed guide in `Documentation/API_KEYS_SETUP_GUIDE.md`).

### Step 4: Run the Development Server
```bash
npm run dev
```
You will see output similar to:
```
  VITE v5.x.x  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```
Open your browser and navigate to: **`http://localhost:3000`**

---

## 📦 Building for Production

To create an optimized, minified production build:

```bash
npm run build
```
This generates a production-ready `/dist` folder with optimized HTML, CSS, JavaScript, icons, and service worker files.

To test the production build locally:
```bash
npm run preview
```

---

## 🌐 Production Deployment Options

### Option 1: Vercel (Recommended - 1 Click)
1. Push your code to your private GitHub/GitLab repository.
2. Go to [https://vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Framework Preset: **Vite**
5. Root Directory: `./`
6. Under **Environment Variables**, add the keys from your `.env` file (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.).
7. Click **Deploy**. Vercel will build and assign you a fast global HTTPS domain with automatic SSL!

### Option 2: Render / Railway (For Full-Stack Node.js + Express)
Because Pulse includes real-time Server-Sent Events (SSE) and media upload persistence in `server.ts`:
1. Push to GitHub.
2. In [Railway.app](https://railway.app) or [Render.com](https://render.com), create a **Web Service**.
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Add your Environment Variables in the service settings.
6. Deploy!

### Option 3: Traditional VPS (Ubuntu + Nginx + PM2)
1. Connect to your VPS via SSH:
   ```bash
   ssh user@your-server-ip
   ```
2. Install Node.js & PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```
3. Clone or upload your project to `/var/www/pulse`.
4. Install and build:
   ```bash
   cd /var/www/pulse
   npm install
   npm run build
   ```
5. Start with PM2:
   ```bash
   pm2 start "npm start" --name "pulse-app"
   pm2 save
   pm2 startup
   ```
6. Configure Nginx reverse proxy to port `3000` with SSL via Certbot.

---

## 📱 Progressive Web App (PWA) Mobile Installation

Pulse is built as a Progressive Web App (PWA):
1. **On Android (Chrome / Brave / Edge)**:
   - Visit the deployed website URL.
   - Tap the 3 dots menu -> Tap **"Add to Home Screen"** or **"Install App"**.
   - An icon with the Pulse logo appears on your phone screen, launching in full-screen standalone mode with no browser URL bar!
2. **On iOS (Safari)**:
   - Visit the site in Safari.
   - Tap the **Share icon (square with arrow)** at the bottom.
   - Scroll down and tap **"Add to Home Screen"**.
   - Tap **"Add"**.

---

## 🛠️ Project Script Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Express + Vite live development server on port 3000 |
| `npm run build` | Compiles and builds TypeScript and assets for production |
| `npm run preview` | Previews the compiled production build locally |
| `npm run lint` | Runs TypeScript type checking with zero errors |

---

## ❓ Troubleshooting & FAQs

### Q: Why does the app say "Supabase not connected"?
**A**: Ensure you copied `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Alternatively, click **Settings ⚙️ -> Database & Cloud Sync** in the app and paste your keys directly into the UI!

### Q: Can I change the app logo, colors, or name?
**A**: Yes!
- **App Name & Title**: Edit `index.html` and `metadata.json`.
- **Colors & Branding**: Pulse uses Tailwind CSS. You can customize primary colors in `src/index.css` or Tailwind classes (`fuchsia-600`, `indigo-600`, etc.).
- **Icons & Logos**: Replace files in `public/icons/` with your own PNG / SVG icons.

### Q: How do real-time notifications and friend requests work?
**A**: Real-time notifications use Server-Sent Events (SSE) and Supabase Postgres changes, allowing users on different phones and browsers to instantly receive friend requests and chat messages without refreshing.
