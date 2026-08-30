import React from 'react';
import { Phone, PhoneOff, Video, Sparkles } from 'lucide-react';
import { ActiveCallSession } from '../types';
import { audioUtils } from '../lib/audioUtils';

interface IncomingCallDialogProps {
  session: ActiveCallSession;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  session,
  onAccept,
  onReject,
}) => {
  const isVideo = session.callType === 'video';

  return (
    <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-[60] animate-in slide-in-from-top duration-300">
      <div className="bg-slate-900/95 backdrop-blur-2xl border-2 border-fuchsia-500/60 rounded-3xl p-4 shadow-2xl shadow-fuchsia-950/60 flex flex-col gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={session.participant.avatar}
              alt={session.participant.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-fuchsia-500/80 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 p-1 bg-fuchsia-600 rounded-full text-white border-2 border-slate-950 shadow">
              {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white truncate">{session.participant.name}</h3>
              {session.participant.verified && (
                <span className="text-[10px] text-fuchsia-400 font-bold">✓</span>
              )}
            </div>
            <p className="text-xs text-fuchsia-400 font-semibold animate-pulse mt-0.5">
              {isVideo ? 'Incoming HD Video Call...' : 'Incoming HD Audio Call...'}
            </p>
            <span className="text-[10px] text-slate-400">@{session.participant.username}</span>
          </div>
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => {
              audioUtils.playPop();
              onReject();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => {
              audioUtils.playPop();
              onAccept();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/40 text-xs font-bold flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
