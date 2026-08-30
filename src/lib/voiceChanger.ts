import { VoiceEffect } from '../types';

export interface VoicePresetInfo {
  id: VoiceEffect;
  name: string;
  shortName: string;
  icon: string;
  tagline: string;
  pitchRatio: number;
  color: string;
}

export const VOICE_PRESETS: Record<VoiceEffect, VoicePresetInfo> = {
  original: {
    id: 'original',
    name: 'Original Voice',
    shortName: 'Original',
    icon: '🎙️',
    tagline: 'Direct, unfiltered natural voice',
    pitchRatio: 1.0,
    color: '#94a3b8',
  },
  girl: {
    id: 'girl',
    name: 'Girl Voice',
    shortName: 'Girl Voice',
    icon: '👧',
    tagline: 'High vocal pitch & bright female formants',
    pitchRatio: 1.34,
    color: '#f43f5e',
  },
  boy: {
    id: 'boy',
    name: 'Boy Voice',
    shortName: 'Boy Voice',
    icon: '👦',
    tagline: 'Deep masculine pitch & rich chest resonance',
    pitchRatio: 0.78,
    color: '#6366f1',
  },
};

/**
 * Real-Time Web Audio API Voice DSP Engine
 * Performs continuous time-domain granular pitch shifting + multi-stage Biquad formant EQ
 */
