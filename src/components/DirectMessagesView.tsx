import React, { useState } from 'react';
import { 
  Search, MessageSquarePlus, Circle, CheckCheck, Sparkles, 
  Image, Mic, Zap, Bot, ArrowRight, Radio 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Conversation } from '../types';
import { ChatRoomView } from './ChatRoomView';
import { AIChatAssistant } from './AIChatAssistant';
import { UserStatusBadge } from './UserStatusBadge';

export const DirectMessagesView: React.FC = () => {
  const { conversations, activeConversation, openConversation, isUserOnline } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  if (showAIAssistant) {
    return <AIChatAssistant onBack={() => setShowAIAssistant(false)} />;
  }

  if (activeConversation) {
    return <ChatRoomView />;
  }

  const filteredConversations = conversations.filter(
    (c) =>
      c.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header & New Chat button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Direct Messages</h2>
          <p className="text-xs text-slate-400">Encrypted real-time chats, AI assistant & audio notes</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600/30 to-indigo-600/30 border border-fuchsia-500/40 hover:border-fuchsia-500 text-fuchsia-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Open Gemini AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span>Ask AI</span>
          </button>

          <button
            onClick={() => {
              if (conversations.length > 0) openConversation(conversations[0]);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-fuchsia-400 hover:text-white transition-colors"
            title="Start conversation"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Official Pinned Pulse AI Assistant Chat Row */}
      <div
        onClick={() => setShowAIAssistant(true)}
        className="p-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/70 via-indigo-950/50 to-slate-900 border border-fuchsia-500/40 hover:border-fuchsia-400/80 transition-all cursor-pointer group shadow-lg shadow-fuchsia-950/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-fuchsia-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white group-hover:text-fuchsia-300 transition-colors">
                  Pulse AI Assistant
                </span>
                <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  OFFICIAL
                </span>
              </div>
              <span className="text-[10px] text-fuchsia-400 font-semibold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
              </span>
            </div>

            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-300 group-hover:text-slate-200 truncate max-w-[210px]">
                Ask me to write viral scripts, reel hooks, or chat live with voice!
              </p>
              
              <div className="flex items-center gap-1 text-[11px] text-fuchsia-400 font-semibold shrink-0">
                <span>Chat</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search direct messages or friends..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
        />
      </div>

      {/* Online Creators Stories/Status Ribbon */}
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-2 border-b border-slate-900">
        {conversations.map((conv) => {
          const online = isUserOnline(conv.participant.id) ?? conv.isOnline;
          return (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="flex flex-col items-center gap-1 cursor-pointer group shrink-0"
            >
              <div className="relative">
                <img
                  src={conv.participant.avatar}
                  alt={conv.participant.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-700 group-hover:border-fuchsia-500 transition-colors"
                />
                <UserStatusBadge
                  isOnline={online}
                  size="sm"
                  className="absolute bottom-0 right-0"
                />
              </div>
              <span className="text-[10px] font-medium text-slate-300 max-w-[54px] truncate">
                {conv.participant.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Conversations List */}
      <div className="space-y-1.5">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No conversations found.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const online = isUserOnline(conv.participant.id) ?? conv.isOnline;
            return (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.participant.avatar}
                    alt={conv.participant.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-800"
                  />
                  <UserStatusBadge
                    isOnline={online}
                    size="sm"
                    className="absolute bottom-0 right-0"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white group-hover:text-fuchsia-300 transition-colors">
                        {conv.participant.name}
                      </span>
                      {conv.participant.verified && (
                        <span className="text-[9px] text-fuchsia-400 font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">{conv.lastMessageTime}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs truncate max-w-[210px] ${conv.unreadCount > 0 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                      {conv.lastMessage}
                    </p>
                    
                    {conv.unreadCount > 0 ? (
                      <span className="bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
