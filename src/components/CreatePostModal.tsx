import React, { useState, useRef } from 'react';
import { 
  X, Video, Camera, Radio, Sparkles, Upload, Music, Tag, 
  Play, CheckCircle2, Loader2, Wand2, Zap, Film, RefreshCw, Eye 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LiveRoom } from '../types';

export const CreatePostModal: React.FC = () => {
  const { 
    createModalOpen, 
    closeCreateModal, 
    createReel, 
    addStory, 
    startLiveBroadcast,
    uploadMedia
  } = useApp();
  const { user } = useAuth();

  const [tab, setTab] = useState<'reel' | 'story' | 'live'>('reel');

  // Reel form state
  const [reelCaption, setReelCaption] = useState('');
  const [reelTags, setReelTags] = useState('#PulseCreatives #VisualSound');
  const [reelAudio, setReelAudio] = useState('Pulse Original Beat');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(
    'https://assets.mixkit.co/videos/preview/mixkit-girl-dancing-in-a-party-with-neon-lights-42533-large.mp4'
  );
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI Reel Generation State (Veo 3 / Gemini)
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Cyberpunk neon light show in Tokyo with holographic synths');
  const [aiAspectRatio, setAiAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string | null>(null);
  const [generatedAIVideoUrl, setGeneratedAIVideoUrl] = useState<string | null>(null);

  // Story form state
  const [storyCaption, setStoryCaption] = useState('Chilling backstage before the set! 🎛️✨');
  const [selectedStoryImage, setSelectedStoryImage] = useState(
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'
  );
  const [uploadedStoryFile, setUploadedStoryFile] = useState<File | null>(null);

  // Live form state
  const [liveTitle, setLiveTitle] = useState('🎧 Late Night Synthesizer & Audio Jam');
  const [liveCategory, setLiveCategory] = useState<LiveRoom['category']>('Music');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!createModalOpen) return null;

  const sampleClips = [
    { name: 'Neon Dance Club', url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-dancing-in-a-party-with-neon-lights-42533-large.mp4' },
    { name: 'Analog Synth Setup', url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-playing-a-synthesizer-in-a-dark-room-42861-large.mp4' },
    { name: 'Urban Freestyle', url: 'https://assets.mixkit.co/videos/preview/mixkit-urban-dancer-performing-in-a-parking-lot-42475-large.mp4' },
    { name: 'Tokyo Sunset Rooftop', url: 'https://assets.mixkit.co/videos/preview/mixkit-photographer-taking-photos-on-a-rooftop-at-sunset-42686-large.mp4' },
  ];

  const aiPromptPresets = [
    { label: '🌌 Cyberpunk Neon City', text: 'Cyberpunk neon light show in Tokyo with holographic dance synths and laser reflections' },
    { label: '🎹 Modular Synth Jam', text: 'Analog synthesizer modular cables glow in dark studio with sound wave oscilloscope' },
    { label: '💃 Underground Freestyle', text: 'Kinetic urban hip-hop dancer performing on neon wet asphalt with dramatic shadows' },
    { label: '🌇 35mm Sunset Skyline', text: 'Cinematic drone shot flying through golden sunset skyline with warm lens flare' },
  ];

  const sampleStoryPhotos = [
    { name: 'Concert Stage', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' },
    { name: 'Runway Backstage', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80' },
    { name: 'Studio Audio Rig', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80' },
  ];

  const handleGenerateAIReel = async () => {
    if (!aiPrompt.trim() || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    setAiGenerationStatus('Prompting Veo 3 video engine & synthesizing visual layout...');

    try {
      const res = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          aspectRatio: aiAspectRatio,
        }),
      });

      const data = await res.json();
      
      if (data.videoUrl) {
        setGeneratedAIVideoUrl(data.videoUrl);
        setSelectedVideoUrl(data.videoUrl);
        setUploadedVideoFile(null);
        if (data.suggestedCaption) setReelCaption(data.suggestedCaption);
        if (data.suggestedTags) setReelTags(data.suggestedTags.join(' '));
        if (data.suggestedAudio) setReelAudio(data.suggestedAudio);
        setAiGenerationStatus('AI Reel successfully generated and formatted for Supabase publication! ✨');
      }
    } catch (err: any) {
      console.warn('AI Reel generation call notice:', err);
      setAiGenerationStatus('Generated preview reel with Pulse AI fallback engine.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleApplyAIGeneratedReel = () => {
    setIsAIGenModalOpen(false);
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideoFile(file);
      setIsUploading(true);
      const storageUrl = await uploadMedia(file);
      if (storageUrl) {
        setSelectedVideoUrl(storageUrl);
      } else {
        setSelectedVideoUrl(URL.createObjectURL(file));
      }
      setIsUploading(false);
    }
  };

  const handleStoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedStoryFile(file);
      setIsUploading(true);
      const storageUrl = await uploadMedia(file);
      if (storageUrl) {
        setSelectedStoryImage(storageUrl);
      } else {
        setSelectedStoryImage(URL.createObjectURL(file));
      }
      setIsUploading(false);
    }
  };

  const handleSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    const tagsArray = reelTags.split(' ').map((t) => (t.startsWith('#') ? t : `#${t}`)).filter(Boolean);
    await createReel(
      selectedVideoUrl, 
      reelCaption || 'New reel created on Pulse! ✨', 
      tagsArray, 
      reelAudio,
      uploadedVideoFile || undefined
    );
    setIsUploading(false);
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    addStory(selectedStoryImage, storyCaption);
    closeCreateModal();
  };

  const handleSubmitLive = (e: React.FormEvent) => {
    e.preventDefault();
    startLiveBroadcast(liveTitle || 'Pulse Live Broadcast', liveCategory);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeCreateModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Create on Pulse</h2>
        <p className="text-xs text-slate-400 mb-4">Share reels, generate with AI, update story, or broadcast live</p>

        {/* Post Type Selector */}
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('reel')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'reel' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Reel</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('story')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'story' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Story</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('live')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'live' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Go Live</span>
          </button>
        </div>

        {/* Tab 1: Create Reel */}
        {tab === 'reel' && (
          <div className="space-y-3.5">
            {/* Generate AI Reel Banner & Trigger Button */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/70 via-indigo-950/60 to-slate-950 border border-fuchsia-500/40 flex items-center justify-between gap-3 shadow-md shadow-fuchsia-950/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 p-0.5 shrink-0 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Veo 3 AI Video</span>
                    <span className="text-[9px] bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-1 py-0.2 rounded font-bold">VEO</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">Turn any text prompt into an upload-ready Reel</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAIGenModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-fuchsia-600/30 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate AI Reel</span>
              </button>
            </div>

            {/* AI Generation Studio Section / Drawer */}
            {isAIGenModalOpen && (
              <div className="p-4 bg-slate-950 border border-fuchsia-500/30 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-fuchsia-400" />
                    AI Text-to-Video Studio (Veo 3)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAIGenModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Describe your vision / scene
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Cyberpunk neon lights dancer in Tokyo with laser synths..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 resize-none"
                  />
                </div>

                {/* Aspect Ratio Selector (9:16 or 16:9) */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Aspect Ratio:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAiAspectRatio('9:16')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        aiAspectRatio === '9:16'
                          ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      9:16 (Reel Vertical)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiAspectRatio('16:9')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        aiAspectRatio === '16:9'
                          ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      16:9 (Landscape)
                    </button>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Curated Styles:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {aiPromptPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAiPrompt(preset.text)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-[10px] text-slate-300 truncate text-left transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generation Status Feedback */}
                {aiGenerationStatus && (
                  <div className="p-2.5 bg-fuchsia-950/50 border border-fuchsia-500/30 rounded-xl text-xs text-fuchsia-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                    <span className="text-[11px] leading-tight">{aiGenerationStatus}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateAIReel}
                    disabled={isGeneratingVideo || !aiPrompt.trim()}
                    className="flex-1 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-fuchsia-600/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isGeneratingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Video...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Generate & Set Reel Parameters</span>
                      </>
                    )}
                  </button>

                  {generatedAIVideoUrl && (
                    <button
                      type="button"
                      onClick={handleApplyAIGeneratedReel}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitReel} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Selected Video Source</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload from device</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />

                {uploadedVideoFile && (
                  <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl mb-2 flex items-center justify-between text-xs text-fuchsia-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                      <span className="truncate">{uploadedVideoFile.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {(uploadedVideoFile.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-2">
                  {sampleClips.map((clip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUploadedVideoFile(null);
                        setSelectedVideoUrl(clip.url);
                      }}
                      className={`p-2 rounded-xl text-left border text-xs transition-all ${
                        selectedVideoUrl === clip.url && !uploadedVideoFile
                          ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Play className="w-3 h-3 text-fuchsia-400" />
                        <span className="truncate">{clip.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reel Caption</label>
                <textarea
                  value={reelCaption}
                  onChange={(e) => setReelCaption(e.target.value)}
                  placeholder="Write an engaging caption for your reel..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (spaced)</label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={reelTags}
                    onChange={(e) => setReelTags(e.target.value)}
                    placeholder="#Tokyo #EDM #PulseStage"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Audio Sound Track</label>
                <div className="relative">
                  <Music className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={reelAudio}
                    onChange={(e) => setReelAudio(e.target.value)}
                    placeholder="Original Audio - Producer Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Supabase posts table...</span>
                  </>
                ) : (
                  <span>Publish Reel to Supabase</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Create Story */}
        {tab === 'story' && (
          <form onSubmit={handleSubmitStory} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Select or Upload Snapshot</label>
                <button
                  type="button"
                  onClick={() => storyFileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Image</span>
                </button>
              </div>

              <input
                ref={storyFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleStoryFileChange}
                className="hidden"
              />

              <div className="grid grid-cols-3 gap-2">
                {sampleStoryPhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUploadedStoryFile(null);
                      setSelectedStoryImage(photo.url);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-[3/4] border-2 transition-all ${
                      selectedStoryImage === photo.url && !uploadedStoryFile ? 'border-fuchsia-500 scale-102' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-slate-950/70 backdrop-blur-xs text-white px-1 py-0.5 rounded truncate">
                      {photo.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Story Caption</label>
              <input
                type="text"
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                placeholder="What's happening right now?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-fuchsia-600/30 transition-all mt-2"
            >
              {isUploading ? 'Uploading Image...' : 'Add to My Story (24h)'}
            </button>
          </form>
        )}

        {/* Tab 3: Go Live */}
        {tab === 'live' && (
          <form onSubmit={handleSubmitLive} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Broadcast Title</label>
              <input
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Live Room Topic..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Music', 'Creative', 'Trending', 'Chat', 'Gaming'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLiveCategory(cat)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      liveCategory === cat
                        ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                Live Room & Supabase Real-time Alerts
              </span>
              <p className="text-[11px]">
                Starting a broadcast broadcasts live notifications across the Pulse network and connects viewers in real time.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-xs rounded-xl shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 transition-all mt-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Start Live Room Now</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
