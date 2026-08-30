import React, { useEffect, useState } from 'react';
import { Sparkles, Heart, Activity, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { audioUtils } from '../lib/audioUtils';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [progress, setProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play audio heartbeat on mount and at 1.4s heartbeat intervals
  useEffect(() => {
    if (soundEnabled) {
      audioUtils.playHeartbeat();
      const beatInterval = setInterval(() => {
        audioUtils.playHeartbeat();
      }, 1400);

      return () => clearInterval(beatInterval);
    }
  }, [soundEnabled]);

  // 5 seconds exact countdown and progress bar animation
  useEffect(() => {
    const startTime = Date.now();
    const duration = 5000; // 5000ms = 5 seconds

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(calculatedProgress);

      const rem = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSecondsLeft(rem);

      if (elapsed >= duration) {
        clearInterval(timer);
        onComplete();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in duration-300">
      {/* Background Ambient Glows & Mesh Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-gradient-to-tr from-fuchsia-600/25 via-indigo-600/20 to-pink-500/20 rounded-full blur-[110px] pointer-events-none -z-10 animate-heart-aura" />
      <div className="absolute top-10 left-10 w-44 h-44 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row with Sound Toggle & Skip */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors backdrop-blur-md"
          title={soundEnabled ? "Mute heartbeat sound" : "Unmute heartbeat sound"}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Sound On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span>Muted</span>
            </>
          )}
        </button>

        <button
          onClick={onComplete}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-fuchsia-300 px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-all group backdrop-blur-md"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center 3D Glowing Pulsing Heart & App Identity */}
      <div className="flex flex-col items-center justify-center my-auto text-center space-y-6">
        {/* Pulsing 3D Heart Visual Container */}
        <div className="relative flex items-center justify-center">
          {/* Outer Ripple Rings */}
          <div className="absolute w-44 h-44 rounded-full border border-fuchsia-500/20 animate-ping opacity-60 pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full bg-gradient-to-r from-fuchsia-600/30 to-indigo-600/30 blur-xl animate-heart-aura pointer-events-none" />

          {/* 3D Pulsing Heart Card / Sphere */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 border-2 border-fuchsia-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(217,70,239,0.4)] animate-heartbeat">
            {/* Glossy top reflection */}
            <div className="absolute top-2 left-3 right-3 h-6 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />

            {/* Glowing 3D Heart Symbol */}
            <div className="relative text-fuchsia-500 drop-shadow-[0_4px_20px_rgba(236,72,153,0.8)]">
              <Heart className="w-14 h-14 sm:w-16 sm:h-16 fill-gradient-to-tr from-fuchsia-500 to-pink-500 stroke-white/90 stroke-[1.8] fill-fuchsia-500" />
              <Activity className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 stroke-[2.8]" />
            </div>

            {/* Sparkle badge */}
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-fuchsia-500 to-pink-400 flex items-center justify-center text-white shadow-lg border-2 border-slate-950">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* App Title with High Contrast Vibrant Gradient */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-wider bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent italic drop-shadow-sm">
            PULSE
          </h1>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Next-Gen Social Reels & Live Broadcast
          </p>
        </div>

        {/* Creator Credit with Special Badge */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-fuchsia-500/30 text-xs font-medium text-slate-300 shadow-md backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
            <span>Created by <strong className="text-white font-bold bg-gradient-to-r from-fuchsia-300 to-indigo-200 bg-clip-text text-transparent">Muhammad Sharif</strong></span>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar & 5-Second Countdown */}
      <div className="w-full max-w-xs space-y-2 pb-4 text-center">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
          <span>Starting Pulse...</span>
          <span className="text-fuchsia-400 font-bold">{secondsLeft}s</span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-indigo-500 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(217,70,239,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-[10px] text-slate-500">
          Powered by Supabase Auth & Realtime Media
        </p>
      </div>
    </div>
  );
};
