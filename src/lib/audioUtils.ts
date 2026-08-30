// Audio utility using Web Audio API for zero-dependency high fidelity sounds

class AudioController {
  private ctx: AudioContext | null = null;

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

  // Dual-thump heartbeat (lub... dub...)
  playHeartbeat() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1st Thump (Lub) - lower frequency, slightly softer
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();

      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(140, now);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(75, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.15);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.7, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);

      // 2nd Thump (Dub) - slightly higher frequency, stronger
      const offset = 0.18;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();

      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(160, now + offset);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(95, now + offset);
      osc2.frequency.exponentialRampToValueAtTime(45, now + offset + 0.18);

      gain2.gain.setValueAtTime(0.001, now + offset);
      gain2.gain.linearRampToValueAtTime(0.9, now + offset + 0.03);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + offset);
      osc2.stop(now + offset + 0.25);
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

  // Voice note synthesized speech melody
  playVoiceNotePlayback(durationSeconds: number = 3, onEnded?: () => void) {
    try {
      const ctx = this.getContext();
      if (!ctx) return () => {};
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.setValueAtTime(3, now);

      osc.type = 'sawtooth';
      
      // Formant frequency modulation to simulate friendly vocal tone
      const freqs = [220, 260, 310, 260, 330, 290, 350, 280, 220];
      const step = durationSeconds / freqs.length;
      freqs.forEach((f, i) => {
        osc.frequency.setValueAtTime(f, now + i * step);
      });

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + durationSeconds);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);

      const timer = setTimeout(() => {
        if (onEnded) onEnded();
      }, durationSeconds * 1000);

      return () => {
        try {
          clearTimeout(timer);
          osc.stop();
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
}

export const audioUtils = new AudioController();
export { voiceChanger, VoiceChangerEngine, VOICE_PRESETS } from './voiceChanger';

