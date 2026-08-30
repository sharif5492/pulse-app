import React, { useState } from 'react';
import { X, Camera, Check, Sparkles, User, AtSign, AlignLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { audioUtils } from '../lib/audioUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_PRESETS[0]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioUtils.playPop();
    updateUserProfile({
      name: name.trim() || user.name,
      username: username.trim() || user.username,
      bio: bio.trim(),
      avatar,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Edit Profile</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Profile changes saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Avatar Picker */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <img
                src={avatar}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-fuchsia-500 shadow-lg"
              />
              <span className="absolute bottom-0 right-0 p-1.5 bg-fuchsia-600 rounded-full text-white shadow-md">
                <Camera className="w-3 h-3" />
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(p)}
                  className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
                    avatar === p ? 'border-fuchsia-400 scale-110 ring-2 ring-white/30' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={p} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Username Handle</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-pink-400" />
              <span>Bio & Status</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell Pulse creators about yourself..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 text-white rounded-xl font-bold shadow-lg shadow-fuchsia-950/40 transition-all"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
