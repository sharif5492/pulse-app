import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, FlipHorizontal, Zap, ZapOff, Sparkles, X, 
  Video, Clock, ArrowLeft, Sliders, Film, Grid as GridIcon,
  Palette, RefreshCw, AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { audioUtils } from '../lib/audioUtils';

export interface CameraFilter {
  id: string;
  name: string;
  category: 'original' | 'beauty' | 'vintage' | 'cinematic' | 'color';
  icon: string;
  previewColor: string;
  tagline: string;
  cssFilter: string;
  canvasFilter: string;
}

export const CAMERA_FILTERS: CameraFilter[] = [
  {
    id: 'normal',
    name: 'Normal',
    category: 'original',
    icon: '✨',
    previewColor: '#94a3b8',
    tagline: 'Natural crystal-clear camera feed',
    cssFilter: 'none',
    canvasFilter: 'none',
  },
  {
    id: 'studio_glow',
    name: 'Studio Glow',
    category: 'beauty',
    icon: '💄',
    previewColor: '#ec4899',
    tagline: 'Radiant soft skin & warm studio illumination',
    cssFilter: 'brightness(1.08) contrast(1.06) saturate(1.12)',
    canvasFilter: 'brightness(1.08) contrast(1.06) saturate(1.12)',
  },
  {
    id: 'golden_sunset',
    name: 'Sunset Hour',
    category: 'cinematic',
    icon: '🌅',
    previewColor: '#f97316',
    tagline: 'Warm golden hour amber glow',
    cssFilter: 'sepia(0.25) saturate(1.4) brightness(1.05) contrast(1.1)',
    canvasFilter: 'sepia(0.25) saturate(1.4) brightness(1.05) contrast(1.1)',
  },
  {
    id: 'vintage_90s',
    name: '90s Film',
    category: 'vintage',
    icon: '📼',
    previewColor: '#eab308',
    tagline: 'Retro camcorder warm nostalgia & fade',
    cssFilter: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.2)',
    canvasFilter: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.2)',
  },
  {
    id: 'noir_cinema',
    name: 'Noir 35mm',
    category: 'cinematic',
    icon: '🎬',
    previewColor: '#64748b',
    tagline: 'High contrast monochrome silver screen',
    cssFilter: 'grayscale(1) contrast(1.35) brightness(0.95)',
    canvasFilter: 'grayscale(1) contrast(1.35) brightness(0.95)',
  },
  {
    id: 'cyber_neon',
    name: 'Cyberpunk',
    category: 'color',
    icon: '⚡',
    previewColor: '#06b6d4',
    tagline: 'Electrified cyan and violet tones',
    cssFilter: 'hue-rotate(190deg) saturate(1.6) contrast(1.2)',
    canvasFilter: 'hue-rotate(190deg) saturate(1.6) contrast(1.2)',
  },
  {
    id: 'rose_blush',
    name: 'Rosé Dream',
    category: 'beauty',
    icon: '🌸',
    previewColor: '#fb7185',
    tagline: 'Soft pastel pink aesthetic & radiant highlights',
    cssFilter: 'brightness(1.1) saturate(1.25) contrast(1.02) hue-rotate(330deg)',
    canvasFilter: 'brightness(1.1) saturate(1.25) contrast(1.02) hue-rotate(330deg)',
  },
  {
    id: 'emerald_matrix',
    name: 'Emerald',
    category: 'color',
    icon: '🧪',
    previewColor: '#10b981',
    tagline: 'Futuristic jade sci-fi atmosphere',
    cssFilter: 'hue-rotate(85deg) saturate(1.5) contrast(1.15)',
    canvasFilter: 'hue-rotate(85deg) saturate(1.5) contrast(1.15)',
  },
  {
    id: 'crisp_hdr',
    name: 'Crisp HDR',
    category: 'cinematic',
    icon: '💎',
    previewColor: '#38bdf8',
    tagline: 'Ultra-vivid dynamic range & crisp edges',
    cssFilter: 'contrast(1.25) saturate(1.3) brightness(1.02)',
    canvasFilter: 'contrast(1.25) saturate(1.3) brightness(1.02)',
  },
  {
    id: 'warm_mood',
    name: 'Warm Amber',
    category: 'vintage',
    icon: '🕯️',
    previewColor: '#d97706',
    tagline: 'Cozy ambient cafe warmth',
    cssFilter: 'sepia(0.18) brightness(1.05) saturate(1.2) contrast(1.05)',
    canvasFilter: 'sepia(0.18) brightness(1.05) saturate(1.2) contrast(1.05)',
  },
  {
    id: 'ocean_breeze',
    name: 'Ocean Teal',
    category: 'color',
    icon: '🌊',
    previewColor: '#0284c7',
    tagline: 'Cool Pacific ocean teal & deep shadows',
    cssFilter: 'hue-rotate(160deg) saturate(1.2) brightness(0.98)',
    canvasFilter: 'hue-rotate(160deg) saturate(1.2) brightness(0.98)',
  },
];

