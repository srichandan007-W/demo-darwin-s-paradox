import { AudioEvent } from './types';

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;
  private userUnlocked = false;

  public unlock(): void {
    this.userUnlocked = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.32, this.ctx.currentTime, 0.02);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.userUnlocked) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.32;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playEvents(events: AudioEvent[]): void {
    if (events.length === 0 || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    for (const ev of events) {
      this.playSingle(ctx, this.masterGain, ev);
    }
  }

  private playSingle(ctx: AudioContext, dest: AudioNode, ev: AudioEvent): void {
    const now = ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    switch (ev.type) {
      case 'jump': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(190 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(420 * pitchJitter, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'land': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(125 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.08);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'splash': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'ink_fire': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(480 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.11);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }
      case 'ink_splat': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.15);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.17);
        break;
      }
      case 'camo_on':
      case 'camo_off': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const f1 = ev.type === 'camo_on' ? 280 : 440;
        const f2 = ev.type === 'camo_on' ? 520 : 240;
        osc.frequency.setValueAtTime(f1, now);
        osc.frequency.exponentialRampToValueAtTime(f2, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      case 'grapple': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240 * pitchJitter, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'lever':
      case 'plate': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(260, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }
      case 'pearl': {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.055);
          gain.gain.setValueAtTime(0.15, now + idx * 0.055);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.22);
          osc.connect(gain).connect(dest);
          osc.start(now + idx * 0.055);
          osc.stop(now + idx * 0.055 + 0.23);
        });
        break;
      }
      case 'alert_windup': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.linearRampToValueAtTime(860, now + 0.18);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.21);
        break;
      }
      case 'hurt': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.28);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.31);
        break;
      }
      case 'crusher_slam': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);
        gain.gain.setValueAtTime(0.2 * (ev.intensity ?? 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain).connect(dest);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'sector_clear':
      case 'victory': {
        const notes = ev.type === 'victory' ? [392, 493.88, 587.33, 783.99] : [392, 493.88, 587.33];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.18, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain).connect(dest);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.36);
        });
        break;
      }
      case 'gameover': {
        const notes = [293.66, 261.63, 220, 174.61];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.11);
          gain.gain.setValueAtTime(0.14, now + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.3);
          osc.connect(gain).connect(dest);
          osc.start(now + idx * 0.11);
          osc.stop(now + idx * 0.11 + 0.31);
        });
        break;
      }
    }
  }
}

export const gameAudio = new GameAudioEngine();
