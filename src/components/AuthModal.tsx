import React, { useState } from 'react';
import { 
  X, Lock, Mail, User as UserIcon, Sparkles, ShieldCheck, 
  Database, AlertCircle, ArrowRight, CheckCircle2, KeyRound 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthMode } from '../types';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    closeAuthModal, 
    authMode, 
    loginWithPassword, 
    signupWithPassword, 
    loginWithGoogle,
    isLoading,
    isSupabaseConfigured,
    user
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(authMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  if (!authModalOpen) return null;

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
      }
    } else {
      if (!email || !password || !name || !username) {
        setErrorMessage('Please fill in all registration fields.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      const res = await signupWithPassword(email, password, name, username);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const res = await loginWithGoogle();
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('alex.rivera@pulse.social');
    setPassword('PulsePass123!');
    setName('Alex Rivera');
    setUsername('alexrivera');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 mb-3 shadow-lg shadow-fuchsia-900/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Welcome Back to Pulse' : 'Join Pulse Community'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' 
              ? 'Access your reels, live streams, and direct messages' 
              : 'Create reels, join live broadcasts, and connect instantly'}
          </p>
        </div>

        {/* Supabase Integration Status Pill */}
        <div className="mb-5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <div>
              <span className="font-semibold text-slate-200">Supabase Integration: </span>
              <span className={isSupabaseConfigured ? 'text-emerald-400 font-medium' : 'text-indigo-400 font-medium'}>
                {isSupabaseConfigured ? 'Connected & Active' : 'Demo / Sandbox Ready'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-medium underline underline-offset-2"
          >
            {showConfigGuide ? 'Hide Info' : 'Details'}
          </button>
        </div>

        {/* Supabase Config Diagnostic drawer */}
        {showConfigGuide && (
          <div className="mb-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Supabase Auth & Database Config</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pulse connects directly to Supabase Auth. To bind your live production database, set your environment variables:
            </p>
            <div className="bg-slate-900 p-2 rounded-lg font-mono text-[10px] text-fuchsia-300 space-y-1 overflow-x-auto">
              <div>VITE_SUPABASE_URL="https://your-app.supabase.co"</div>
              <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."</div>
            </div>
            <p className="text-[11px] text-slate-400">
              *While in preview sandbox mode, authentication falls back smoothly to interactive local persistence.
            </p>
          </div>
        )}

        {/* Auth Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login' 
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup' 
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up (+500 🪙)
          </button>
        </div>

        {/* Signup Welcome Bonus Banner */}
        {mode === 'signup' && (
          <div className="mb-4 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/40 flex items-center gap-2.5 animate-in fade-in">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shrink-0">
              🎁
            </div>
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-amber-300">Sign Up Bonus: </span>
              <span className="text-slate-200">Get <strong className="text-white font-black">+500 Free Coins</strong> instantly to send live gifts and boost your profile!</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Vance"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <span className="text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="elenavance"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@pulse.social"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 text-white text-xs font-semibold rounded-xl shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Log In with Supabase' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500 text-[10px] tracking-wider">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all"
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

        {/* Quick Demo Credentials Autofill Helper */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Want to test instantly?</span>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 font-medium"
          >
            <KeyRound className="w-3 h-3" />
            <span>Autofill Demo User</span>
          </button>
        </div>
      </div>
    </div>
  );
};
