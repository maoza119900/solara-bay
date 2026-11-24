// Solara Bay — sound. One job: synthesised WebAudio effects and engine/siren
// tones. No audio files, no network; everything is oscillators and noise.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.sirenPhase = 0;
  }

  /** Create the context on first user gesture; safe to call in headless shells. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Engine hum: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // Police siren: two-tone triangle, toggled by the game loop.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 750;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  /** Stop all oscillators (e.g. before a fresh game replaces this instance). */
  dispose() {
    try {
      if (this.engineOsc) this.engineOsc.stop();
      if (this.sirenOsc) this.sirenOsc.stop();
      if (this.ctx) this.ctx.close().catch(() => {});
    } catch { /* already stopped */ }
    this.ctx = null;
    this.engineOsc = null;
    this.sirenOsc = null;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.sirenGain) this.sirenGain.gain.value = 0;
    }
  }

  /** Engine pitch/volume from normalised speed 0..1. */
  engine(speedNorm, driving) {
    if (!this.ctx || this.muted || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const target = driving ? 0.045 + speedNorm * 0.05 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speedNorm * 130, t, 0.08);
  }

  /** Siren on/off; call every frame while wanted >= 1. */
  siren(on, dt) {
    if (!this.ctx || !this.sirenOsc) return;
    this.sirenPhase += dt;
    if (on && !this.muted) {
      const hi = Math.floor(this.sirenPhase / 0.45) % 2 === 0;
      this.sirenOsc.frequency.value = hi ? 920 : 660;
      this.sirenGain.gain.value = 0.028;
      this.sirenOn = true;
    } else if (this.sirenOn) {
      this.sirenGain.gain.value = 0;
      this.sirenOn = false;
    }
  }

  blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch { /* audio is best-effort */ }
  }

  noise(dur, vol = 0.2, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.ctx.destination);
      src.start();
    } catch { /* audio is best-effort */ }
  }

  gunshot() { this.noise(0.14, 0.3, 2600); this.blip(160, 0.1, 'square', 0.1); }
  punch() { this.noise(0.08, 0.22, 700); }
  pickup() { this.blip(880, 0.09, 'sine', 0.12); this.blip(1320, 0.14, 'sine', 0.1); }
  click() { this.blip(660, 0.05, 'square', 0.05); }
  crash() { this.noise(0.25, 0.3, 500); }
  bust() { this.blip(220, 0.3, 'sawtooth', 0.12); this.blip(165, 0.45, 'sawtooth', 0.12); }
  jingle() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.22, 'triangle', 0.12), i * 110);
    });
  }
}