interface CameraFiltersViewProps {
  onClose?: () => void;
  onMediaCaptured?: (mediaUrl: string, type: 'photo' | 'video', lensName: string) => void;
}

export const CameraFiltersView: React.FC<CameraFiltersViewProps> = ({ onClose, onMediaCaptured }) => {
  const { setActiveTab, addStory, createReel } = useApp();
  const { user } = useAuth();

  // Active filter state
  const [activeFilter, setActiveFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'original' | 'beauty' | 'vintage' | 'cinematic' | 'color'>('all');
  
  // Camera Controls
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAdjustPanelOpen, setIsAdjustPanelOpen] = useState(false);

  // Manual Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Mode and Recording
  const [cameraMode, setCameraMode] = useState<'story' | 'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [screenFlashBurst, setScreenFlashBurst] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Captured media
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string;
    type: 'photo' | 'video';
    filterName: string;
  } | null>(null);
  const [caption, setCaption] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Native Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);

    // Stop existing stream tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore
      }
      streamRef.current = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((playErr) => {
              console.warn('[Camera video play notice]:', playErr);
            });
            setIsCameraReady(true);
          }
        };
      }
    } catch (err: any) {
      console.warn('[Camera getUserMedia error]:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system.');
      } else {
        setCameraError('Unable to connect to camera. Displaying high-res live simulator preview.');
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {
          // ignore
        }
        streamRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [startCamera]);

  // Video recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 15) {
            handleStopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordSeconds(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Compute live combined CSS filter
  const combinedCssFilter = React.useMemo(() => {
    let base = activeFilter.cssFilter === 'none' ? '' : activeFilter.cssFilter;
    const manualParts = [];
    if (brightness !== 100) manualParts.push(`brightness(${brightness / 100})`);
    if (contrast !== 100) manualParts.push(`contrast(${contrast / 100})`);
    if (saturation !== 100) manualParts.push(`saturate(${saturation / 100})`);
    
    if (manualParts.length > 0) {
      base = `${base} ${manualParts.join(' ')}`.trim();
    }
    return base || 'none';
  }, [activeFilter, brightness, contrast, saturation]);

  // Capture execution
  const executeSnap = () => {
    audioUtils.playCameraShutter();
    if (flashOn) {
      setScreenFlashBurst(true);
      setTimeout(() => setScreenFlashBurst(false), 300);
    }

    const video = videoRef.current;
    if (!video || !isCameraReady) {
      // Fallback studio capture
      const fallbackUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';
      setCapturedMedia({
        url: fallbackUrl,
        type: 'photo',
        filterName: activeFilter.name,
      });
      if (onMediaCaptured) {
        onMediaCaptured(fallbackUrl, 'photo', activeFilter.name);
      }
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const videoWidth = video.videoWidth || 720;
      const videoHeight = video.videoHeight || 1280;
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(videoWidth, 0);
          ctx.scale(-1, 1);
        }
        if (combinedCssFilter !== 'none') {
          ctx.filter = combinedCssFilter;
        }
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedMedia({
          url: dataUrl,
          type: cameraMode === 'video' ? 'video' : 'photo',
          filterName: activeFilter.name,
        });
        if (onMediaCaptured) {
          onMediaCaptured(dataUrl, 'photo', activeFilter.name);
        }
      }
    } catch (e) {
      const fallbackUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';
      setCapturedMedia({
        url: fallbackUrl,
        type: 'photo',
        filterName: activeFilter.name,
      });
    }
  };

  const handleCaptureTrigger = () => {
    if (cameraMode === 'video') {
      if (isRecording) {
        handleStopRecording();
      } else {
        handleStartRecording();
      }
      return;
    }

    if (timerSeconds > 0) {
      setCountdown(timerSeconds);
      let count = timerSeconds;
      const countTimer = setInterval(() => {
        count -= 1;
        audioUtils.playPop();
        if (count <= 0) {
          clearInterval(countTimer);
          setCountdown(null);
          executeSnap();
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      executeSnap();
    }
  };

  const handleStartRecording = () => {
    audioUtils.playPop();
    setIsRecording(true);
    setRecordSeconds(0);
  };

  const handleStopRecording = () => {
    audioUtils.playCameraShutter();
    setIsRecording(false);
    const videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-dj-playing-music-in-a-club-41481-large.mp4';
    setCapturedMedia({
      url: videoUrl,
      type: 'video',
      filterName: activeFilter.name,
    });
    if (onMediaCaptured) {
      onMediaCaptured(videoUrl, 'video', activeFilter.name);
    }
  };

  const handleSaveToStory = () => {
    if (!capturedMedia) return;
    addStory(capturedMedia.url, caption || `Shot with ${capturedMedia.filterName} Filter ✨`);
    if (onClose) onClose();
    else setActiveTab('home');
  };

  const handleSaveToReels = () => {
    if (!capturedMedia) return;
    createReel(
      capturedMedia.url,
      caption || `Shot on Pulse Camera #${activeFilter.name.replace(/\s+/g, '')}`,
      [`#${activeFilter.name.replace(/\s+/g, '')}`, '#PulseCamera', '#PulseMoments'],
      'Original Audio - ' + (user?.name || 'Pulse Creator')
    );
    if (onClose) onClose();
    else setActiveTab('reels');
  };

  const filteredList = activeCategory === 'all'
    ? CAMERA_FILTERS
    : CAMERA_FILTERS.filter((f) => f.category === activeCategory);

  return (
    <div className="relative w-full h-[calc(100vh-68px)] max-h-[860px] bg-black text-white flex flex-col justify-between overflow-hidden sm:rounded-3xl border border-slate-800 select-none">
      {/* Screen Flash Burst */}
      {screenFlashBurst && (
        <div className="absolute inset-0 bg-white pointer-events-none z-50 animate-out fade-out duration-300 opacity-70" />
      )}

      {/* Main Full-Screen HTML5 Camera Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {/* Direct HTML5 Video Stream Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-all duration-300 ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          style={{
            filter: combinedCssFilter,
          }}
        />

        {/* Fallback Simulator Backdrop when camera is disconnected or initializing */}
        {cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950/90 text-center backdrop-blur-xs">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80"
              alt="Camera Simulator"
              className={`absolute inset-0 w-full h-full object-cover -z-10 opacity-75 ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              style={{ filter: combinedCssFilter }}
            />
            <div className="pt-16 max-w-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Live Studio Simulator</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                {cameraError}
              </p>
            </div>

            <button
              onClick={() => startCamera()}
              className="mb-24 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold backdrop-blur-md border border-white/30 flex items-center gap-2 transition-all shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera Permission</span>
            </button>
          </div>
        )}

        {/* 3x3 Composition Grid */}
        {showGrid && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-15">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div />
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <span className="text-7xl sm:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(217,70,239,0.9)] animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <button
            onClick={() => {
              if (onClose) onClose();
              else setActiveTab('home');
            }}
            className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Active Filter Name Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-xs font-bold text-slate-100 shadow-md">
            <span>{activeFilter.icon}</span>
            <span>{activeFilter.name}</span>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Flash */}
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                flashOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Flash"
            >
              {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>

            {/* Timer */}
            <button
              onClick={() => {
                audioUtils.playPop();
                setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-colors relative ${
                timerSeconds > 0 ? 'bg-fuchsia-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Self-Timer"
            >
              <Clock className="w-4 h-4" />
              {timerSeconds > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-white text-fuchsia-600 rounded-full font-bold px-1">
                  {timerSeconds}s
                </span>
              )}
            </button>

            {/* Grid */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                showGrid ? 'bg-indigo-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Composition Grid"
            >
              <GridIcon className="w-4 h-4" />
            </button>

            {/* Manual Tune Sliders */}
            <button
              onClick={() => setIsAdjustPanelOpen(!isAdjustPanelOpen)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                isAdjustPanelOpen ? 'bg-rose-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Adjust Lighting"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Flip Camera */}
            <button
              onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
              title="Flip Camera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Recording Indicator */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>00:{recordSeconds.toString().padStart(2, '0')} / 00:15</span>
          </div>
        )}

        {/* Manual Adjustments Drawer */}
        {isAdjustPanelOpen && (
          <div className="absolute bottom-28 left-4 right-4 z-30 bg-slate-950/90 border border-slate-800 backdrop-blur-xl p-4 rounded-3xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-rose-400" />
                Live Camera Calibration
              </span>
              <button
                onClick={() => setIsAdjustPanelOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300 shrink-0 w-20">Brightness</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-rose-400 font-mono w-10 text-right">{brightness}%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300 shrink-0 w-20">Contrast</span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-rose-400 font-mono w-10 text-right">{contrast}%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300 shrink-0 w-20">Saturation</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-rose-400 font-mono w-10 text-right">{saturation}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Carousel & Capture Controls */}
      <div className="relative z-30 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-2 pb-5 px-3 space-y-2.5">
        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {(['all', 'original', 'beauty', 'cinematic', 'vintage', 'color'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                audioUtils.playPop();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Filters' : cat}
            </button>
          ))}
        </div>

        {/* Sliding Filter Carousel */}
        <div
          ref={carouselContainerRef}
          className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-2 px-6 justify-start scroll-smooth"
        >
          {filteredList.map((filter) => {
            const isSelected = activeFilter.id === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => {
                  audioUtils.playPop();
                  setActiveFilter(filter);
                }}
                className={`flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 group ${
                  isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={filter.tagline}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)] ring-2 ring-white/80'
                      : 'border-slate-700 bg-slate-900/90 group-hover:border-slate-500'
                  }`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${filter.previewColor}66, #0f172a)`
                      : `linear-gradient(135deg, ${filter.previewColor}22, #0f172a)`,
                  }}
                >
                  <span className="drop-shadow-md">{filter.icon}</span>
                </div>
                <span className={`text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-rose-500/30 text-rose-300 font-extrabold' : 'text-slate-300'
                }`}>
                  {filter.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Capture Trigger Button & Mode Switcher */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <button
            onClick={handleCaptureTrigger}
            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl ${
              cameraMode === 'video'
                ? isRecording
                  ? 'border-rose-500 ring-4 ring-rose-500/50 shadow-rose-600/50'
                  : 'border-rose-400 ring-4 ring-rose-500/30'
                : 'border-white ring-4 ring-rose-500/50 shadow-rose-600/40'
            }`}
            aria-label={cameraMode === 'video' ? 'Record Video' : 'Take Photo'}
          >
            <div
              className={`rounded-full flex items-center justify-center text-white transition-all ${
                cameraMode === 'video'
                  ? isRecording
                    ? 'w-6 h-6 rounded-md bg-rose-600 animate-pulse'
                    : 'w-12 h-12 bg-rose-600'
                  : 'w-12 h-12 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 shadow-inner'
              }`}
            >
              {cameraMode === 'video' ? (
                isRecording ? null : <Video className="w-5 h-5" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </div>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 pt-0.5">
            <button
              onClick={() => {
                audioUtils.playPop();
                setCameraMode('story');
              }}
              className={`transition-colors ${cameraMode === 'story' ? 'text-rose-400 border-b-2 border-rose-400 pb-0.5' : 'hover:text-white'}`}
            >
              STORY
            </button>
            <button
              onClick={() => {
                audioUtils.playPop();
                setCameraMode('photo');
              }}
              className={`transition-colors ${cameraMode === 'photo' ? 'text-rose-400 border-b-2 border-rose-400 pb-0.5' : 'hover:text-white'}`}
            >
              PHOTO
            </button>
            <button
              onClick={() => {
                audioUtils.playPop();
                setCameraMode('video');
              }}
              className={`transition-colors ${cameraMode === 'video' ? 'text-rose-400 border-b-2 border-rose-400 pb-0.5' : 'hover:text-white'}`}
            >
              VIDEO / REEL
            </button>
          </div>
        </div>
      </div>

      {/* Captured Media Preview Modal */}
      {capturedMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCapturedMedia(null)}
              className="p-2 bg-slate-900/80 rounded-full text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold bg-rose-950/80 border border-rose-800/60 text-rose-300 px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {capturedMedia.filterName} Filter
            </span>
          </div>

          <div className="relative flex-1 my-3 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {capturedMedia.type === 'video' ? (
              <video
                src={capturedMedia.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedMedia.url}
                alt="Captured Snapshot"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="space-y-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-xl">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption, #Pulse, or tag friends..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveToStory}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Your Story (24h)</span>
              </button>

              <button
                onClick={handleSaveToReels}
                className="py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 transition-all"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Publish to Reels</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
