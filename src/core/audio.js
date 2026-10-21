import { settings, onSetting } from './store.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;

export function audio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().then(() => { if (music.wanted) music.start(); }).catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { return null; }
  master = ctx.createGain();
  master.gain.value = settings.volume;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
  const len = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

onSetting((k, v) => {
  if (k === 'volume' && master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  if (k === 'music') { if (v) music.resumeWanted(); else music.stop(); }
});

const unlock = () => {
  const c = audio();
  if (c && c.state === 'running' && music.wanted) music.start();
};
['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function tone(freq, dur, o = {}) {
  if (!ctx || !settings.sfx) return;
  voice(freq, dur, o);
}

function voice(freq, dur, o = {}) {
  if (!ctx) return;
  const { type = 'square', vol = 0.16, slide = 0, delay = 0, attack = 0.004, bus = sfxBus } = o;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(bus);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

export function noise(dur, o = {}) {
  if (!ctx || !settings.sfx) return;
  const { vol = 0.2, delay = 0, freq = 1800, type = 'lowpass', q = 0.8, slide = 0 } = o;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(sfxBus);
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
}

function arp(notes, step, o = {}) { notes.forEach((m, i) => tone(midi(m), step * 1.2, { ...o, delay: (o.delay || 0) + i * step })); }

const S = {
  nav: () => tone(880, 0.035, { vol: 0.07 }),
  select: () => { tone(660, 0.05, { vol: 0.12 }); tone(990, 0.06, { vol: 0.1, delay: 0.045 }); },
  back: () => { tone(587, 0.05, { vol: 0.1 }); tone(392, 0.08, { vol: 0.1, delay: 0.05 }); },
  start: () => arp([60, 64, 67, 72, 76], 0.055, { vol: 0.13 }),
  error: () => tone(140, 0.16, { vol: 0.14, type: 'sawtooth' }),
  move: () => { tone(330, 0.05, { vol: 0.12, type: 'triangle' }); noise(0.04, { vol: 0.05, freq: 3000, type: 'highpass' }); },
  place: () => { noise(0.07, { vol: 0.16, freq: 900 }); tone(196, 0.06, { vol: 0.1, type: 'triangle' }); },
  capture: () => { noise(0.14, { vol: 0.22, freq: 1400, slide: -1000 }); tone(220, 0.12, { vol: 0.12, slide: -120 }); },
  check: () => { tone(988, 0.08, { vol: 0.12 }); tone(740, 0.12, { vol: 0.12, delay: 0.09 }); },
  win: () => arp([60, 64, 67, 72, 67, 72, 76, 79, 84], 0.08, { vol: 0.13 }),
  lose: () => arp([67, 63, 60, 55, 51], 0.13, { vol: 0.12, type: 'triangle' }),
  draw: () => arp([64, 62, 64, 60], 0.1, { vol: 0.11, type: 'triangle' }),
  eat: () => { tone(523, 0.05, { vol: 0.13 }); tone(784, 0.06, { vol: 0.12, delay: 0.04 }); },
  bonus: () => arp([72, 76, 79, 84, 88], 0.04, { vol: 0.11 }),
  die: () => { tone(400, 0.5, { vol: 0.14, type: 'sawtooth', slide: -330 }); noise(0.4, { vol: 0.12, freq: 1200, slide: -1000 }); },
  bounce: () => tone(440, 0.035, { vol: 0.1 }),
  wall: () => tone(220, 0.035, { vol: 0.09 }),
  brick: () => { tone(660 + Math.random() * 220, 0.05, { vol: 0.11 }); noise(0.05, { vol: 0.05, freq: 4000, type: 'highpass' }); },
  metal: () => tone(1240, 0.06, { vol: 0.08, type: 'triangle' }),
  power: () => arp([64, 68, 71, 76, 80, 83], 0.035, { vol: 0.11 }),
  flip: () => noise(0.05, { vol: 0.14, freq: 2600, type: 'bandpass', q: 2 }),
  match: () => arp([72, 79], 0.07, { vol: 0.12 }),
  miss: () => tone(196, 0.12, { vol: 0.1, type: 'triangle', slide: -40 }),
  flag: () => { tone(880, 0.04, { vol: 0.09 }); tone(1320, 0.05, { vol: 0.08, delay: 0.04 }); },
  reveal: () => tone(1200, 0.025, { vol: 0.05, type: 'triangle' }),
  boom: () => { noise(0.9, { vol: 0.32, freq: 900, slide: -820 }); tone(90, 0.6, { vol: 0.2, slide: -50, type: 'triangle' }); },
  splash: () => noise(0.3, { vol: 0.16, freq: 3000, slide: -2400, type: 'bandpass', q: 1.2 }),
  hit: () => { noise(0.45, { vol: 0.28, freq: 1600, slide: -1400 }); tone(150, 0.3, { vol: 0.16, slide: -80, type: 'sawtooth' }); },
  sink: () => { noise(1.1, { vol: 0.26, freq: 700, slide: -600 }); arp([55, 52, 48, 43], 0.15, { vol: 0.12, type: 'triangle', delay: 0.2 }); },
  shoot: () => { tone(1400, 0.15, { vol: 0.08, slide: -1100 }); },
  dice: () => { for (let i = 0; i < 6; i++) noise(0.03, { vol: 0.16, freq: 2500 + Math.random() * 1500, type: 'bandpass', q: 3, delay: i * 0.055 + Math.random() * 0.02 }); },
  bit: (() => { let alt = 0; return () => { alt ^= 1; tone(alt ? 520 : 660, 0.04, { vol: 0.07 }); }; })(),
  emp: () => { tone(200, 0.4, { vol: 0.14, slide: 1600, type: 'sawtooth' }); noise(0.3, { vol: 0.08, freq: 6000, type: 'highpass' }); },
  teleport: () => tone(300, 0.25, { vol: 0.1, slide: 1500, type: 'triangle' }),
  tick: () => tone(1500, 0.02, { vol: 0.05 }),
  level: () => arp([60, 67, 72, 76, 79, 84], 0.07, { vol: 0.12 }),
};

export function sfx(name) {
  const f = S[name];
  if (!f || !settings.sfx) return;
  audio();
  if (ctx) f();
}

const BPM = 112;
const SIXTEENTH = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [45, 41, 36, 43];
const MEL = [
  76, 74, 72, 74, 76, null, 76, null,
  77, 76, 74, 72, 74, null, 69, null,
  79, 76, 72, 76, 79, null, 81, null,
  79, 77, 76, 74, 71, null, 74, null,
];

export const music = {
  wanted: false,
  playing: false,
  step: 0,
  next: 0,
  timer: 0,
  resumeWanted() { if (this.wanted) this.start(); },
  want(on) { this.wanted = on; if (on) this.start(); else this.stop(); },
  start() {
    if (!settings.music || this.playing || !this.wanted) return;
    if (!ctx || ctx.state !== 'running') return;
    this.playing = true;
    this.step = 0;
    this.next = ctx.currentTime + 0.03;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.32, ctx.currentTime);
    this.timer = setInterval(() => this.schedule(), 40);
    this.schedule();
  },
  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    if (ctx) { musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); setTimeout(() => { if (!this.playing && musicBus) musicBus.gain.value = 0.32; }, 400); }
  },
  schedule() {
    if (!ctx) return;
    while (this.next < ctx.currentTime + 0.2) {
      const s = this.step % 64;
      const bar = Math.floor(s / 16);
      const t = this.next - ctx.currentTime;
      const ch = CHORDS[bar];
      voice(midi(ch[s % 3] + 12), SIXTEENTH * 0.9, { vol: 0.035, delay: t, bus: musicBus, type: 'square' });
      if (s % 2 === 0) voice(midi(BASS[bar] + ((s % 8) === 4 ? 12 : 0)), SIXTEENTH * 1.7, { vol: 0.14, delay: t, bus: musicBus, type: 'triangle' });
      if (s % 2 === 0) {
        const m = MEL[bar * 8 + (s % 16) / 2];
        if (m) voice(midi(m), SIXTEENTH * 1.8, { vol: 0.055, delay: t, bus: musicBus, type: 'square' });
      }
      if (s % 4 === 2) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        const g = ctx.createGain(); const t0 = this.next;
        g.gain.setValueAtTime(0.035, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
        src.connect(f); f.connect(g); g.connect(musicBus); src.start(t0, Math.random() * 0.5); src.stop(t0 + 0.05);
      }
      this.next += SIXTEENTH;
      this.step++;
    }
  },
};