export class VoiceChangerEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Biquad Formant EQ Filter Nodes
  private highpassFilter: BiquadFilterNode | null = null;
  private lowShelfFilter: BiquadFilterNode | null = null;
  private formantPeak1: BiquadFilterNode | null = null;
  private formantPeak2: BiquadFilterNode | null = null;
  private highShelfFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private outputGain: GainNode | null = null;

  private currentEffect: VoiceEffect = 'original';
  private currentPitchRatio: number = 1.0;
  private isProcessing: boolean = false;

  // Granular Pitch Shifter Circular Buffer & Playback Pointers
  private readonly bufferSize = 2048;
  private ringBuffer: Float32Array = new Float32Array(8192);
  private ringWriteIndex: number = 0;
  private grain1Phase: number = 0;
  private grain2Phase: number = 1024; // 180-degree offset for smooth Hann crossfade
  private readonly grainSize = 2048;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass({ latencyHint: 'interactive' });
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Transforms an input MediaStream with live DSP pitch/formant nodes
   * Returns a new MediaStream containing the processed audio track + original video tracks
   */
  public processMediaStream(
    inputStream: MediaStream,
    initialEffect: VoiceEffect = 'original'
  ): {
    outputStream: MediaStream;
    setEffect: (effect: VoiceEffect) => void;
    getAudioLevel: () => number;
    dispose: () => void;
  } {
    const audioTrack = inputStream.getAudioTracks()[0];
    if (!audioTrack) {
      return {
        outputStream: inputStream,
        setEffect: () => {},
        getAudioLevel: () => 0,
        dispose: () => {},
      };
    }

    const ctx = this.initAudioContext();
    if (!ctx) {
      return {
        outputStream: inputStream,
        setEffect: () => {},
        getAudioLevel: () => 0,
        dispose: () => {},
      };
    }

    // Clean any prior pipeline
    this.cleanup();

    try {
      // 1. Source Node from input stream
      this.sourceNode = ctx.createMediaStreamSource(inputStream);

      // 2. Destination Node for output stream
      this.destNode = ctx.createMediaStreamDestination();

      // 3. Analyser for real-time live vocal amplitude visualization
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // 4. Formant EQ Stage (Cascade of precision BiquadFilterNodes)
      this.highpassFilter = ctx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';

      this.lowShelfFilter = ctx.createBiquadFilter();
      this.lowShelfFilter.type = 'lowshelf';

      this.formantPeak1 = ctx.createBiquadFilter();
      this.formantPeak1.type = 'peaking';

      this.formantPeak2 = ctx.createBiquadFilter();
      this.formantPeak2.type = 'peaking';

      this.highShelfFilter = ctx.createBiquadFilter();
      this.highShelfFilter.type = 'highshelf';

      // 5. Studio Dynamics Compressor to prevent clipping & maintain vocal presence
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, ctx.currentTime);

      this.outputGain = ctx.createGain();
      this.outputGain.gain.setValueAtTime(1.0, ctx.currentTime);

      // 6. Time-Domain Granular Pitch Shifter Processor Node
      this.processorNode = ctx.createScriptProcessor(this.bufferSize, 1, 1);
      this.ringBuffer = new Float32Array(8192);
      this.ringWriteIndex = 0;
      this.grain1Phase = 0;
      this.grain2Phase = this.grainSize / 2;

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = e.outputBuffer.getChannelData(0);
        const pitch = this.currentPitchRatio;

        // If 'original' passthrough with ratio 1.0, direct copy with zero latency
        if (this.currentEffect === 'original' || Math.abs(pitch - 1.0) < 0.01) {
          outputData.set(inputData);
          return;
        }

        const ringLen = this.ringBuffer.length;
        const gSize = this.grainSize;
        const halfGrain = gSize / 2;

        for (let i = 0; i < inputData.length; i++) {
          // Write incoming sample to circular buffer
          this.ringBuffer[this.ringWriteIndex] = inputData[i];

          // Compute Grain 1 (Hann window modulated sample)
          const g1Norm = this.grain1Phase / gSize;
          const w1 = 0.5 * (1 - Math.cos(2 * Math.PI * g1Norm));
          const rPos1 = (this.ringWriteIndex - gSize + this.grain1Phase + ringLen) % ringLen;
          const sample1 = this.ringBuffer[Math.floor(rPos1)];

          // Compute Grain 2 (Hann window modulated sample, 180 deg offset)
          const g2Norm = this.grain2Phase / gSize;
          const w2 = 0.5 * (1 - Math.cos(2 * Math.PI * g2Norm));
          const rPos2 = (this.ringWriteIndex - gSize + this.grain2Phase + ringLen) % ringLen;
          const sample2 = this.ringBuffer[Math.floor(rPos2)];

          // Overlap-add combination
          outputData[i] = sample1 * w1 + sample2 * w2;

          // Advance write index
          this.ringWriteIndex = (this.ringWriteIndex + 1) % ringLen;

          // Advance grain phases with pitch scaling
          this.grain1Phase += pitch;
          if (this.grain1Phase >= gSize) {
            this.grain1Phase = 0;
          }

          this.grain2Phase += pitch;
          if (this.grain2Phase >= gSize) {
            this.grain2Phase = 0;
          }
        }
      };

      // 7. Connect Audio Node Graph:
      // Source -> Highpass -> LowShelf -> Formant1 -> Formant2 -> HighShelf -> PitchShifter -> Compressor -> OutputGain -> Analyser -> Destination
      this.sourceNode.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowShelfFilter);
      this.lowShelfFilter.connect(this.formantPeak1);
      this.formantPeak1.connect(this.formantPeak2);
      this.formantPeak2.connect(this.highShelfFilter);
      this.highShelfFilter.connect(this.processorNode);
      this.processorNode.connect(this.compressor);
      this.compressor.connect(this.outputGain);
      this.outputGain.connect(this.analyserNode);
      this.analyserNode.connect(this.destNode);

      this.isProcessing = true;
      this.applyEffectParameters(initialEffect);

      // Create composite stream: Processed Audio + Existing Video
      const processedAudioTrack = this.destNode.stream.getAudioTracks()[0];
      const resultTracks: MediaStreamTrack[] = [];
      if (processedAudioTrack) {
        resultTracks.push(processedAudioTrack);
      }
      inputStream.getVideoTracks().forEach((vTrack) => resultTracks.push(vTrack));

      const outputStream = new MediaStream(resultTracks);

      return {
        outputStream,
        setEffect: (effect: VoiceEffect) => this.applyEffectParameters(effect),
        getAudioLevel: () => this.getAudioLevel(),
        dispose: () => this.cleanup(),
      };
    } catch (err) {
      console.warn('[VoiceChangerEngine] Web Audio processing fallback:', err);
      return {
        outputStream: inputStream,
        setEffect: () => {},
        getAudioLevel: () => 0,
        dispose: () => {},
      };
    }
  }

  /**
   * Applies the exact pitch ratio & formant EQ contour for natural human voices
   */
  public applyEffectParameters(effect: VoiceEffect) {
    this.currentEffect = effect;
    const ctx = this.audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const preset = VOICE_PRESETS[effect] || VOICE_PRESETS.original;
    this.currentPitchRatio = preset.pitchRatio;

    if (!this.highpassFilter || !this.lowShelfFilter || !this.formantPeak1 || !this.formantPeak2 || !this.highShelfFilter || !this.outputGain) {
      return;
    }

    if (effect === 'girl') {
      // --- NATURAL GIRL VOICE DSP ---
      // Higher vocal tract formants + highpass cleanup
      this.highpassFilter.frequency.setTargetAtTime(190, now, 0.05);
      this.highpassFilter.Q.setTargetAtTime(0.8, now, 0.05);

      // Reduce male chest fundamental boom
      this.lowShelfFilter.frequency.setTargetAtTime(240, now, 0.05);
      this.lowShelfFilter.gain.setTargetAtTime(-3.5, now, 0.05);

      // Boost female vowel pharyngeal formant
      this.formantPeak1.frequency.setTargetAtTime(1350, now, 0.05);
      this.formantPeak1.Q.setTargetAtTime(1.4, now, 0.05);
      this.formantPeak1.gain.setTargetAtTime(3.2, now, 0.05);

      // Boost female oral cavity formant resonance (2.8k - 3.4k Hz)
      this.formantPeak2.frequency.setTargetAtTime(3300, now, 0.05);
      this.formantPeak2.Q.setTargetAtTime(1.6, now, 0.05);
      this.formantPeak2.gain.setTargetAtTime(4.5, now, 0.05);

      // Silk airy treble presence
      this.highShelfFilter.frequency.setTargetAtTime(5800, now, 0.05);
      this.highShelfFilter.gain.setTargetAtTime(3.0, now, 0.05);

      this.outputGain.gain.setTargetAtTime(1.15, now, 0.05);
    } else if (effect === 'boy') {
      // --- NATURAL BOY / DEEP MAN VOICE DSP ---
      // Deep baritone chest resonance & rounded upper vocal tract
      this.highpassFilter.frequency.setTargetAtTime(65, now, 0.05);
      this.highpassFilter.Q.setTargetAtTime(0.7, now, 0.05);

      // Boost lower chest vocal tract fundamental (110 - 150 Hz)
      this.lowShelfFilter.frequency.setTargetAtTime(140, now, 0.05);
      this.lowShelfFilter.gain.setTargetAtTime(4.8, now, 0.05);

      // Masculine vocal body resonance at 320 Hz
      this.formantPeak1.frequency.setTargetAtTime(320, now, 0.05);
      this.formantPeak1.Q.setTargetAtTime(1.5, now, 0.05);
      this.formantPeak1.gain.setTargetAtTime(3.2, now, 0.05);

      // Clean speech clarity at 1650 Hz
      this.formantPeak2.frequency.setTargetAtTime(1650, now, 0.05);
      this.formantPeak2.Q.setTargetAtTime(1.2, now, 0.05);
      this.formantPeak2.gain.setTargetAtTime(1.8, now, 0.05);

      // Soften shrill highs for warm, radio-grade baritone presence
      this.highShelfFilter.frequency.setTargetAtTime(4500, now, 0.05);
      this.highShelfFilter.gain.setTargetAtTime(-2.5, now, 0.05);

      this.outputGain.gain.setTargetAtTime(1.2, now, 0.05);
    } else {
      // --- ORIGINAL NATURAL PASSTHROUGH ---
      this.highpassFilter.frequency.setTargetAtTime(20, now, 0.05);
      this.highpassFilter.Q.setTargetAtTime(0.7, now, 0.05);

      this.lowShelfFilter.frequency.setTargetAtTime(100, now, 0.05);
      this.lowShelfFilter.gain.setTargetAtTime(0, now, 0.05);

      this.formantPeak1.frequency.setTargetAtTime(1000, now, 0.05);
      this.formantPeak1.Q.setTargetAtTime(1.0, now, 0.05);
      this.formantPeak1.gain.setTargetAtTime(0, now, 0.05);

      this.formantPeak2.frequency.setTargetAtTime(3000, now, 0.05);
      this.formantPeak2.Q.setTargetAtTime(1.0, now, 0.05);
      this.formantPeak2.gain.setTargetAtTime(0, now, 0.05);

      this.highShelfFilter.frequency.setTargetAtTime(8000, now, 0.05);
      this.highShelfFilter.gain.setTargetAtTime(0, now, 0.05);

      this.outputGain.gain.setTargetAtTime(1.0, now, 0.05);
    }
  }

  /**
   * Returns instant microphone amplitude (0 - 100) for real-time waveform UI meters
   */
  public getAudioLevel(): number {
    if (!this.analyserNode) return 0;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(100, Math.round((avg / 255) * 100));
  }

  public cleanup() {
    this.isProcessing = false;
    try {
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
        this.processorNode = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.highpassFilter) {
        this.highpassFilter.disconnect();
        this.highpassFilter = null;
      }
      if (this.lowShelfFilter) {
        this.lowShelfFilter.disconnect();
        this.lowShelfFilter = null;
      }
      if (this.formantPeak1) {
        this.formantPeak1.disconnect();
        this.formantPeak1 = null;
      }
      if (this.formantPeak2) {
        this.formantPeak2.disconnect();
        this.formantPeak2 = null;
      }
      if (this.highShelfFilter) {
        this.highShelfFilter.disconnect();
        this.highShelfFilter = null;
      }
      if (this.compressor) {
        this.compressor.disconnect();
        this.compressor = null;
      }
      if (this.outputGain) {
        this.outputGain.disconnect();
        this.outputGain = null;
      }
      if (this.analyserNode) {
        this.analyserNode.disconnect();
        this.analyserNode = null;
      }
      if (this.destNode) {
        this.destNode.disconnect();
        this.destNode = null;
      }
    } catch (e) {
      // Safe cleanup
    }
  }
}

export const voiceChanger = new VoiceChangerEngine();
