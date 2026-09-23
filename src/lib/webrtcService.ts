import { supabase } from './supabase';
import { CallSignalPayload, CallType, User, VoiceEffect } from '../types';
import { voiceChanger } from './voiceChanger';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export interface WebRTCCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onSignalMessage?: (signal: CallSignalPayload) => void;
  onCallEnded?: (reason?: string) => void;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private rawLocalStream: MediaStream | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks = {};
  private supabaseChannel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private currentCallId: string | null = null;
  private facingMode: 'user' | 'environment' = 'user';
  private currentVoiceEffect: VoiceEffect = 'original';
  private voiceProcessorDispose: (() => void) | null = null;
  private voiceProcessorSetEffect: ((effect: VoiceEffect) => void) | null = null;
  private voiceProcessorGetLevel: (() => number) | null = null;

  constructor(callbacks: WebRTCCallbacks = {}) {
    this.callbacks = callbacks;
    this.initBroadcastChannel();
  }

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pulse_webrtc_signaling_mesh');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && this.callbacks.onSignalMessage) {
            this.callbacks.onSignalMessage(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment:', e);
      }
    }
  }

  // Connect to Supabase Realtime channel for global/room call signaling
  subscribeToSignals(userId?: string) {
    if (!supabase) return;

    try {
      const channelName = 'pulse_calling_signals';
      this.supabaseChannel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      this.supabaseChannel
        .on('broadcast', { event: 'call_signal' }, ({ payload }: { payload: CallSignalPayload }) => {
          if (!payload) return;
          // Filter if targeted to someone else
          if (payload.receiverId && userId && payload.receiverId !== userId && payload.receiverId !== 'all') {
            return;
          }
          this.callbacks.onSignalMessage?.(payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase call signals subscription error:', e);
    }

    // Connect to shared backend SSE stream for cross-device signaling
    if (typeof window !== 'undefined' && 'EventSource' in window && userId) {
      try {
        const es = new EventSource(`/api/realtime/stream?userId=${encodeURIComponent(userId)}`);
        es.addEventListener('call_signal', (e: MessageEvent) => {
          try {
            const record = JSON.parse(e.data);
            if (record && record.signal) {
              this.callbacks.onSignalMessage?.(record.signal);
            }
          } catch {}
        });
      } catch (err) {
        console.warn('SSE signaling stream warning:', err);
      }
    }

    // Fallback polling for signals
    if (typeof window !== 'undefined' && userId) {
      let lastTimestamp = Date.now() - 5000;
      setInterval(async () => {
        try {
          const resp = await fetch(`/api/signals?userId=${encodeURIComponent(userId)}&since=${lastTimestamp}`);
          if (resp.ok) {
            const json = await resp.json();
            if (json.success && Array.isArray(json.signals)) {
              for (const sig of json.signals) {
                if (sig.timestamp > lastTimestamp) {
                  lastTimestamp = sig.timestamp;
                  this.callbacks.onSignalMessage?.(sig.signal);
                }
              }
            }
          }
        } catch {}
      }, 2000);
    }
  }

  // Send a signal via Supabase Realtime, shared backend, and local BroadcastChannel
  async sendSignal(payload: CallSignalPayload) {
    // 1. Broadcast locally across browser tabs
    try {
      this.broadcastChannel?.postMessage(payload);
    } catch {}

    // 2. Broadcast through shared server backend for separate mobile devices
    if (payload.receiverId && payload.receiverId !== 'all') {
      try {
        fetch('/api/signals/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: payload.caller?.id || 'sender',
            to: payload.receiverId,
            signal: payload,
          }),
        }).catch(() => {});
      } catch {}
    }

    // 3. Broadcast through Supabase Realtime channel
    if (this.supabaseChannel) {
      try {
        await this.supabaseChannel.send({
          type: 'broadcast',
          event: 'call_signal',
          payload,
        });
      } catch (err) {
        console.warn('Error sending signal to Supabase Realtime:', err);
      }
    }
  }

  // Initialize Media Devices (Audio/Video) with synthetic fallback for sandbox reliability
  async setupMediaStream(
    callType: CallType, 
    facing: 'user' | 'environment' = 'user',
    voiceEffect: VoiceEffect = this.currentVoiceEffect
  ): Promise<MediaStream> {
    this.facingMode = facing;
    this.currentVoiceEffect = voiceEffect;
    this.stopMediaTracks();

    let stream: MediaStream | null = null;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType === 'video' ? {
            facingMode: facing,
            width: { ideal: 1280, min: 480 },
            height: { ideal: 720, min: 360 },
            frameRate: { ideal: 30 },
          } : false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        console.warn('Direct getUserMedia unavailable or denied. Generating simulated stream for call preview:', mediaErr);
        stream = this.createSyntheticMediaStream(callType);
      }
    } else {
      stream = this.createSyntheticMediaStream(callType);
    }

    this.rawLocalStream = stream;

    // Attach real-time Web Audio API Voice DSP processing pipeline
    try {
      const processed = voiceChanger.processMediaStream(stream, voiceEffect);
      this.localStream = processed.outputStream;
      this.voiceProcessorSetEffect = processed.setEffect;
      this.voiceProcessorGetLevel = processed.getAudioLevel;
      this.voiceProcessorDispose = processed.dispose;
    } catch (dspErr) {
      console.warn('Voice DSP attach notice:', dspErr);
      this.localStream = stream;
    }

    this.callbacks.onLocalStream?.(this.localStream);
    return this.localStream;
  }

  // Generates smooth canvas/audio fallback stream if hardware camera is blocked in iframe
  private createSyntheticMediaStream(callType: CallType): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    let animFrame: number;
    let tick = 0;

    const renderSyntheticVideo = () => {
      if (!ctx) return;
      tick += 0.04;

      // Dark background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#3b0764');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dynamic animated pulse aura
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 90 + Math.sin(tick * 3) * 15;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217, 70, 239, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fillStyle = '#9333ea';
      ctx.fill();

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pulse HD Stream', cx, cy + 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '13px sans-serif';
      ctx.fillText(callType === 'video' ? 'Live Video Preview' : 'Encrypted Voice Room', cx, cy + 32);

      animFrame = requestAnimationFrame(renderSyntheticVideo);
    };

    if (callType === 'video') {
      renderSyntheticVideo();
    }

    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();

    // Create synthetic silent audio track using Web Audio API
    let audioTrack: MediaStreamTrack | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001; // Silent
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        audioTrack = dest.stream.getAudioTracks()[0] || null;
      }
    } catch {}

    const streamTracks: MediaStreamTrack[] = [];
    if (callType === 'video') {
      const videoTracks = canvasStream.getVideoTracks();
      if (videoTracks.length > 0) streamTracks.push(videoTracks[0]);
    }
    if (audioTrack) {
      streamTracks.push(audioTrack);
    }

    return new MediaStream(streamTracks);
  }

  // Create RTCPeerConnection with STUN configuration
  private initPeerConnection(callId: string): RTCPeerConnection {
    this.currentCallId = callId;
    this.cleanupPeerConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection = pc;

    // Attach local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.callbacks.onRemoteStream?.(event.streams[0]);
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.callbacks.onRemoteStream?.(this.remoteStream);
      }
    };

    // Send ICE candidates to remote peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        this.sendSignal({
          type: 'call-ice-candidate',
          callId: this.currentCallId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Track connection state
    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.warn('WebRTC peer connection state:', pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.callbacks.onConnectionStateChange?.('connected');
      }
    };

    return pc;
  }

  // Start outgoing call: Create SDP Offer
  async createOffer(callId: string, callType: CallType, caller: User, receiverId: string): Promise<RTCSessionDescriptionInit> {
    await this.setupMediaStream(callType);
    const pc = this.initPeerConnection(callId);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video',
    });

    await pc.setLocalDescription(offer);

    // Send offer signal
    await this.sendSignal({
      type: 'call-offer',
      callId,
      caller,
      receiverId,
      callType,
      sdp: offer,
    });

    return offer;
  }

  // Handle incoming call offer and return SDP Answer
  async handleOffer(callId: string, offerSdp: RTCSessionDescriptionInit, callType: CallType): Promise<RTCSessionDescriptionInit> {
    await this.setupMediaStream(callType);
    const pc = this.initPeerConnection(callId);

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

    // Drain queued ICE candidates
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.warn('Error adding queued ICE candidate:', err);
        });
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer signal
    await this.sendSignal({
      type: 'call-answer',
      callId,
      sdp: answer,
    });

    return answer;
  }

  // Handle incoming SDP Answer
  async handleAnswer(answerSdp: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));

    // Drain queued ICE candidates
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.warn('Error adding queued ICE candidate after answer:', err);
        });
      }
    }
  }

  // Handle incoming remote ICE Candidate
  async handleIceCandidate(candidateInit: RTCIceCandidateInit) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidateInit);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (err) {
      console.warn('Error adding incoming ICE candidate:', err);
    }
  }

  // Toggle Microphone Mute
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    if (this.currentCallId) {
      this.sendSignal({
        type: 'call-media-state',
        callId: this.currentCallId,
        isMuted: !enabled,
      });
    }
  }

  // Toggle Camera Video Feed
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    if (this.currentCallId) {
      this.sendSignal({
        type: 'call-media-state',
        callId: this.currentCallId,
        isVideoOff: !enabled,
      });
    }
  }

  // Flip Camera between User and Environment
  async switchCamera(callType: CallType): Promise<MediaStream | null> {
    if (callType !== 'video') return null;
    const nextFacing = this.facingMode === 'user' ? 'environment' : 'user';
    const newStream = await this.setupMediaStream('video', nextFacing, this.currentVoiceEffect);

    if (this.peerConnection && newStream) {
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = this.peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
    }
    return newStream;
  }

  // Switch Voice Changer Effect dynamically in real-time
  setVoiceEffect(effect: VoiceEffect) {
    this.currentVoiceEffect = effect;

    // 1. If active processor attached, update DSP parameters live
    if (this.voiceProcessorSetEffect) {
      this.voiceProcessorSetEffect(effect);
    } else if (this.rawLocalStream) {
      // Re-initialize DSP pipeline with current input stream
      try {
        const processed = voiceChanger.processMediaStream(this.rawLocalStream, effect);
        this.localStream = processed.outputStream;
        this.voiceProcessorSetEffect = processed.setEffect;
        this.voiceProcessorGetLevel = processed.getAudioLevel;
        this.voiceProcessorDispose = processed.dispose;

        // Replace track on active WebRTC RTCPeerConnection sender
        if (this.peerConnection) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          if (audioTrack) {
            const sender = this.peerConnection.getSenders().find((s) => s.track && s.track.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack);
            }
          }
        }
        this.callbacks.onLocalStream?.(this.localStream);
      } catch (err) {
        console.warn('Failed to switch voice effect pipeline:', err);
      }
    }
  }

  getCurrentVoiceEffect(): VoiceEffect {
    return this.currentVoiceEffect;
  }

  getAudioActivityLevel(): number {
    return this.voiceProcessorGetLevel ? this.voiceProcessorGetLevel() : 0;
  }

  // Stop local hardware tracks safely
  stopMediaTracks() {
    if (this.voiceProcessorDispose) {
      try {
        this.voiceProcessorDispose();
      } catch {}
      this.voiceProcessorDispose = null;
      this.voiceProcessorSetEffect = null;
      this.voiceProcessorGetLevel = null;
    }
    if (this.rawLocalStream) {
      this.rawLocalStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.rawLocalStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.remoteStream = null;
    }
  }

  private cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.pendingIceCandidates = [];
  }

  // End active call and broadcast termination
  endCall(callId?: string) {
    const targetCallId = callId || this.currentCallId;
    if (targetCallId) {
      this.sendSignal({
        type: 'call-ended',
        callId: targetCallId,
      });
    }

    this.stopMediaTracks();
    this.cleanupPeerConnection();
    this.currentCallId = null;
  }

  destroy() {
    this.endCall();
    if (this.supabaseChannel && supabase) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch {}
      this.supabaseChannel = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
  }
}

export const webrtcService = new WebRTCService();
