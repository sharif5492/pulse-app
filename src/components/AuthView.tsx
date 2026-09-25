import React, { useState } from 'react';
import { 
  Sparkles, Lock, Mail, User as UserIcon, ArrowRight, 
  KeyRound, Database, AlertCircle, ShieldCheck, Heart, ArrowLeft,
  Eye, EyeOff, Compass, Gift, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AuthMode } from '../types';
import { audioUtils } from '../lib/audioUtils';

export const AuthView: React.FC = () => {
  const { 
    isAuthenticated,
    loginWithPassword, 
    signupWithPassword, 
    loginWithGoogle,
    continueAsGuest,
    isLoading,
    isSupabaseConfigured
  } = useAuth();
  const { setActiveTab } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (mode === 'login') {
      if (!email || !password) {
        setErrorMessage('Please enter both email and password.');
        return;
      }
      const res = await loginWithPassword(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      } else {
        audioUtils.playPop();
        setActiveTab('home');
      }
    } else {
      if (!email || !password || !name || !username) {
        setErrorMessage('Please fill in all required registration fields.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      const res = await signupWithPassword(email, password, name, username);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        audioUtils.playPop();
        setSuccessNotice('Account created successfully! Welcome to Pulse.');
        setActiveTab('home');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    const res = await loginWithGoogle();
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      audioUtils.playPop();
      setActiveTab('home');
    }
  };

  const handleFastDemoLogin = async () => {
    audioUtils.playPop();
    setErrorMessage(null);
    setEmail('alex.rivera@pulse.social');
    setPassword('PulsePass123!');
    setName('Alex Rivera');
    setUsername('alexrivera');

    // Auto sign in with demo account
    const res = await loginWithPassword('alex.rivera@pulse.social', 'PulsePass123!');
    if (res.success) {
      setActiveTab('home');
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    setActiveTab('home');
  };

  return (
    <div className="w-full max-w-xl mx-auto min-h-[90vh] flex flex-col justify-between px-4 py-6 text-slate-100 select-none">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between w-full">
        {isAuthenticated ? (
          <button
            onClick={() => setActiveTab('home')}
            className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-fuchsia-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent italic">
              PULSE SOCIAL
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-300 backdrop-blur-md shadow-sm ml-auto">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isSupabaseConfigured ? 'Supabase Live' : 'Pulse Cloud'}</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="my-auto py-4 w-full max-w-md mx-auto">
        {/* Brand Emblem & Welcome Text */}
        <div className="text-center mb-6 space-y-2">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-pink-600 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-fuchsia-950/60 ring-2 ring-fuchsia-500/30">
              <Heart className="w-8 h-8 text-white fill-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-1 border-2 border-slate-950">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Sign In to Pulse' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Welcome back! Sign in to watch reels, join live streams, and chat with creators.'
              : 'Join the next-generation video platform and claim your welcome coins bonus!'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In / Register) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-900/90 rounded-2xl mb-5 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); audioUtils.playPop(); }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-900/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); audioUtils.playPop(); }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-900/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Signup Welcome Gift Promo Badge */}
        {mode === 'signup' && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>+500 Pulse Coins</strong> welcome gift instantly on signup!</span>
          </div>
        )}

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Success Notice Banner */}
        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Sharif"
                    required
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Handle</label>
                <div className="relative">
                  <span className="text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="m_sharif"
                    required
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@pulse.social"
                required
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Pulse' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950 px-2 text-slate-500 text-[10px] tracking-wider font-semibold">Or continue with</span>
          </div>
        </div>

        {/* Alternative Auth Buttons */}
        <div className="space-y-2.5">
          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 7 10.1 7z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* 1-Click Fast Demo Login for Instant Evaluation */}
          <button
            type="button"
            onClick={handleFastDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-fuchsia-950/40 to-indigo-950/40 hover:from-fuchsia-950/60 hover:to-indigo-950/60 border border-fuchsia-800/40 hover:border-fuchsia-600/60 text-fuchsia-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-fuchsia-400" />
            <span>Instant Demo Account (1-Click)</span>
          </button>

          {/* Continue as Guest Button */}
          <button
            type="button"
            onClick={handleContinueAsGuest}
            disabled={isLoading}
            className="w-full py-2 bg-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-slate-800"
          >
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Explore Pulse as Guest</span>
          </button>
        </div>
      </div>

      {/* Footer Developer Credits */}
      <div className="text-center text-[11px] text-slate-500 pt-3">
        Created by <strong className="text-slate-300 font-semibold">Muhammad Sharif</strong> • Pulse Platform
      </div>
    </div>
  );
};
