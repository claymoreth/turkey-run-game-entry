// WebAudio synth only — no audio files. Master gain 0.5 + SFX bus.
// AudioContext is created/resumed only on the first user gesture.

function jitter(base) {
  return base * (1 + (Math.random() * 2 - 1) * 0.05);
}

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    sfx: null,
    muted: false,
    _noiseBuf: null,
  };

  audio.ensure = () => {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.sfx = audio.ctx.createGain();
      audio.sfx.gain.value = 1;
      audio.sfx.connect(audio.master);
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return true;
  };

  audio.setMuted = (m) => {
    audio.muted = m;
    if (audio.master && audio.ctx) {
      audio.master.gain.setTargetAtTime(m ? 0 : 0.5, audio.ctx.currentTime, 0.02);
    }
  };

  function tone(opts) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + (opts.delay || 0);
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(jitter(opts.freq || 440), t0);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(jitter(opts.slideTo), t0 + (opts.dur || 0.15));
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.15));
    osc.connect(g);
    g.connect(audio.sfx);
    osc.start(t0);
    osc.stop(t0 + (opts.dur || 0.15) + 0.05);
  }

  function noise(opts) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.5;
    if (!audio._noiseBuf) {
      const len = Math.floor(audio.ctx.sampleRate * 1);
      audio._noiseBuf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const d = audio._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = audio.ctx.createBufferSource();
    src.buffer = audio._noiseBuf;
    src.loop = true;
    const filt = audio.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = opts.freq || 4000;
    filt.Q.value = 0.8;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.12, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(audio.sfx);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // Named SFX.
  audio.gobble = () => {
    tone({ type: 'square', freq: 320, slideTo: 180, dur: 0.12, vol: 0.2 });
    tone({ type: 'square', freq: 280, slideTo: 150, dur: 0.14, vol: 0.2, delay: 0.13 });
  };
  audio.jump = () => tone({ type: 'sine', freq: 300, slideTo: 720, dur: 0.16, vol: 0.25 });
  audio.corn = () => tone({ type: 'sine', freq: 880, slideTo: 1320, dur: 0.09, vol: 0.2 });
  audio.feather = () => {
    tone({ type: 'sine', freq: 1046, dur: 0.12, vol: 0.2 });
    tone({ type: 'sine', freq: 1568, dur: 0.18, vol: 0.2, delay: 0.1 });
  };
  audio.alarm = () => {
    tone({ type: 'square', freq: 660, dur: 0.09, vol: 0.12 });
    tone({ type: 'square', freq: 520, dur: 0.09, vol: 0.12, delay: 0.11 });
  };
  audio.caught = () => {
    tone({ type: 'triangle', freq: 392, dur: 0.25, vol: 0.25 });
    tone({ type: 'triangle', freq: 370, dur: 0.25, vol: 0.25, delay: 0.24 });
    tone({ type: 'triangle', freq: 311, dur: 0.45, vol: 0.25, delay: 0.48 });
  };
  audio.win = () => {
    [523, 659, 784, 1046].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, dur: 0.22, vol: 0.22, delay: i * 0.12 });
    });
  };
  audio.hiss = () => noise({ freq: 4500, dur: 0.5, vol: 0.1 });
  audio.thud = () => tone({ type: 'sine', freq: 140, slideTo: 70, dur: 0.1, vol: 0.3 });
  audio.stumble = () => {
    tone({ type: 'sawtooth', freq: 220, slideTo: 90, dur: 0.25, vol: 0.15 });
    noise({ freq: 900, dur: 0.15, vol: 0.08 });
  };
  audio.boost = () => tone({ type: 'sine', freq: 520, slideTo: 1240, dur: 0.25, vol: 0.2 });

  return audio;
}
