export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  unlock() {
    if (this.enabled) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.enabled = true;
    } catch (err) {
      console.warn("WebAudio unavailable.", err);
    }
  }

  beep(freq = 440, duration = 0.06, type = "square", volume = 0.02) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    osc.start(now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration);
  }

  playRifle() {
    this.beep(170, 0.05, "sawtooth", 0.028);
  }

  playPistol() {
    this.beep(250, 0.04, "square", 0.022);
  }

  playReload() {
    this.beep(820, 0.03, "triangle", 0.015);
    setTimeout(() => this.beep(620, 0.04, "triangle", 0.015), 100);
  }

  playHit() {
    this.beep(1200, 0.03, "square", 0.012);
  }

  playEnemyAlert() {
    this.beep(520, 0.08, "triangle", 0.017);
  }

  playBombPlant() {
    this.beep(500, 0.08, "sawtooth", 0.02);
    setTimeout(() => this.beep(700, 0.1, "sawtooth", 0.02), 120);
  }

  playBombBeep() {
    this.beep(900, 0.04, "square", 0.012);
  }

  playDefuse() {
    this.beep(300, 0.06, "triangle", 0.018);
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 450;
    gain.gain.value = 0.1;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }
}
