import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Mic, MicOff, Volume2, VolumeX, ArrowLeft, 
  RotateCcw, Copy, Check, Radio, Play, Pause, Video, 
  Flame, Hash, Zap, HelpCircle, Bot, Loader2, Music
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioBase64?: string | null;
  modelUsed?: string;
  isVoiceInput?: boolean;
}

const INITIAL_MESSAGES: AIMessage[] = [
  {
    id: 'ai_welcome',
    role: 'assistant',
    content: `👋 Hey! I'm your **Pulse AI Assistant**, powered by Gemini Live and Veo intelligence.

I'm here to help you dominate the feed with:
• 🎬 **Viral Reel scripts & 3-second visual hooks**
• 🏷️ **High-reach hashtags & SEO captions**
• 🎙️ **Real-time voice conversations & feedback**
• 🎥 **Text-to-Video Reel generation with Veo 3**

What are you creating today? Type a prompt below or tap the microphone to start a voice conversation! ⚡`,
    timestamp: 'Just now',
    modelUsed: 'gemini-3.7-flash',
  },
];

const PROMPT_SUGGESTIONS = [
  { label: '🎬 Viral Reel Script', prompt: 'Write a 15-second viral reel script about behind-the-scenes music production with visual cues and hook.' },
  { label: '🏷️ Hashtag Booster', prompt: 'Generate the top 10 trending hashtags for cyberpunk fashion and nightlife reels on Pulse.' },
  { label: '🎙️ Livestream Game Idea', prompt: 'Give me 3 interactive livestream game ideas with viewer gift rewards for my next broadcast.' },
  { label: '✨ Catchy 3s Hook', prompt: 'Give me 5 irresistible 3-second video hook lines for dance and beat drops.' },
];

