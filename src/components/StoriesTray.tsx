import React from 'react';
import { Plus, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const StoriesTray: React.FC = () => {
  const { stories, openStoryViewer, openCreateModal, openLiveRoom, liveRooms, setActiveTab } = useApp();
  const { user } = useAuth();

  const handleUserStoryClick = () => {
    // If user has a story, open it, else open camera / story creator
    const myStoryIdx = stories.findIndex((s) => s.id === 'story_me' || (user && s.user.id === user.id));
    if (myStoryIdx >= 0 && stories[myStoryIdx].items.length > 0) {
      openStoryViewer(myStoryIdx);
    } else {
      setActiveTab('camera');
    }
  };

  return (
    <div className="w-full bg-slate-950/60 border-b border-slate-850/80 py-3 px-4 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-3.5 min-w-max">
        {/* Your Story button */}
        <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="relative">
            <button
              onClick={handleUserStoryClick}
              className="w-16 h-16 rounded-full p-0.5 border-2 border-slate-700 hover:border-fuchsia-500 overflow-hidden transition-all group-hover:scale-105"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt="Your Story"
                className="w-full h-full object-cover rounded-full"
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('camera');
              }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-pink-500 rounded-full flex items-center justify-center border-2 border-slate-950 text-white shadow-md hover:scale-110 transition-transform"
              title="Record Story with Camera & Filters"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate">
            Your Story
          </span>
        </div>

        {/* Stories from following creators */}
        {stories.map((story, idx) => {
          if (story.id === 'story_me' || (user && story.user.id === user.id)) return null;

          return (
            <div
              key={story.id}
              onClick={() => {
                if (story.isLiveNow) {
                  const relatedLive = liveRooms.find((r) => r.host.id === story.user.id);
                  if (relatedLive) {
                    openLiveRoom(relatedLive);
                    return;
                  }
                }
                openStoryViewer(idx);
              }}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="relative">
                {/* Vibrant Gradient ring */}
                <div
                  className={`w-16 h-16 rounded-full p-[2.5px] transition-transform group-hover:scale-105 ${
                    story.isLiveNow
                      ? 'bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 animate-pulse'
                      : story.hasUnread
                      ? 'bg-gradient-to-tr from-fuchsia-500 via-pink-500 to-indigo-500'
                      : 'bg-slate-800'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-slate-950 p-[2px] overflow-hidden">
                    <img
                      src={story.user.avatar}
                      alt={story.user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                {/* LIVE badge tag on story circle */}
                {story.isLiveNow && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-slate-950 flex items-center gap-0.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    <span>LIVE</span>
                  </div>
                )}
              </div>

              <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate text-center">
                {story.user.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
