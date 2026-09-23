// Audio utility using Web Audio API for zero-dependency high fidelity sounds

class AudioController {
  private ctx: AudioContext | null = null;
  private hasUnlocked = false;
  private unlockListenersAttached = false;

  constructor() {
    this.attachUnlockListeners();
  }

  private attachUnlockListeners() {
    if (typeof window === 'undefined' || this.unlockListenersAttached) return;
    this.unlockListenersAttached = true;

    const unlockHandler = () => {
      this.unlockAudio();
    };

    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, unlockHandler, { once: false, passive: true });
    });
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.hasUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.hasUnlocked = true;
      }
    } catch (e) {
      // safe
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Lightweight VIP 6-Second Splash Audio Experience
  playVipSplashSequence() {
    try {
      const ctx = this.getContext();
      if (!ctx) return () => {};

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.4, now);

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-12, now);
      comp.knee.setValueAtTime(25, now);
      comp.ratio.setValueAtTime(10, now);
      comp.attack.setValueAtTime(0.005, now);
      comp.release.setValueAtTime(0.2, now);

      master.connect(comp);
      comp.connect(ctx.destination);

      // 1. (0.0s - 1.2s) Warm Ambient Startup Drone
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(100, now);
      droneFilter.frequency.exponentialRampToValueAtTime(360, now + 1.2);

      droneOsc.type = 'triangle';
      droneOsc.frequency.setValueAtTime(65, now);
      droneOsc.frequency.linearRampToValueAtTime(98, now + 1.0);

      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.4, now + 0.3);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(master);
      droneOsc.start(now);
      droneOsc.stop(now + 1.5);

      // 2. (1.5s - 2.8s) Heartbeat EKG Line Traveling Whoosh
      const sweepTime = now + 1.5;
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      const sweepFilter = ctx.createBiquadFilter();
      sweepFilter.type = 'bandpass';
      sweepFilter.Q.setValueAtTime(4.0, sweepTime);
      sweepFilter.frequency.setValueAtTime(220, sweepTime);
      sweepFilter.frequency.exponentialRampToValueAtTime(880, sweepTime + 1.0);

      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(110, sweepTime);
      sweepOsc.frequency.exponentialRampToValueAtTime(330, sweepTime + 1.0);

      sweepGain.gain.setValueAtTime(0.001, sweepTime);
      sweepGain.gain.linearRampToValueAtTime(0.22, sweepTime + 0.5);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, sweepTime + 1.2);

      sweepOsc.connect(sweepFilter);
      sweepFilter.connect(sweepGain);
      sweepGain.connect(master);
      sweepOsc.start(sweepTime);
      sweepOsc.stop(sweepTime + 1.3);

      // 3. (3.0s - 4.2s) VIP Neon Rings Expanding Shimmer (Chords: F#4, A#4, C#5, F5)
      const ringTime = now + 3.0;
      [370, 466, 554, 698].forEach((freq, i) => {
        const ringOsc = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ringOsc.type = 'sine';
        ringOsc.frequency.setValueAtTime(freq, ringTime + i * 0.06);

        ringGain.gain.setValueAtTime(0.001, ringTime + i * 0.06);
        ringGain.gain.linearRampToValueAtTime(0.12, ringTime + i * 0.06 + 0.04);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, ringTime + 1.0);

        ringOsc.connect(ringGain);
        ringGain.connect(master);
        ringOsc.start(ringTime + i * 0.06);
        ringOsc.stop(ringTime + 1.1);
      });

      // 4. (5.4s - 6.0s) Final Powerful Smooth Heartbeat ("Dak!") Pulse
      const beatTime = now + 5.4;
      
      // Sub Thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(105, beatTime);
      subOsc.frequency.exponentialRampToValueAtTime(32, beatTime + 0.35);

      subGain.gain.setValueAtTime(0.001, beatTime);
      subGain.gain.linearRampToValueAtTime(1.6, beatTime + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.45);

      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start(beatTime);
      subOsc.stop(beatTime + 0.5);

      // Mid Punch
      const midOsc = ctx.createOscillator();
      const midGain = ctx.createGain();
      midOsc.type = 'triangle';
      midOsc.frequency.setValueAtTime(190, beatTime);
      midOsc.frequency.exponentialRampToValueAtTime(55, beatTime + 0.15);

      midGain.gain.setValueAtTime(0.001, beatTime);
      midGain.gain.linearRampToValueAtTime(0.85, beatTime + 0.015);
      midGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.2);

      midOsc.connect(midGain);
      midGain.connect(master);
      midOsc.start(beatTime);
      midOsc.stop(beatTime + 0.25);

      return () => {
        try {
          master.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }

  // Synchronized 6-Second Cinematic Splash Audio Score
  playCinematicSplashSequence() {
    try {
      const ctx = this.getContext();
      if (!ctx) return () => {};

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.8, now);

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-14, now);
      comp.knee.setValueAtTime(30, now);
      comp.ratio.setValueAtTime(12, now);
      comp.attack.setValueAtTime(0.003, now);
      comp.release.setValueAtTime(0.25, now);

      master.connect(comp);
      comp.connect(ctx.destination);

      // --- 0.0s - 0.5s: Futuristic Sub Drone Hum ---
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(80, now);
      droneFilter.frequency.exponentialRampToValueAtTime(320, now + 0.4);

      droneOsc.type = 'sawtooth';
      droneOsc.frequency.setValueAtTime(55, now);
      droneOsc.frequency.linearRampToValueAtTime(82, now + 0.35);

      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.6, now + 0.15);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(master);
      droneOsc.start(now);
      droneOsc.stop(now + 0.5);

      // --- 0.3s - 1.0s: Glass Shatter & Explosion Dispersal Whoosh ---
      const shatterTime = now + 0.32;
      [1200, 1600, 2200, 950].forEach((freq, i) => {
        const glassOsc = ctx.createOscillator();
        const glassGain = ctx.createGain();
        glassOsc.type = 'sine';
        glassOsc.frequency.setValueAtTime(freq + i * 200, shatterTime);
        glassOsc.frequency.exponentialRampToValueAtTime(90, shatterTime + 0.4 + i * 0.08);

        glassGain.gain.setValueAtTime(0.001, shatterTime);
        glassGain.gain.linearRampToValueAtTime(0.25, shatterTime + 0.02);
        glassGain.gain.exponentialRampToValueAtTime(0.0001, shatterTime + 0.5 + i * 0.1);

        glassOsc.connect(glassGain);
        glassGain.connect(master);
        glassOsc.start(shatterTime);
        glassOsc.stop(shatterTime + 0.65);
      });

      // --- 1.2s - 2.9s: Magnetic Vortex Energy Rise ---
      const vortexTime = now + 1.2;
      const vortexOsc = ctx.createOscillator();
      const vortexGain = ctx.createGain();
      const vortexFilter = ctx.createBiquadFilter();

      vortexFilter.type = 'bandpass';
      vortexFilter.Q.setValueAtTime(6.0, vortexTime);
      vortexFilter.frequency.setValueAtTime(160, vortexTime);
      vortexFilter.frequency.exponentialRampToValueAtTime(850, vortexTime + 1.6);

      vortexOsc.type = 'triangle';
      vortexOsc.frequency.setValueAtTime(90, vortexTime);
      vortexOsc.frequency.exponentialRampToValueAtTime(420, vortexTime + 1.6);

      vortexGain.gain.setValueAtTime(0.001, vortexTime);
      vortexGain.gain.linearRampToValueAtTime(0.45, vortexTime + 0.8);
      vortexGain.gain.linearRampToValueAtTime(0.65, vortexTime + 1.5);
      vortexGain.gain.exponentialRampToValueAtTime(0.001, vortexTime + 1.8);

      vortexOsc.connect(vortexFilter);
      vortexFilter.connect(vortexGain);
      vortexGain.connect(master);
      vortexOsc.start(vortexTime);
      vortexOsc.stop(vortexTime + 1.85);

      // --- 3.0s - 4.4s: Piece-by-Piece Magnetic Locking Snap Clicks ---
      const snapTimes = [3.05, 3.25, 3.45, 3.65, 3.85, 4.05, 4.25, 4.45];
      snapTimes.forEach((st, idx) => {
        const t = now + st;
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(600 + idx * 80, t);
        snapOsc.frequency.exponentialRampToValueAtTime(140, t + 0.06);

        snapGain.gain.setValueAtTime(0.001, t);
        snapGain.gain.linearRampToValueAtTime(0.35 + idx * 0.04, t + 0.008);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        snapOsc.connect(snapGain);
        snapGain.connect(master);
        snapOsc.start(t);
        snapOsc.stop(t + 0.08);
      });

      // --- 4.8s - 5.5s: VIP Monogram Futuristic Shimmer Chord ---
      const shimmerTime = now + 4.8;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const chimOsc = ctx.createOscillator();
        const chimGain = ctx.createGain();
        chimOsc.type = 'sine';
        chimOsc.frequency.setValueAtTime(freq, shimmerTime + i * 0.04);

        chimGain.gain.setValueAtTime(0.001, shimmerTime + i * 0.04);
        chimGain.gain.linearRampToValueAtTime(0.18, shimmerTime + i * 0.04 + 0.03);
        chimGain.gain.exponentialRampToValueAtTime(0.001, shimmerTime + 0.9);

        chimOsc.connect(chimGain);
        chimGain.connect(master);
        chimOsc.start(shimmerTime + i * 0.04);
        chimOsc.stop(shimmerTime + 1.0);
      });

      // --- 5.7s: Final Reveal Deep Percussive Heartbeat ("Dak!") + Shockwave Tail ---
      const finalBeatTime = now + 5.7;
      
      // 1. Deep Sub Thump
      const finalSub = ctx.createOscillator();
      const finalSubGain = ctx.createGain();
      finalSub.type = 'sine';
      finalSub.frequency.setValueAtTime(110, finalBeatTime);
      finalSub.frequency.exponentialRampToValueAtTime(28, finalBeatTime + 0.35);

      finalSubGain.gain.setValueAtTime(0.001, finalBeatTime);
      finalSubGain.gain.linearRampToValueAtTime(1.5, finalBeatTime + 0.02);
      finalSubGain.gain.exponentialRampToValueAtTime(0.001, finalBeatTime + 0.4);

      finalSub.connect(finalSubGain);
      finalSubGain.connect(master);
      finalSub.start(finalBeatTime);
      finalSub.stop(finalBeatTime + 0.45);

      // 2. High impact slap
      const slapOsc = ctx.createOscillator();
      const slapGain = ctx.createGain();
      slapOsc.type = 'triangle';
      slapOsc.frequency.setValueAtTime(240, finalBeatTime);
      slapOsc.frequency.exponentialRampToValueAtTime(60, finalBeatTime + 0.12);

      slapGain.gain.setValueAtTime(0.001, finalBeatTime);
      slapGain.gain.linearRampToValueAtTime(1.1, finalBeatTime + 0.015);
      slapGain.gain.exponentialRampToValueAtTime(0.001, finalBeatTime + 0.18);

      slapOsc.connect(slapGain);
      slapGain.connect(master);
      slapOsc.start(finalBeatTime);
      slapOsc.stop(finalBeatTime + 0.2);

      // 3. Shimmer tail ring
      const tailOsc = ctx.createOscillator();
      const tailGain = ctx.createGain();
      tailOsc.type = 'sine';
      tailOsc.frequency.setValueAtTime(880, finalBeatTime + 0.05);
      tailOsc.frequency.exponentialRampToValueAtTime(1760, finalBeatTime + 0.3);

      tailGain.gain.setValueAtTime(0.001, finalBeatTime + 0.05);
      tailGain.gain.linearRampToValueAtTime(0.3, finalBeatTime + 0.08);
      tailGain.gain.exponentialRampToValueAtTime(0.0001, finalBeatTime + 0.6);

      tailOsc.connect(tailGain);
      tailGain.connect(master);
      tailOsc.start(finalBeatTime + 0.05);
      tailOsc.stop(finalBeatTime + 0.65);

      return () => {
        try {
          master.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }

  // Maximum gain, high-impact rhythmic heartbeat ('Dak Dak Dak')
  playHeartbeat() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Create Master Compressor & Limiter to allow maximum gain without clipping
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(2.2, now); // Maximum volume multiplier

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, now);
      compressor.knee.setValueAtTime(25, now);
      compressor.ratio.setValueAtTime(14, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.2, now);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      // --- Helper to synthesize a punchy, deep percussive thump ---
      const createThump = (startTime: number, baseFreq: number, gainLevel: number, duration: number) => {
        // 1. Sub-bass body oscillator (deep resonant thud)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        const subFilter = ctx.createBiquadFilter();

        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(220, startTime);
        subFilter.Q.setValueAtTime(3.5, startTime);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(baseFreq * 1.5, startTime);
        subOsc.frequency.exponentialRampToValueAtTime(32, startTime + duration);

        subGain.gain.setValueAtTime(0.001, startTime);
        subGain.gain.linearRampToValueAtTime(gainLevel * 1.4, startTime + 0.025);
        subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(masterGain);

        subOsc.start(startTime);
        subOsc.stop(startTime + duration + 0.05);

        // 2. Mid-harmonic punch oscillator (creates the tactile "Dak" chest-thump impact)
        const midOsc = ctx.createOscillator();
        const midGain = ctx.createGain();

        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(baseFreq * 2.2, startTime);
        midOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startTime + 0.08);

        midGain.gain.setValueAtTime(0.001, startTime);
        midGain.gain.linearRampToValueAtTime(gainLevel * 0.9, startTime + 0.015);
        midGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

        midOsc.connect(midGain);
        midGain.connect(masterGain);

        midOsc.start(startTime);
        midOsc.stop(startTime + 0.14);

        // 3. Transient click/tick for high-frequency acoustic cut on small speakers
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        const clickFilter = ctx.createBiquadFilter();

        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(650, startTime);
        clickFilter.Q.setValueAtTime(4.0, startTime);

        clickOsc.type = 'sawtooth';
        clickOsc.frequency.setValueAtTime(320, startTime);
        clickOsc.frequency.exponentialRampToValueAtTime(80, startTime + 0.03);

        clickGain.gain.setValueAtTime(gainLevel * 0.5, startTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(masterGain);

        clickOsc.start(startTime);
        clickOsc.stop(startTime + 0.05);
      };

      // 1st Thump: Primary Strong "DAK" (Lub)
      createThump(now, 85, 1.0, 0.22);

      // 2nd Thump: Rapid Resonant Secondary "DAK" (Dub) at +160ms
      createThump(now + 0.16, 110, 1.2, 0.26);

      // 3rd Thump: Subtle acoustic heartbeat reverb tail at +340ms
      createThump(now + 0.34, 70, 0.35, 0.18);

    } catch (e) {
      // safe fallback
    }
  }

  // Camera snap shutter sound
  playCameraShutter() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Click transient
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

      // Mechanical second click
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(300, now + 0.15);

      gain2.gain.setValueAtTime(0.4, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.18);
    } catch (e) {
      // safe
    }
  }

  // Voice note audio fallback playback chime (soft pleasant tone)
  playVoiceNotePlayback(durationSeconds: number = 3, onEnded?: () => void) {
    try {
      const ctx = this.getContext();
      if (!ctx) {
        if (onEnded) onEnded();
        return () => {};
      }
      const now = ctx.currentTime;

      // Soft pleasant chime tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);

      const timer = setTimeout(() => {
        if (onEnded) onEnded();
      }, durationSeconds * 1000);

      return () => {
        try {
          clearTimeout(timer);
        } catch (e) {}
      };
    } catch (e) {
      if (onEnded) onEnded();
      return () => {};
    }
  }

  playPop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      });
    } catch (e) {}
  }

  // Ringback / Outgoing dial tone
  playOutgoingRing(): () => void {
    try {
      const ctx = this.getContext();
      if (!ctx) return () => {};

      let isRunning = true;
      let timeoutId: any = null;

      const playBeep = () => {
        if (!isRunning || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);

        timeoutId = setTimeout(() => {
          if (isRunning) playBeep();
        }, 3200);
      };

      playBeep();

      return () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    } catch (e) {
      return () => {};
    }
  }

  // Incoming Call Ringtone
  playIncomingRingtone(): () => void {
    try {
      const ctx = this.getContext();
      if (!ctx) return () => {};

      let isRunning = true;
      let timeoutId: any = null;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

      const playChord = () => {
        if (!isRunning || !this.ctx) return;
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.001, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.5);
        });

        timeoutId = setTimeout(() => {
          if (isRunning) playChord();
        }, 2200);
      };

      playChord();

      return () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    } catch (e) {
      return () => {};
    }
  }

  playCallConnected() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [587.33, 880].forEach((freq, i) => { // D5 -> A5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.12, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.35);
      });
    } catch (e) {}
  }

  playCallEnded() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [440, 330, 220].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.12, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
    } catch (e) {}
  }

  // Voice Effect switched notification chime
  playVoiceEffectSwitched(effect: 'original' | 'girl' | 'boy') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const freqs = effect === 'girl' ? [659.25, 880, 1174.66] : effect === 'boy' ? [220, 164.81, 130.81] : [440, 554.37];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = effect === 'girl' ? 'triangle' : effect === 'boy' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch (e) {}
  }

  // Barcode & QR Code scan success high-tech beep
  playBarcodeScanSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Two-tone barcode scanner beep (B5 -> E6)
      [987.77, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.14);
      });
    } catch (e) {}
  }

  // High fidelity arcade coin pickup sparkle sound (E6 -> B6 chime)
  playCoinCollect() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [1318.51, 1975.53]; // E6, B6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.2, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } catch (e) {}
  }

  // Triumphant live stream virtual gift sent sound
  playGiftSent() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Chord arpeggio C5 -> E5 -> G5 -> C6
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.16, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } catch (e) {}
  }
}

export const audioUtils = new AudioController();
export { voiceChanger, VoiceChangerEngine, VOICE_PRESETS } from './voiceChanger';