const AI_VOICES = [
  { id: 'Kore', name: 'Kore (Calm & Clear)', gender: 'Female' },
  { id: 'Puck', name: 'Puck (Playful & Upbeat)', gender: 'Male' },
  { id: 'Fenrir', name: 'Fenrir (Deep & Resonant)', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr (Smooth & Modern)', gender: 'Female' },
];

export const AIChatAssistant: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { setActiveTab, openCreateModal } = useApp();
  
  const [messages, setMessages] = useState<AIMessage[]>(INITIAL_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Model and voice configuration
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.7-flash');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [autoSpeakResponses, setAutoSpeakResponses] = useState(false);

  // Voice Conversation Mode State
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceVolumeLevel, setVoiceVolumeLevel] = useState<number[]>(Array(12).fill(10));

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Speech Recognition setup (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript;
              setInputPrompt(text);
              handleSendMessage(text, true);
              setIsListening(false);
            } else {
              interimTranscript += event.results[i][0].transcript;
              setInputPrompt(interimTranscript);
            }
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopAudioPlayback();
    };
  }, [messages, selectedModel, selectedVoice]);

  // Audio visualizer waveform loop for voice mode
  useEffect(() => {
    if (isVoiceModeActive || isListening || isPlayingAudio) {
      const updateWave = () => {
        setVoiceVolumeLevel(
          Array(12)
            .fill(0)
            .map(() => Math.floor(Math.random() * (isPlayingAudio ? 80 : isListening ? 60 : 25) + 15))
        );
        animationFrameRef.current = requestAnimationFrame(updateWave);
      };
      animationFrameRef.current = requestAnimationFrame(updateWave);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setVoiceVolumeLevel(Array(12).fill(10));
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isVoiceModeActive, isListening, isPlayingAudio]);

  const toggleMic = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        setIsListening(false);
      }
    } else {
      try {
        stopAudioPlayback();
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Speech recognition start note:', e);
        setIsListening(false);
      }
    }
  };

  const stopAudioPlayback = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch {
        // ignore
      }
      currentAudioSourceRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const playTTS = async (text: string, base64Audio?: string | null) => {
    stopAudioPlayback();
    setIsPlayingAudio(true);

    if (base64Audio) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
          });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Decode PCM/WAV buffer
        const buffer = await ctx.decodeAudioData(bytes.buffer);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlayingAudio(false);
        currentAudioSourceRef.current = source;
        source.start(0);
        return;
      } catch (err) {
        console.warn('Custom PCM buffer playback failed, falling back to Web Speech:', err);
      }
    }

    // Fallback using high-fidelity Web Speech Synthesizer
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const cleanText = text.replace(/[*_#`[\]()]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleSendMessage = async (textToSend?: string, isVoice = false) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: AIMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput: isVoice,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build API payload for server-side Gemini call
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      const responseText = data.text || 'I have generated your response! ✨';

      // Request speech synthesis if in voice mode or auto-speak is enabled
      let audioBase64: string | null = null;
      if (isVoiceModeActive || autoSpeakResponses) {
        try {
          const voiceRes = await fetch('/api/ai/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: responseText.substring(0, 350), // speak the hook/summary
              voiceName: selectedVoice,
            }),
          });
          const voiceData = await voiceRes.json();
          audioBase64 = voiceData.audioData || null;
        } catch {
          // fallback gracefully
        }
      }

      const assistantMessage: AIMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        audioBase64,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (isVoiceModeActive || autoSpeakResponses) {
        playTTS(responseText, audioBase64);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMessage: AIMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `⚡ I am here to help! Let me craft that reel strategy for you:\n\n🔥 **Idea:** Focus on high contrast visuals, open with a 2-second question hook, and sync your beat drops to on-screen text animations!\n\n🏷️ **Hashtags:** #PulseCreatives #TrendingNow #ViralAudio`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.7-flash',
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    stopAudioPlayback();
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col h-[calc(100vh-140px)] max-h-[820px] bg-slate-950 text-slate-100 relative">
      {/* Top Navigation Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              stopAudioPlayback();
              if (onBack) onBack();
              else setActiveTab('dms');
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-fuchsia-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-xs text-white">Pulse AI Assistant</h2>
              <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> GEMINI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>{isListening ? '🎙️ Listening...' : isPlayingAudio ? '🔊 Speaking...' : 'Live 24/7 Creator Intelligence'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice Mode Toggle Button */}
          <button
            onClick={() => {
              const next = !isVoiceModeActive;
              setIsVoiceModeActive(next);
              if (next) {
                setAutoSpeakResponses(true);
                toggleMic();
              } else {
                stopAudioPlayback();
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isVoiceModeActive
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-500/30 ring-1 ring-white/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
            title="Toggle Live Voice Conversation"
          >
            <Radio className={`w-3.5 h-3.5 ${isVoiceModeActive ? 'animate-pulse text-white' : 'text-fuchsia-400'}`} />
            <span>Voice</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model & Voice Configuration Drawer */}
      <div className="px-3.5 py-1.5 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="font-semibold text-slate-400 shrink-0">Model:</span>
          {[
            { id: 'gemini-3.7-flash', label: 'Flash 3.7' },
            { id: 'gemini-3.5-flash', label: '3.5 Flash' },
            { id: 'gemini-3.1-pro-preview', label: '3.1 Pro' },
            { id: 'gemini-3.1-flash-lite', label: 'Fast Lite' },
            { id: 'gemini-3.1-flash-live-preview', label: 'Live API' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0 ${
                selectedModel === m.id
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-semibold'
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setAutoSpeakResponses(!autoSpeakResponses)}
            className={`p-1 rounded-lg transition-colors ${autoSpeakResponses ? 'text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'}`}
            title={autoSpeakResponses ? 'Mute auto speech' : 'Enable auto speech'}
          >
            {autoSpeakResponses ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive Voice Mode Banner */}
      {isVoiceModeActive && (
        <div className="p-4 bg-gradient-to-b from-fuchsia-950/40 via-indigo-950/30 to-transparent border-b border-fuchsia-500/20 flex flex-col items-center justify-center shrink-0">
          <div className="flex items-center gap-1.5 h-8 mb-2">
            {voiceVolumeLevel.map((height, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-gradient-to-t from-fuchsia-500 to-indigo-400 rounded-full transition-all duration-75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-600/30'
              }`}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <div className="text-left">
              <p className="text-xs font-bold text-white">
                {isListening ? 'Listening to your voice...' : isPlayingAudio ? 'Gemini is speaking...' : 'Tap Mic & speak naturally'}
              </p>
              <p className="text-[11px] text-slate-400">
                Voice: <span className="text-fuchsia-300 font-semibold">{selectedVoice}</span> (Gemini Live Mode)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={`${msg.id}-${idx}`}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 p-0.5 shrink-0 mt-0.5 shadow-sm">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                  </div>
                </div>
              )}

              <div className={`flex flex-col max-w-[84%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed transition-all shadow-sm ${
                    isUser
                      ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-normal selection:bg-fuchsia-500 selection:text-white">
                    {msg.content}
                  </div>

                  {/* Actions for Assistant Message */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                          {msg.modelUsed || 'gemini-3.7-flash'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Listen TTS button */}
                        <button
                          onClick={() => playTTS(msg.content, msg.audioBase64)}
                          className="hover:text-fuchsia-400 flex items-center gap-1 transition-colors"
                          title="Listen with voice"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Play</span>
                        </button>

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-fuchsia-400 flex items-center gap-1 transition-colors"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Quick Transfer to Reel Creator */}
                        {msg.content.toLowerCase().includes('reel') && (
                          <button
                            onClick={() => openCreateModal('reel')}
                            className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold flex items-center gap-1"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Create Reel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-spin" />
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" />
              <span>Pulse AI is thinking & reasoning...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {PROMPT_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputPrompt(item.prompt);
              handleSendMessage(item.prompt);
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 text-[11px] text-slate-300 hover:text-white shrink-0 transition-colors flex items-center gap-1"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Input Field & Controls */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white'
            }`}
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Pulse AI anything (e.g. Write a viral reel script)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:brightness-110 disabled:opacity-40 text-white rounded-xl shadow-md shadow-fuchsia-600/30 transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
