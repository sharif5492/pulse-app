import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, UserPlus, UserCheck, Clock, UserMinus, 
  Copy, Check, Sparkles, MessageCircle, Phone, Video, 
  ExternalLink, Users, Shield, User as UserIcon, RefreshCw,
  QrCode, Camera, ArrowRight, CheckCircle2, AlertCircle,
  Zap, Share2, Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { User, ConnectionStatus } from '../types';
import { usersDiscoveryService, supabase } from '../lib/supabase';
import { audioUtils } from '../lib/audioUtils';
import { UserStatusBadge } from './UserStatusBadge';
import { FriendBarcodeCenter } from './FriendBarcodeCenter';
import { areUserIdsEqual, normalizeUserId } from '../utils/userIdUtils';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'quick_add' | 'search' | 'barcode' | 'requests' | 'friends';
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'quick_add' 
}) => {
  const { 
    connections,
    getConnectionStatusWith, 
    sendConnectionRequest, 
    acceptConnectionRequest, 
    declineConnectionRequest, 
    cancelConnectionRequest,
    viewProfileUser,
    isUserOnline,
    openConversation,
    startChatWithUser,
    conversations,
    startCall,
    setActiveTab,
    isUserBlocked,
  } = useApp();
  
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTabState] = useState<'quick_add' | 'search' | 'barcode' | 'requests' | 'friends'>(initialTab);
  const [barcodeSubMode, setBarcodeSubMode] = useState<'scan' | 'my_barcode'>('scan');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAnyId, setCopiedAnyId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allNetworkUsers, setAllNetworkUsers] = useState<User[]>([]);
  const [isSelfSearch, setIsSelfSearch] = useState(false);
  const [directConnectSent, setDirectConnectSent] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Current user identifiers
  const currentUserId = user?.id || 'usr_current';
  const currentUsername = user?.username || 'pulse_creator';

  // Load all searchable users across network and local devices without clearing UI
  const fetchNetworkUsers = async (queryText: string) => {
    try {
      const results = await usersDiscoveryService.searchUsers(
        queryText, 
        currentUserId, 
        []
      );
      if (results && results.users) {
        setAllNetworkUsers((prev) => {
          // Merge unique users
          const map = new Map<string, User>();
          for (const u of prev) map.set(u.id, u);
          for (const u of results.users) map.set(u.id, u);
          return Array.from(map.values());
        });
        setIsSelfSearch(results.isSelfQuery);
      }
    } catch (e) {
      console.warn('Network search error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNetworkUsers('');

      // Background sync current user with server
      try {
        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentUserId,
            name: user?.name || 'Pulse Creator',
            username: currentUsername,
            avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          }),
        }).catch(() => {});
      } catch {}

      // Poll network users every 3.5s
      const timer = setInterval(() => {
        fetchNetworkUsers(searchQuery);
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [isOpen, currentUserId]);

  // Debounced server search when typing
  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchNetworkUsers(val);
    }, 300);
  };

  // Manual immediate submit
  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    audioUtils.playPop();
    setIsLoading(true);
    fetchNetworkUsers(searchQuery);
  };

  if (!isOpen) return null;

  // Filter users in memory for instant zero-lag response
  const cleanQ = searchQuery.trim().toLowerCase().replace(/^[@#]/, '');
  const isQuerySelf = Boolean(
    cleanQ && (
      areUserIdsEqual(cleanQ, currentUserId) ||
      cleanQ === currentUsername.toLowerCase()
    )
  );

  const filteredUsers = allNetworkUsers.filter((u) => {
    if (isUserBlocked(u.id)) return false;
    const isSelf = areUserIdsEqual(u.id, currentUserId);
    if (!cleanQ) return !isSelf;
    if (isQuerySelf && isSelf) return true;
    if (isSelf && !isQuerySelf) return false;

    const uIdLower = u.id.toLowerCase();
    const uIdWithoutPrefix = uIdLower.replace('usr_', '');
    const uNameLower = u.name.toLowerCase();
    const uUsernameLower = u.username.toLowerCase();
    const uBio = u.bio ? u.bio.toLowerCase() : '';

    return (
      uIdLower.includes(cleanQ) ||
      uIdWithoutPrefix.includes(cleanQ) ||
      uUsernameLower.includes(cleanQ) ||
      uNameLower.includes(cleanQ) ||
      uBio.includes(cleanQ)
    );
  });

  // Calculate incoming requests using canonical user ID comparison
  const incomingRequests = connections.filter(
    (c) => c.status === 'pending' && (
      areUserIdsEqual(c.receiverId, currentUserId) || 
      (c.receiver && areUserIdsEqual(c.receiver.id, currentUserId))
    )
  );

  // Calculate connected friends
  const friendsList = connections
    .filter((c) => c.status === 'accepted')
    .map((c) => (areUserIdsEqual(c.requesterId, currentUserId) ? c.receiver || c.requester : c.requester || c.receiver))
    .filter((u): u is User => Boolean(u && !areUserIdsEqual(u.id, currentUserId)));

  // Copy current user's ID
  const handleCopyMyId = () => {
    audioUtils.playPop();
    navigator.clipboard.writeText(currentUserId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Copy any user's ID
  const handleCopyAnyId = (idToCopy: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioUtils.playPop();
    navigator.clipboard.writeText(idToCopy);
    setCopiedAnyId(idToCopy);
    setTimeout(() => setCopiedAnyId(null), 2000);
  };

  // Share ID via WhatsApp
  const handleShareWhatsApp = (customId?: string) => {
    audioUtils.playPop();
    const idToShare = customId || currentUserId;
    const inviteText = `Hey! Add me on Pulse! 📱\nMy User ID is: ${idToShare}\nUsername: @${currentUsername}\nAdd me directly or click here: ${window.location.origin}/#user=${idToShare}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Copy invitation link
  const handleCopyInviteLink = () => {
    audioUtils.playPop();
    const link = `${window.location.origin}/#user=${currentUsername || currentUserId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenUserChat = (targetUser: User) => {
    audioUtils.playPop();
    onClose();
    startChatWithUser(targetUser);
  };

  const handleStartCall = (targetUser: User, type: 'audio' | 'video') => {
    audioUtils.playPop();
    onClose();
    startCall(targetUser, type);
  };

  // 1-Click Send Friend Request
  const handleSendFriendRequest = async (targetUser: User) => {
    audioUtils.playPop();
    await sendConnectionRequest(targetUser);
    setDirectConnectSent(`Friend request sent to ${targetUser.name}!`);
    setTimeout(() => setDirectConnectSent(null), 3500);
  };

  // Direct Send Friend Request by typed ID or Username
  const handleDirectConnect = async (customIdOrUsername: string) => {
    const clean = customIdOrUsername.trim().replace(/^[@#]/, '');
    if (!clean) return;
    audioUtils.playPop();

    const existing = allNetworkUsers.find(
      (u) => areUserIdsEqual(u.id, clean) ||
             u.username.toLowerCase() === clean.toLowerCase()
    );

    const targetUser: User = existing || {
      id: clean,
      name: clean.length > 12 ? `Pulse User (${clean.slice(0, 8)})` : clean,
      username: clean,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Added via Direct ID Search',
      followersCount: 10,
      followingCount: 5,
      likesCount: 20,
    };

    await sendConnectionRequest(targetUser);
    setDirectConnectSent(`Friend request sent directly to ${targetUser.name} (${targetUser.id})!`);
    setTimeout(() => setDirectConnectSent(null), 4000);
  };

  // 1-Click Accept Friend Request with celebration
  const handleAcceptRequest = async (connIdOrUserId: string) => {
    audioUtils.playCallConnected();
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {}
    await acceptConnectionRequest(connIdOrUserId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header: Snapchat & WhatsApp Style */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-600/30">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base leading-tight">Add Friends</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Network
                </span>
              </div>
              <p className="text-[11px] text-slate-400">WhatsApp & Snapchat Style Friend System</p>
            </div>
          </div>
          <button
            onClick={() => {
              audioUtils.playPop();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* My ID Card (Snapchat & WhatsApp Quick Share Banner) */}
        <div className="p-3.5 bg-gradient-to-r from-fuchsia-950/40 via-indigo-950/30 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2.5">
            {/* User Info & High Visibility ID */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="My Avatar"
                  className="w-11 h-11 rounded-full object-cover border-2 border-fuchsia-500"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{user?.name || 'You'}</span>
                  <span className="text-[11px] text-fuchsia-400 font-mono">@{currentUsername}</span>
                </div>
                {/* PROMINENT USER ID DISPLAY */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your ID:</span>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-750 select-all tracking-wide">
                    {currentUserId}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Share Buttons: WhatsApp & Copy ID */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* WhatsApp Share Button */}
              <button
                onClick={() => handleShareWhatsApp()}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                title="Share your User ID via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">WhatsApp</span>
              </button>

              {/* Copy ID Button */}
              <button
                onClick={handleCopyMyId}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-200 hover:text-white hover:border-slate-600 text-xs font-semibold flex items-center gap-1 transition-all"
                title="Copy User ID to clipboard"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Snapchat & WhatsApp Style */}
        <div className="flex items-center border-b border-slate-800 px-2 pt-2 bg-slate-950 overflow-x-auto no-scrollbar">
          {/* Quick Add (Snapchat signature) */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTabState('quick_add');
            }}
            className={`flex-1 pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'quick_add' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>Quick Add</span>
            {activeTab === 'quick_add' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-fuchsia-500 rounded-full" />
            )}
          </button>

          {/* Search by ID Tab */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTabState('search');
            }}
            className={`flex-1 pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'search' ? 'text-fuchsia-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search ID</span>
            {activeTab === 'search' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full" />
            )}
          </button>

          {/* Requests Tab */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTabState('requests');
            }}
            className={`flex-1 pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'requests' ? 'text-fuchsia-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {incomingRequests.length}
              </span>
            )}
            {activeTab === 'requests' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full" />
            )}
          </button>

          {/* Friends Tab */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTabState('friends');
            }}
            className={`flex-1 pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'friends' ? 'text-fuchsia-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friendsList.length})</span>
            {activeTab === 'friends' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full" />
            )}
          </button>

          {/* Snapcode / Barcode Tab */}
          <button
            onClick={() => {
              audioUtils.playPop();
              setActiveTabState('barcode');
            }}
            className={`flex-1 pb-2.5 px-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'barcode' ? 'text-fuchsia-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>QR Scan</span>
            {activeTab === 'barcode' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Feedback alert when direct request sent */}
        {directConnectSent && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/80 border border-emerald-600/70 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-bold shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{directConnectSent}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar min-h-[340px]">
          
          {/* TAB 1: SNAPCHAT QUICK ADD */}
          {activeTab === 'quick_add' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Add • People You May Know</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">1-tap connect with users and devices on the network</p>
                </div>
                <button
                  onClick={() => {
                    audioUtils.playPop();
                    fetchNetworkUsers('');
                  }}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Refresh users"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">No new suggestions right now</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                      Search directly by your friend's User ID or scan their screen barcode!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      audioUtils.playPop();
                      setActiveTabState('search');
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search by User ID</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((targetUser) => {
                    const connInfo = getConnectionStatusWith(targetUser.id);
                    const isConnected = connInfo.status === 'accepted';
                    const isPendingOutgoing = connInfo.status === 'pending' && (connInfo.isOutgoing || !connInfo.isIncoming);
                    const isPendingIncoming = connInfo.status === 'pending' && connInfo.isIncoming;
                    const online = isUserOnline(targetUser.id);

                    return (
                      <div
                        key={targetUser.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all gap-2.5"
                      >
                        {/* User Avatar and Info */}
                        <div 
                          onClick={() => {
                            viewProfileUser(targetUser);
                            onClose();
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={targetUser.avatar}
                              alt={targetUser.name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-700"
                            />
                            <UserStatusBadge isOnline={online} size="sm" className="absolute bottom-0 right-0" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-white truncate">{targetUser.name}</p>
                              {targetUser.verified && (
                                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[8px] text-white font-black shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>
                            
                            {/* USERNAME + PROMINENT ID PILL */}
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[11px] text-slate-400 font-medium">@{targetUser.username}</span>
                              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                <span className="text-[9px] font-bold text-slate-500">ID:</span>
                                <span className="text-[10px] font-mono font-bold text-emerald-400 select-all">
                                  {targetUser.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyAnyId(targetUser.id, e)}
                                  className="p-0.5 text-slate-500 hover:text-white"
                                  title="Copy ID"
                                >
                                  {copiedAnyId === targetUser.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Snapchat style Action Button */}
                        <div className="shrink-0">
                          {isConnected ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenUserChat(targetUser)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-fuchsia-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Chat</span>
                              </button>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-xl">
                                Friends ✓
                              </span>
                            </div>
                          ) : isPendingIncoming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleAcceptRequest(connInfo.connectionId || targetUser.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/40"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => declineConnectionRequest(connInfo.connectionId || targetUser.id)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                                title="Decline"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : isPendingOutgoing ? (
                            <button
                              onClick={() => cancelConnectionRequest(targetUser.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 hover:text-rose-400 text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Click to cancel"
                            >
                              <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>Requested</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(targetUser)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-fuchsia-950/40 active:scale-95 transition-all"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>+ Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH BY USER ID */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              {/* Search Form */}
              <form onSubmit={handleManualSearch} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Type User ID (e.g. usr_...) or username..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-fuchsia-500 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          fetchNetworkUsers('');
                          inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-fuchsia-950/40 shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>
              </form>

              {/* Direct Add Contact Card: Shows when user types any ID */}
              {searchQuery.trim().length > 1 && !isQuerySelf && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/50 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Instant Direct Add by ID</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Target ID:</span>
                      <span className="text-xs font-mono font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-700">
                        {searchQuery.trim().startsWith('usr_') ? searchQuery.trim() : `usr_${searchQuery.trim()}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Send friend request directly to this ID right now.
                    </p>
                  </div>

                  <button
                    onClick={() => handleDirectConnect(searchQuery.trim())}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-fuchsia-950/40 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Friend</span>
                  </button>
                </div>
              )}

              {/* Self ID notice */}
              {isQuerySelf && (
                <div className="p-3 bg-fuchsia-950/40 border border-fuchsia-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-fuchsia-200">
                  <div className="w-5 h-5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ℹ️
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="font-semibold text-white">This is your current device's ID ({currentUserId})</p>
                    <p className="text-[11px] text-fuchsia-300/80 leading-relaxed">
                      To connect with your friend or second mobile, enter that device's User ID or tap "QR Scan" above to scan its screen.
                    </p>
                  </div>
                </div>
              )}

              {/* Search Results List with High Visibility ID */}
              <div className="space-y-2 pt-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs font-semibold text-slate-300">
                      {searchQuery.trim() ? `No user found in cache for "${searchQuery}"` : 'Type an ID to search'}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Use the "Instant Direct Add" button above to send a request directly to this ID.
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((targetUser) => {
                    const connInfo = getConnectionStatusWith(targetUser.id);
                    const isConnected = connInfo.status === 'accepted';
                    const isPendingOutgoing = connInfo.status === 'pending' && (connInfo.isOutgoing || !connInfo.isIncoming);
                    const isPendingIncoming = connInfo.status === 'pending' && connInfo.isIncoming;
                    const online = isUserOnline(targetUser.id);

                    return (
                      <div
                        key={targetUser.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all gap-2.5"
                      >
                        <div 
                          onClick={() => {
                            viewProfileUser(targetUser);
                            onClose();
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={targetUser.avatar}
                              alt={targetUser.name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-700"
                            />
                            <UserStatusBadge isOnline={online} size="sm" className="absolute bottom-0 right-0" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-white truncate">{targetUser.name}</p>
                              {targetUser.verified && (
                                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[8px] text-white font-black shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>
                            
                            {/* Prominent ID Badge */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400">ID:</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 select-all">
                                {targetUser.id}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyAnyId(targetUser.id, e)}
                                className="p-0.5 text-slate-400 hover:text-white"
                                title="Copy ID"
                              >
                                {copiedAnyId === targetUser.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="shrink-0">
                          {isConnected ? (
                            <button
                              onClick={() => handleOpenUserChat(targetUser)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-fuchsia-400 hover:text-white text-xs font-bold flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Chat</span>
                            </button>
                          ) : isPendingIncoming ? (
                            <button
                              onClick={() => handleAcceptRequest(connInfo.connectionId || targetUser.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                          ) : isPendingOutgoing ? (
                            <button
                              onClick={() => cancelConnectionRequest(targetUser.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>Requested</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(targetUser)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INCOMING REQUESTS (WhatsApp / Snapchat style) */}
          {activeTab === 'requests' && (
            <div className="space-y-2.5">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">No pending requests</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    When someone sends you a friend request using your User ID or Barcode, it will appear here instantly.
                  </p>
                  <button
                    onClick={() => {
                      audioUtils.playPop();
                      setActiveTabState('quick_add');
                    }}
                    className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Find Friends on Quick Add</span>
                  </button>
                </div>
              ) : (
                incomingRequests.map((req) => {
                  const reqUser: User = req.requester || {
                    id: req.requesterId,
                    name: 'Pulse User',
                    username: req.requesterId.replace('usr_', ''),
                    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                    followersCount: 10,
                    followingCount: 10,
                    likesCount: 10,
                  };

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={reqUser.avatar}
                          alt={reqUser.name}
                          className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-white truncate">{reqUser.name}</p>
                          <p className="text-[10px] text-fuchsia-400 font-medium">@{reqUser.username}</p>
                          
                          {/* HIGHLIGHTED SENDER ID */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase">ID:</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 select-all">
                              {req.requesterId}
                            </span>
                            <button
                              onClick={(e) => handleCopyAnyId(req.requesterId, e)}
                              className="p-0.5 text-slate-500 hover:text-white"
                              title="Copy ID"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 1-Tap Accept and Decline */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/50 transition-all hover:scale-105 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => declineConnectionRequest(req.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: CONNECTED FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              {friendsList.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-500">
                  <Users className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">No friends connected yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Use Quick Add or search an ID to connect with your friends!
                  </p>
                </div>
              ) : (
                friendsList.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 gap-3"
                  >
                    <div 
                      onClick={() => {
                        viewProfileUser(friend);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-800"
                        />
                        <UserStatusBadge isOnline={isUserOnline(friend.id)} size="sm" className="absolute bottom-0 right-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{friend.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-fuchsia-400">@{friend.username}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-emerald-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            {friend.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenUserChat(friend)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-fuchsia-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                      <button
                        onClick={() => handleStartCall(friend, 'video')}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: SNAPCODE / BARCODE */}
          {activeTab === 'barcode' && (
            <div className="h-[440px]">
              <FriendBarcodeCenter 
                onClose={onClose} 
                defaultMode={barcodeSubMode} 
              />
            </div>
          )}
        </div>

        {/* Modal Footer: WhatsApp & Snapcode Shortcuts */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span>Your ID:</span>
            <span className="text-emerald-400 font-mono font-bold select-all bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {currentUserId}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleShareWhatsApp()}
              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Share WhatsApp</span>
            </button>
            <span>•</span>
            <button
              onClick={() => {
                audioUtils.playPop();
                setBarcodeSubMode('my_barcode');
                setActiveTabState('barcode');
              }}
              className="text-fuchsia-400 font-bold hover:underline flex items-center gap-0.5"
            >
              <QrCode className="w-3 h-3" />
              <span>My Snapcode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
