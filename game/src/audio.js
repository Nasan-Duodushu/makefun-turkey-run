// Featherweight Fugitive — tiny WebAudio synth. No audio files: every sound is
// a few oscillators, so the game stays offline and self-contained.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, seconds, type, gain, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  gobble() {
    // Three quick descending clucks.
    this.tone(320, 0.09, 'square', 0.05, 0, 210);
    this.tone(300, 0.09, 'square', 0.05, 0.1, 190);
    this.tone(280, 0.12, 'square', 0.05, 0.2, 170);
  }

  pickup() {
    this.tone(660, 0.08, 'sine', 0.06, 0, 880);
    this.tone(880, 0.1, 'sine', 0.05, 0.07, 1180);
  }

  alarm() {
    this.tone(520, 0.16, 'sawtooth', 0.05, 0, 700);
    this.tone(700, 0.16, 'sawtooth', 0.05, 0.16, 520);
  }

  thud() {
    this.tone(140, 0.18, 'triangle', 0.09, 0, 60);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.22, 'triangle', 0.06, i * 0.11));
  }

  lose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => this.tone(n, 0.26, 'triangle', 0.06, i * 0.13));
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
