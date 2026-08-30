import React, { useState } from 'react';
import { 
  Sparkles, Lock, Mail, User as UserIcon, ArrowRight, 
  KeyRound, Database, AlertCircle, ShieldCheck, Heart, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AuthMode } from '../types';
import { audioUtils } from '../lib/audioUtils';

export const AuthView: React.FC = () => {
  const { 
    loginWithPassword, 
    signupWithPassword, 
    loginWithGoogle,
    isLoading,
    isSupabaseConfigured
  } = useAuth();
  const { setActiveTab } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'login') {
      if (!email || !password) {
        setErrorMessage('Please enter both email and password.');
        return;
      }
      const res = await loginWithPassword(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in.');
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
        setActiveTab('home');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const res = await loginWithGoogle();
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      audioUtils.playPop();
      setActiveTab('home');
    }
  };

  const fillDemoCredentials = () => {
    audioUtils.playPop();
    setEmail('alex.rivera@pulse.social');
    setPassword('PulsePass123!');
    setName('Alex Rivera');
    setUsername('alexrivera');
  };

  return (
    <div className="w-full max-w-xl mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-between px-4 py-6 text-slate-100 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isSupabaseConfigured ? 'Supabase Live' : 'Sandbox Demo'}</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="my-auto py-4">
        <div className="text-center mb-6 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-pink-500 flex items-center justify-center mx-auto shadow-xl shadow-fuchsia-950/50">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Sign In to Pulse' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Enter your credentials to manage your reels, live streams, and chat with creators.'
              : 'Join Muhammad Sharif’s next-generation social video platform.'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-2xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); audioUtils.playPop(); }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md'
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
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Sharif"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handle</label>
                <div className="relative">
                  <span className="text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="m_sharif"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@pulse.social"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In with Supabase' : 'Complete Registration'}</span>
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
            <span className="bg-slate-950 px-2 text-slate-500 text-[10px] tracking-wider">Or</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all"
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

        {/* Demo Autofill Helper */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Want to test instantly?</span>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 font-bold"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Autofill Demo Creator</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Created by <strong className="text-slate-300">Muhammad Sharif</strong> • Pulse Platform
      </div>
    </div>
  );
};
