import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, CheckCircle, Smartphone } from 'lucide-react';
import { audioUtils } from '../lib/audioUtils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] Application installed successfully to home screen!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    audioUtils.playPop();
    if (!deferredPrompt) {
      // Fallback instruction for iOS Safari or Chrome when already prompted
      alert('To install Pulse on your home screen:\n\n1. Tap the Share or 3-Dots menu in your browser\n2. Select "Add to Home Screen" or "Install App"');
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation prompt');
        setIsInstalled(true);
      } else {
        console.log('[PWA] User dismissed the installation prompt');
      }
    } catch (err) {
      console.warn('[PWA] Installation error:', err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-18 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-45 bg-slate-900/95 border border-rose-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-950/40 border border-white/20">
          <Smartphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white">Install Pulse App</h4>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-extrabold uppercase">PWA</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
            Add to home screen for full-screen camera, instant reels, and offline access.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install Now'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
