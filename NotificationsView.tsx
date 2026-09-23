import React, { useState } from 'react';
import { 
  Bell, Heart, MessageCircle, Radio, Gift, Sparkles, 
  CheckCheck, UserPlus, AtSign, ArrowRight, BellRing, CheckCircle,
  Check, X, UserCheck, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { requestAndRegisterPushToken } from '../lib/supabase';
import { NotificationType, NotificationItem } from '../types';
import { audioUtils } from '../lib/audioUtils';

export const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    markNotifAsRead, 
    markAllNotifsAsRead, 
    openLiveRoom, 
    liveRooms,
    setActiveTab, 
    setActiveReelIndex,
    viewProfileUser,
    acceptConnectionRequest,
    declineConnectionRequest,
    getConnectionStatusWith,
    startChatWithUser,
  } = useApp();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType | 'connection_request'>('all');
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const handleEnablePush = async () => {
    const res = await requestAndRegisterPushToken(user?.id);
    if (res.status === 'granted') {
      setPushStatus('granted');
    } else {
      setPushStatus('denied');
    }
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'connection_request', label: 'Requests' },
    { id: 'live', label: 'Live' },
    { id: 'like', label: 'Likes' },
    { id: 'comment', label: 'Comments' },
    { id: 'gift', label: 'Gifts' },
    { id: 'mention', label: 'Mentions' },
    { id: 'follow', label: 'Followers' },
  ];

  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter((n) => {
        if (activeFilter === 'connection_request') {
          return n.type === 'connection_request' || (n.type === 'follow' && n.connectionStatus === 'pending');
        }
        return n.type === activeFilter;
      });

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="w-3.5 h-3.5 text-amber-400" />;
      case 'connection_accepted':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'live':
        return <Radio className="w-3.5 h-3.5 text-fuchsia-400" />;
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />;
      case 'gift':
        return <Gift className="w-3.5 h-3.5 text-amber-400" />;
      case 'mention':
        return <AtSign className="w-3.5 h-3.5 text-purple-400" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-fuchsia-400" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotifAsRead(item.id);
    if (item.type === 'live' && item.targetLiveId) {
      const room = liveRooms.find((r) => r.id === item.targetLiveId);
      if (room) {
        openLiveRoom(room);
      } else if (liveRooms.length > 0) {
        openLiveRoom(liveRooms[0]);
      }
    } else if (item.type === 'like' || item.type === 'comment') {
      setActiveTab('reels');
      setActiveReelIndex(0);
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted' || item.type === 'follow') {
      if (item.type === 'connection_accepted' || item.connectionStatus === 'accepted') {
        startChatWithUser(item.actor);
      } else {
        viewProfileUser(item.actor);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header & Mark all as read */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Notifications</h2>
          <p className="text-xs text-slate-400">Activity alerts, connection requests & live broadcasts</p>
        </div>

        <button
          onClick={markAllNotifsAsRead}
          className="flex items-center gap-1 text-xs text-fuchsia-400 hover:text-fuchsia-300 font-semibold px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Push Notification Fallback Banner */}
      {pushStatus !== 'granted' && (
        <div className="p-3 bg-gradient-to-r from-fuchsia-950/60 to-indigo-950/60 border border-fuchsia-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Live Push Stream</p>
              <p className="text-[11px] text-slate-400 truncate">Receive real-time alerts directly on this device</p>
            </div>
          </div>
          <button
            onClick={handleEnablePush}
            className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-xs rounded-xl shrink-0 transition-colors shadow-sm"
          >
            Enable
          </button>
        </div>
      )}

      {pushStatus === 'granted' && (
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Push notification stream active on this device</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === f.id
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-14 bg-slate-900/40 rounded-3xl border border-slate-850 p-6">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No notifications in this filter</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live alerts and new interactions will show up here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif, idx) => {
            const isConnectionReq =
              notif.type === 'connection_request' ||
              (notif.type === 'follow' && notif.connectionStatus === 'pending');
            const connectionStatus = notif.connectionStatus || (isConnectionReq ? 'pending' : undefined);
            const isPending = connectionStatus === 'pending';
            const isAccepted = connectionStatus === 'accepted' || notif.type === 'connection_accepted';
            const isDeclined = connectionStatus === 'declined';

            return (
              <div
                key={`${notif.id}-${idx}`}
                onClick={() => handleNotificationClick(notif)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                  notif.isRead
                    ? 'bg-slate-900/50 border-slate-850 hover:bg-slate-900'
                    : 'bg-gradient-to-r from-fuchsia-950/30 via-slate-900 to-indigo-950/20 border-fuchsia-900/40 hover:border-fuchsia-700/50'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Actor Avatar with Icon Badge */}
                  <div
                    className="relative shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioUtils.playPop();
                      viewProfileUser(notif.actor);
                    }}
                  >
                    <img
                      src={notif.actor.avatar}
                      alt={notif.actor.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-800 hover:border-fuchsia-500 transition-colors"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shadow">
                      {getNotifIcon(notif.type)}
                    </span>
                  </div>

                  <div className="min-w-0 leading-tight">
                    <p className="text-xs text-slate-200">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          audioUtils.playPop();
                          viewProfileUser(notif.actor);
                        }}
                        className="font-bold text-white group-hover:text-fuchsia-300 transition-colors hover:underline cursor-pointer"
                      >
                        {notif.actor.name}
                      </span>{' '}
                      <span className="text-slate-300">{notif.text}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 inline-block">
                      {notif.timestamp}
                    </span>
                  </div>
                </div>

                {/* Interactive Action Area */}
                <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto pl-13 sm:pl-0">
                  {isConnectionReq && isPending ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => acceptConnectionRequest(notif.connectionId || notif.actor.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm shadow-emerald-900/30"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => declineConnectionRequest(notif.connectionId || notif.actor.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  ) : isAccepted ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 rounded-xl items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Connected</span>
                      </span>
                      <button
                        onClick={() => {
                          audioUtils.playPop();
                          startChatWithUser(notif.actor);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-900/30 active:scale-95"
                        title="Start Chat with Friend"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  ) : isDeclined ? (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      Declined
                    </span>
                  ) : notif.targetReelThumbnail ? (
                    <img
                      src={notif.targetReelThumbnail}
                      alt="Reel preview"
                      className="w-9 h-12 rounded-lg object-cover border border-slate-700"
                    />
                  ) : notif.type === 'live' ? (
                    <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/20 border border-fuchsia-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      Watch
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    !notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
