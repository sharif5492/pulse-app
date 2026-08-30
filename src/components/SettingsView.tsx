import React, { useState } from 'react';
import { 
  ArrowLeft, Shield, Lock, Bell, Moon, Eye, 
  Smartphone, Database, LogOut, Sparkles, Heart, 
  Check, RefreshCw, Volume2, UserCheck, HelpCircle, KeyRound, ChevronRight,
  ShieldAlert, UserX
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BlockedUsersModal } from './BlockedUsersModal';
import { audioUtils } from '../lib/audioUtils';

interface SettingsViewProps {
  onReplaySplash?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onReplaySplash }) => {
  const { setActiveTab, blockedUserIds, blockedUsers } = useApp();
  const { user, logout, isSupabaseConfigured, openAuthModal, pulseCoins, addCoins } = useAuth();

  // Settings State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [autoplayReels, setAutoplayReels] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [liveStreamAlerts, setLiveStreamAlerts] = useState(true);
  const [dmAlerts, setDmAlerts] = useState(true);
  const [themeMode, setThemeMode] = useState<'slate' | 'oled' | 'neon'>('slate');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  const handleToggleSound = () => {
    setSoundEffects(!soundEffects);
    if (!soundEffects) {
      audioUtils.playPop();
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback('Password updated successfully!');
    setTimeout(() => {
      setPasswordFeedback(null);
      setShowPasswordChangeModal(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-5 pb-24 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('profile')}
            className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Settings & Preferences</h1>
            <p className="text-[11px] text-slate-400">Account security, privacy, and display</p>
          </div>
        </div>

        {onReplaySplash && (
          <button
            onClick={() => {
              audioUtils.playHeartbeat();
              onReplaySplash();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold hover:bg-fuchsia-500/25 transition-all"
            title="Replay 5-second Splash Screen"
          >
            <Heart className="w-3.5 h-3.5 text-fuchsia-400 fill-fuchsia-400" />
            <span>Splash Intro</span>
          </button>
        )}
      </div>

      {/* Section 1: Account Security */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Account Security</span>
        </h2>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Two-Factor Authentication (2FA)</div>
              <div className="text-[11px] text-slate-400">Require verification code for new logins</div>
            </div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setTwoFactorEnabled(!twoFactorEnabled);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                twoFactorEnabled ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Change Password</div>
              <div className="text-[11px] text-slate-400">Update Supabase password credentials</div>
            </div>
            <button
              onClick={() => setShowPasswordChangeModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 transition-colors"
            >
              Update
            </button>
          </div>

          {/* Supabase connection indicator */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-white">Supabase Auth State</div>
                <div className="text-[10px] text-slate-400">
                  {isSupabaseConfigured ? 'Production Live Supabase Connected' : 'Demo Sandbox Mode Active'}
                </div>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-semibold underline"
            >
              Switch User
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Privacy & Safety */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>Privacy & Safety</span>
        </h2>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Private Account</div>
              <div className="text-[11px] text-slate-400">Only approved followers can view your reels & stories</div>
            </div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setIsPrivateAccount(!isPrivateAccount);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                isPrivateAccount ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Show Activity Status</div>
              <div className="text-[11px] text-slate-400">Allow accounts you message to see when you are active</div>
            </div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setShowActivityStatus(!showActivityStatus);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                showActivityStatus ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Blocked Accounts</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.2 rounded-full font-bold border border-rose-500/30">
                  {blockedUserIds.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Manage users you have blocked from messaging and calling</div>
            </div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setIsBlockedModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Theme & Display */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Moon className="w-3.5 h-3.5 text-pink-400" />
          <span>Theme & Preferences</span>
        </h2>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-white mb-2">Color Atmosphere</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'slate', name: 'Dark Slate', desc: 'Vibrant' },
                { id: 'oled', name: 'OLED Black', desc: 'True Black' },
                { id: 'neon', name: 'Cyber Neon', desc: 'Fuchsia Glow' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setThemeMode(item.id as any)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    themeMode === item.id
                      ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">{item.name}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Autoplay Reels</div>
              <div className="text-[11px] text-slate-400">Stream video reels continuously on mobile scroll</div>
            </div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setAutoplayReels(!autoplayReels);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoplayReels ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Sound Effects & Haptics</div>
              <div className="text-[11px] text-slate-400">Audio cues on like, camera snap, and heartbeat</div>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                soundEffects ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Notifications Management */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Notifications Management</span>
        </h2>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-white">Push Notifications</div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setPushNotifications(!pushNotifications);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                pushNotifications ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-xs font-semibold text-white">Live Broadcast Start Alerts</div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setLiveStreamAlerts(!liveStreamAlerts);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                liveStreamAlerts ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-xs font-semibold text-white">Direct Message Alerts</div>
            <button
              onClick={() => {
                audioUtils.playPop();
                setDmAlerts(!dmAlerts);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                dmAlerts ? 'bg-fuchsia-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: Creator Credits & App Info */}
      <div className="rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-850 border border-fuchsia-500/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Pulse Mobile Experience</div>
              <div className="text-[10px] text-fuchsia-300 font-medium">Version 2.4.0 (Production Build)</div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-fuchsia-400 fill-fuchsia-400" />
            <span>Developer Credit</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Created with passion by <strong className="text-white font-bold bg-gradient-to-r from-fuchsia-300 to-indigo-200 bg-clip-text text-transparent">Muhammad Sharif</strong>
          </p>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Pulse</span>
        </button>
      </div>

      {/* Password Change Dialog Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Update Password</h3>
            {passwordFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{passwordFeedback}</span>
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-xl font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked Accounts Management Modal */}
      <BlockedUsersModal
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
      />
    </div>
  );
};
