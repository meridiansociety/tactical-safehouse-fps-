export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
  }

  unlock() {
    if (this.enabled) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
      this.enabled = true;
    } catch (err) {
      console.warn("WebAudio unavailable.", err);
    }
  }

  now() {
    return this.ctx.currentTime;
  }

  createGain(value = 0.1) {
    const gain = this.ctx.createGain();
    gain.gain.value = value;
    gain.connect(this.masterGain);
    return gain;
  }

  createOsc(type = "square", freq = 440) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    return osc;
  }

  createFilter(type = "lowpass", frequency = 1200, q = 1) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  envelope(gainNode, startTime, attack, decay, sustain = 0.0001, peak = 0.1) {
    gainNode.gain.cancelScheduledValues(startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, sustain),
      startTime + attack + decay
    );
  }

  playNoise(duration = 0.1, volume = 0.06, filterFreq = 900, type = "lowpass") {
    if (!this.enabled || !this.ctx) return;

    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.createFilter(type, filterFreq, 0.7);
    const gain = this.createGain(volume);

    source.connect(filter);
    filter.connect(gain);

    const t = this.now();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.start(t);
    source.stop(t + duration + 0.02);
  }

  tone(freq, {
    type = "square",
    duration = 0.08,
    volume = 0.03,
    attack = 0.002,
    decay = 0.08,
    endFreq = null,
    filter = null
  } = {}) {
    if (!this.enabled || !this.ctx) return;

    const osc = this.createOsc(type, freq);
    const gain = this.createGain(0.0001);
    let output = gain;

    if (filter) {
      const f = this.createFilter(filter.type, filter.frequency, filter.q ?? 1);
      osc.connect(f);
      f.connect(gain);
    } else {
      osc.connect(gain);
    }

    const t = this.now();
    this.envelope(gain, t, attack, decay, 0.0001, volume);

    if (endFreq !== null) {
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        t + duration
      );
    }

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  dualTone(f1, f2, opts1 = {}, opts2 = {}) {
    this.tone(f1, opts1);
    this.tone(f2, opts2);
  }

  playRifle() {
    if (!this.enabled) return;

    this.tone(180, {
      type: "sawtooth",
      duration: 0.05,
      volume: 0.05,
      attack: 0.001,
      decay: 0.045,
      endFreq: 90,
      filter: { type: "lowpass", frequency: 1500, q: 0.8 }
    });

    this.tone(520, {
      type: "square",
      duration: 0.024,
      volume: 0.02,
      attack: 0.001,
      decay: 0.02,
      endFreq: 260,
      filter: { type: "bandpass", frequency: 1400, q: 0.9 }
    });

    this.playNoise(0.04, 0.03, 1900, "lowpass");
  }

  playPistol() {
    if (!this.enabled) return;

    this.tone(240, {
      type: "square",
      duration: 0.045,
      volume: 0.038,
      attack: 0.001,
      decay: 0.035,
      endFreq: 120,
      filter: { type: "lowpass", frequency: 1700, q: 0.8 }
    });

    this.tone(620, {
      type: "triangle",
      duration: 0.02,
      volume: 0.012,
      attack: 0.001,
      decay: 0.018,
      endFreq: 340,
      filter: { type: "bandpass", frequency: 1500, q: 1.2 }
    });

    this.playNoise(0.025, 0.02, 1800, "lowpass");
  }

  playReload() {
    if (!this.enabled) return;

    this.tone(950, {
      type: "triangle",
      duration: 0.025,
      volume: 0.012,
      attack: 0.001,
      decay: 0.02,
      endFreq: 700,
      filter: { type: "highpass", frequency: 600, q: 0.8 }
    });

    setTimeout(() => {
      this.tone(620, {
        type: "triangle",
        duration: 0.035,
        volume: 0.014,
        attack: 0.001,
        decay: 0.03,
        endFreq: 420,
        filter: { type: "bandpass", frequency: 900, q: 1.1 }
      });
    }, 90);

    setTimeout(() => {
      this.tone(780, {
        type: "square",
        duration: 0.022,
        volume: 0.01,
        attack: 0.001,
        decay: 0.018,
        endFreq: 560,
        filter: { type: "highpass", frequency: 700, q: 0.7 }
      });
    }, 190);
  }

  playHit() {
    if (!this.enabled) return;

    this.tone(1250, {
      type: "square",
      duration: 0.026,
      volume: 0.012,
      attack: 0.001,
      decay: 0.02,
      endFreq: 920,
      filter: { type: "bandpass", frequency: 1800, q: 1.5 }
    });
  }

  playEnemyAlert() {
    if (!this.enabled) return;

    this.tone(540, {
      type: "triangle",
      duration: 0.07,
      volume: 0.016,
      attack: 0.002,
      decay: 0.06,
      endFreq: 500,
      filter: { type: "bandpass", frequency: 1000, q: 0.9 }
    });

    setTimeout(() => {
      this.tone(690, {
        type: "triangle",
        duration: 0.05,
        volume: 0.014,
        attack: 0.002,
        decay: 0.045,
        endFreq: 640,
        filter: { type: "bandpass", frequency: 1200, q: 1.0 }
      });
    }, 80);
  }

  playBombPlant() {
    if (!this.enabled) return;

    this.tone(420, {
      type: "sawtooth",
      duration: 0.09,
      volume: 0.02,
      attack: 0.003,
      decay: 0.08,
      endFreq: 520,
      filter: { type: "lowpass", frequency: 1400, q: 0.8 }
    });

    setTimeout(() => {
      this.tone(620, {
        type: "sawtooth",
        duration: 0.1,
        volume: 0.024,
        attack: 0.003,
        decay: 0.09,
        endFreq: 760,
        filter: { type: "lowpass", frequency: 1500, q: 0.8 }
      });
    }, 120);

    setTimeout(() => {
      this.tone(900, {
        type: "square",
        duration: 0.04,
        volume: 0.01,
        attack: 0.001,
        decay: 0.03,
        endFreq: 860,
        filter: { type: "bandpass", frequency: 1800, q: 1.2 }
      });
    }, 240);
  }

  playBombBeep() {
    if (!this.enabled) return;

    this.tone(980, {
      type: "square",
      duration: 0.04,
      volume: 0.014,
      attack: 0.001,
      decay: 0.035,
      endFreq: 900,
      filter: { type: "bandpass", frequency: 1900, q: 1.4 }
    });

    this.tone(490, {
      type: "triangle",
      duration: 0.05,
      volume: 0.006,
      attack: 0.001,
      decay: 0.045,
      endFreq: 460,
      filter: { type: "lowpass", frequency: 1100, q: 0.8 }
    });
  }

  playDefuse() {
    if (!this.enabled) return;

    this.tone(320, {
      type: "triangle",
      duration: 0.06,
      volume: 0.018,
      attack: 0.002,
      decay: 0.05,
      endFreq: 300,
      filter: { type: "bandpass", frequency: 900, q: 0.9 }
    });

    setTimeout(() => {
      this.tone(440, {
        type: "triangle",
        duration: 0.04,
        volume: 0.01,
        attack: 0.001,
        decay: 0.035,
        endFreq: 410,
        filter: { type: "bandpass", frequency: 1200, q: 1.0 }
      });
    }, 50);
  }

  playDamage() {
    if (!this.enabled) return;

    this.playNoise(0.07, 0.03, 850, "lowpass");
    this.tone(150, {
      type: "sawtooth",
      duration: 0.08,
      volume: 0.01,
      attack: 0.001,
      decay: 0.07,
      endFreq: 90,
      filter: { type: "lowpass", frequency: 700, q: 0.8 }
    });
  }

  playLowAmmo() {
    if (!this.enabled) return;

    this.tone(760, {
      type: "square",
      duration: 0.03,
      volume: 0.009,
      attack: 0.001,
      decay: 0.025,
      endFreq: 700,
      filter: { type: "bandpass", frequency: 1500, q: 1.3 }
    });
  }

  playDryFire() {
    if (!this.enabled) return;

    this.tone(420, {
      type: "square",
      duration: 0.016,
      volume: 0.007,
      attack: 0.001,
      decay: 0.014,
      endFreq: 360,
      filter: { type: "highpass", frequency: 1200, q: 1.0 }
    });
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;

    const t = this.now();

    // Low boom
    this.tone(70, {
      type: "sawtooth",
      duration: 0.42,
      volume: 0.09,
      attack: 0.003,
      decay: 0.38,
      endFreq: 32,
      filter: { type: "lowpass", frequency: 220, q: 0.7 }
    });

    // Mid crack
    this.tone(180, {
      type: "square",
      duration: 0.18,
      volume: 0.035,
      attack: 0.001,
      decay: 0.16,
      endFreq: 90,
      filter: { type: "bandpass", frequency: 700, q: 0.8 }
    });

    // Noise burst
    this.playNoise(0.42, 0.11, 650, "lowpass");

    setTimeout(() => {
      this.playNoise(0.25, 0.045, 1200, "bandpass");
    }, 60);

    setTimeout(() => {
      this.playNoise(0.18, 0.03, 1800, "highpass");
    }, 110);
  }
}
