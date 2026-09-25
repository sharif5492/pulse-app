import React, { useEffect, useState } from 'react';
import { audioUtils } from '../lib/audioUtils';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Play quick subtle pulse sound on load
    audioUtils.playPop();

    // Fast, lightweight 900ms display before smooth 200ms fade-out
    const fadeTimer = setTimeout(() => {
      setIsExiting(true);
    }, 900);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1150);

    const safetyTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      clearTimeout(safetyTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(onComplete, 100);
  };

  return (
    <div
      onClick={handleSkip}
      onTouchStart={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-slate-100 select-none overflow-hidden transition-all duration-300 ease-out cursor-pointer ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[90px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute w-60 h-60 bg-pink-500/15 rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Centered Pulse Logo & Wordmark */}
      <div className="relative flex flex-col items-center justify-center space-y-4">
        {/* Glowing Pulse Heart Emblem */}
        <div className="relative flex items-center justify-center animate-bounce duration-1000">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-fuchsia-600/40 via-pink-500/30 to-indigo-600/30 border border-fuchsia-500/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_35px_rgba(217,70,239,0.45)]">
            <svg viewBox="0 0 48 48" className="w-12 h-12 overflow-visible">
              <defs>
                <linearGradient id="splash-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
              <path
                d="M24 40.5C24 40.5 6 28.5 6 16.5C6 10.5 10.5 6 16.5 6C20.2 6 23 8 24 10.5C25 8 27.8 6 31.5 6C37.5 6 42 10.5 42 16.5C42 28.5 24 40.5 24 40.5Z"
                fill="none"
                stroke="url(#splash-heart-grad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]"
              />
              <circle cx="24" cy="21" r="3.5" fill="#ffffff" className="animate-ping origin-center" />
            </svg>
          </div>

          {/* Pulse Expansion Ripple */}
          <div className="absolute inset-0 -m-3 rounded-2xl border border-fuchsia-400/40 animate-ping pointer-events-none" />
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-black italic tracking-[0.25em] bg-gradient-to-r from-pink-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
            PULSE
          </h1>
          <p className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1">
            NEXT-GEN SOCIAL
          </p>
        </div>
      </div>

      {/* Subtle bottom indicator */}
      <div className="absolute bottom-8 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
        <span>Tap anywhere to continue</span>
      </div>
    </div>
  );
};
