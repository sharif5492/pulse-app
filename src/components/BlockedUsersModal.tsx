import React, { useState } from 'react';
import { X, ShieldAlert, UserCheck, Search, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { audioUtils } from '../lib/audioUtils';
import { User } from '../types';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ isOpen, onClose }) => {
  const { blockedUsers, unblockUser, blockedUserIds } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredBlockedUsers = blockedUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  const handleUnblock = (targetUserId: string) => {
    audioUtils.playPop();
    unblockUser(targetUserId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Blocked Accounts</h3>
              <p className="text-[11px] text-slate-400">
                {blockedUserIds.length} {blockedUserIds.length === 1 ? 'account' : 'accounts'} blocked
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioUtils.playPop();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        {blockedUsers.length > 3 && (
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocked users..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500"
            />
          </div>
        )}

        {/* Blocked Accounts List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {filteredBlockedUsers.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-500 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-400">No Blocked Accounts</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                When you block users, they won't be able to find your profile, view your reels or stories, or message/call you.
              </p>
            </div>
          ) : (
            filteredBlockedUsers.map((u: User) => (
              <div
                key={u.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={u.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-white truncate">{u.name || 'User'}</span>
                      {u.verified && (
                        <span className="text-[9px] text-fuchsia-400 font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block">
                      @{u.username || 'username'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(u.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Unblock</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-2 border-t border-slate-800/80 text-center shrink-0">
          <p className="text-[10px] text-slate-500">
            Blocked accounts are synced securely with your Supabase profile preferences.
          </p>
        </div>
      </div>
    </div>
  );
};
