import { h, css, clear, clamp, rand } from '../core/dom.js';
import { pixelCanvas, isTouch } from '../core/gfx.js';
import { load, save } from '../core/store.js';
import { CATEGORIES, ALPHABET } from './asmaca-words.js';

const LIVES = { kolay: 10, orta: 8, zor: 6 };
const LEN = { kolay: [3, 6], orta: [5, 8], zor: [7, 99] };
const ROWS = ['ERTYUIOPĞÜ', 'ASDFGHJKLŞİ', 'ZCVBNMÖÇ'];
const FOLD = { 'Â': 'A', 'Î': 'İ', 'Û': 'U' };
const PCOL = ['#7dff6a', '#ff4fa3'];
const PNAME = ['1. OYUNCU', '2. OYUNCU'];
const HINTS = ['serbest', ...Object.keys(CATEGORIES)];
const MAX_ENTRY = 20;
const BW = 120, BH = 96;
const CHALK = ['#eef3ea', '#bccbbf'];
const GOLD = ['#ffe58a', '#e0b84a'];

function line(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}
function ring(cx, cy, r) {
  const pts = [];
  let last = '';
  for (let i = 0; i <= 72; i++) {
    const a = -Math.PI / 2 + (i / 72) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    const k = x + ',' + y;
    if (k !== last) { pts.push([x, y]); last = k; }
  }
  return pts;
}
const STAGES = [
  line(12, 82, 56, 82),
  line(22, 81, 22, 10),
  [...line(22, 10, 62, 10), ...line(23, 24, 36, 11)],
  line(60, 12, 60, 20),
  ring(60, 27, 6),
  line(60, 35, 60, 56),
  line(60, 40, 51, 49),
  line(60, 40, 69, 49),
  line(60, 56, 52, 70),
  line(60, 56, 68, 70),
];
const CUT_ROPE = line(60, 12, 60, 15);
const FRAYS = [[59, 17], [62, 17], [60, 18], [61, 19]];
const DEAD_FACE = [[57, 25], [59, 25], [58, 26], [57, 27], [59, 27], [62, 25], [64, 25], [63, 26], [62, 27], [64, 27],
  [58, 31], [59, 30], [60, 30], [61, 30], [62, 30], [63, 31]];
const FREE = [
  line(94, 51, 94, 66),
  ring(94, 44, 5),
  line(94, 55, 85, 49),
  line(94, 55, 103, 49),
  line(94, 66, 89, 80),
  line(94, 66, 99, 80),
];
const FREE_GROUND = line(82, 82, 108, 82);
const HAPPY_FACE = [[92, 43], [97, 43], [92, 46], [97, 46], [93, 47], [94, 47], [95, 47], [96, 47]];
const SPARKS = [[81, 35], [108, 32], [77, 61], [111, 57]];

function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function makeBoard() {
  const c = document.createElement('canvas');
  c.width = BW; c.height = BH;
  const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(x, y, w, hh); };
  rect(0, 0, BW, BH, '#3a2213');
  rect(1, 1, BW - 2, BH - 2, '#8a5a3c');
  for (let y = 1; y < BH - 1; y++) {
    for (let x = 1; x < BW - 1; x++) {
      const r = hash(x * 3 + 7, y * 5 + 3);
      const streak = hash(Math.floor(x / 9), y) < 0.3 || hash(x, Math.floor(y / 9) + 40) < 0.3;
      if (r < (streak ? 0.3 : 0.1)) px(x, y, '#76492d');
      else if (r > 0.96) px(x, y, '#a36d47');
    }
  }
  rect(1, 1, BW - 2, 1, '#b98457');
  rect(1, 1, 1, BH - 2, '#b98457');
  rect(BW - 2, 1, 1, BH - 2, '#5c3820');
  rect(3, 3, BW - 6, 1, '#4a2c18');
  rect(3, 3, 1, 85, '#4a2c18');
  rect(BW - 4, 3, 1, 85, '#9e6b45');
  for (let y = 4; y < 88; y++) {
    for (let x = 4; x < BW - 4; x++) {
      const r = hash(x, y + 1000);
      let col = '#1f3d33';
      if (r < 0.07) col = '#24463a';
      else if (r > 0.965) col = '#1a342b';
      const s1 = ((x - 42) / 32) ** 2 + ((y - 30) / 11) ** 2, s2 = ((x - 90) / 24) ** 2 + ((y - 64) / 9) ** 2;
      if ((s1 < 1 || s2 < 1) && hash(x + 500, y) < 0.3) col = '#294b40';
      if (y >= 84 && hash(x, y + 77) < 0.28) col = '#36574b';
      px(x, y, col);
    }
  }
  rect(1, 88, BW - 2, 3, '#a87650');
  rect(1, 88, BW - 2, 1, '#c99566');
  rect(1, 91, BW - 2, 4, '#6e4429');
  rect(0, 95, BW, 1, '#2a180c');
  for (let x = 2; x < BW - 2; x++) if (hash(x, 9090) < 0.2) px(x, 92, '#5c3820');
  rect(64, 84, 16, 3, '#d49a5e');
  rect(64, 84, 16, 1, '#ebb87f');
  rect(64, 87, 16, 3, '#454a5a');
  rect(64, 87, 16, 1, '#5d6375');
  rect(80, 84, 1, 6, '#2a180c');
  rect(88, 89, 10, 2, '#f4f6ef');
  rect(88, 90, 10, 1, '#c9d2c6');
  rect(102, 89, 5, 2, '#ff9fc8');
  rect(102, 90, 5, 1, '#d9709f');
  return c;
}

const SIZE = (w) => w.replace(/ /g, '').length;
function toLetter(k) {
  if (!k || k.length !== 1) return null;
  let u = k.toLocaleUpperCase('tr-TR');
  u = FOLD[u] || u;
  return ALPHABET.includes(u) ? u : null;
}
const catName = (id) => (id === 'serbest' ? 'SERBEST' : CATEGORIES[id].label);
const SHORT = { serbest: 'SERBEST', hayvan: 'HAYVAN', meyve: 'MEYVE-SEBZE', yiyecek: 'YİYECEK', sehir: 'İL', ulke: 'ÜLKE', meslek: 'MESLEK', esya: 'EŞYA', spor: 'SPOR-OYUN' };

css('asmaca', `
.hm { width: 100%; height: 100%; max-width: 1180px; min-height: 0; box-sizing: border-box; display: grid; justify-self: center; align-self: stretch; }
.hm[data-lay="wide"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "board info" "kbd kbd" "act act"; gap: 14px 36px; }
.hm[data-lay="tall"] { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto auto; grid-template-areas: "board" "info" "kbd" "act"; gap: 10px; }
.hm[data-lay="tall"].setup { grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "info" "kbd" "act"; }
.hm[data-lay="side"] { grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "board info" "board kbd" "act kbd"; gap: 8px 20px; }
.hm[data-lay="side"].setup { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: "info kbd" "act kbd"; }
.hm.setup:not([data-lay="wide"]) .hm-board { display: none; }
.hm[data-lay="side"]:not(.setup) .hm-miss { display: none; }
.hm[data-lay="side"] .hm-catsel > span { display: none; }
.hm[data-lay="tall"] .hm-head { justify-content: center; }
.hm-board { grid-area: board; min-width: 0; min-height: 0; overflow: hidden; display: grid; place-items: center; }
.hm-board canvas { box-shadow: 0 0 0 4px #07051a, 10px 10px 0 4px rgba(0,0,0,.35); }
.hm-info { grid-area: info; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.hm-info::-webkit-scrollbar { display: none; }
.hm-info > :first-child { margin-top: auto; }
.hm-info > :last-child { margin-bottom: auto; }
.hm[data-lay="tall"] .hm-info, .hm[data-lay="side"] .hm-info { gap: 8px; }
.hm-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 18px; }
.hm-cat { color: var(--muted); min-width: 0; }
.hm-cat b { color: var(--cyan); }
.hm-tur { color: var(--muted); }
.hm-tur b { color: var(--amber); }
.hm-pips { display: flex; gap: 3px; color: #3a3266; font-size: 36px; line-height: 1; }
.hm-pips i { font-style: normal; }
.hm-pips i.on { color: var(--red); }
.hm-sub { text-align: center; font-weight: 700; text-wrap: balance; }
.hm-sub:empty { display: none; }
.hm-sub .win { color: var(--lime); }
.hm-sub .lose { color: var(--red); }
.hm-sub .warn { color: var(--amber); }
.hm-word { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-end; row-gap: 14px; column-gap: calc(var(--tw, 40px) * .75); min-height: calc(var(--tw, 40px) * 1.3); }
.hm-grp { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px var(--tg, 8px); }
.hm-t { position: relative; width: var(--tw, 40px); height: calc(var(--tw, 40px) * 1.3); display: grid; place-items: center; }
.hm-t::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--ink); box-shadow: 0 4px 0 #07051a; }
.hm-t b { display: block; font: 700 var(--tfs, 36px)/1 var(--font); color: var(--ink); text-shadow: var(--tsh, 3px) var(--tsh, 3px) 0 #07051a; }
.hm-t.mask b { color: var(--amber); }
.hm-t.lost b { color: var(--red); }
.hm-t.cur::after { background: var(--amber); }
.hm.won .hm-t b { color: var(--lime); }
.hm-ph { color: var(--muted); align-self: center; }
.hm-miss { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px 16px; min-height: 28px; color: var(--muted); text-align: center; }
.hm-miss:empty, .hm-setrow:empty { display: none; }
.hm-setrow { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 14px; }
.hm-miss b { color: var(--red); letter-spacing: 6px; }
.hm-catsel { display: flex; align-items: center; gap: 8px; }
.hm-catsel output { min-width: 11ch; padding: 8px 8px 6px; text-align: center; color: var(--cyan); background: var(--panel); }
.hm-kbd { grid-area: kbd; align-self: center; display: flex; flex-direction: column; align-items: center; gap: var(--kg, 6px); }
.hm-row { display: flex; gap: var(--kg, 6px); }
.hm-k {
  width: var(--kw, 48px); height: var(--kh, 52px); padding: 0 0 4px; border: 0; cursor: pointer;
  font: 700 var(--kfs, 24px)/1 var(--font); color: #1a1433; background: #efe5cf;
  box-shadow: inset 0 -5px 0 #b8a98a, inset 0 0 0 2px #07051a;
}
.hm-k:hover:not(:disabled) { background: #fff7e2; }
.hm-k:active:not(:disabled) { padding-bottom: 0; box-shadow: inset 0 -1px 0 #b8a98a, inset 0 0 0 2px #07051a; }
.hm-k:focus-visible { outline: 4px solid var(--cyan); outline-offset: 2px; position: relative; z-index: 1; }
.hm-k:disabled { cursor: default; }
.hm-k.hit { background: var(--lime); color: #0c2a06; box-shadow: inset 0 -5px 0 #2fb84a, inset 0 0 0 2px #07051a; }
.hm-k.hint { background: var(--cyan); color: #04202a; box-shadow: inset 0 -5px 0 #1f8fb0, inset 0 0 0 2px #07051a; }
.hm-k.miss {
  color: #6f65a8; box-shadow: inset 0 0 0 2px #3d3474;
  background: linear-gradient(to top right, transparent calc(50% - 2px), rgba(255,90,90,.8) calc(50% - 2px) calc(50% + 2px), transparent calc(50% + 2px)), #251f4a;
}
.hm-kbd.done .hm-k:not(.hit):not(.hint):not(.miss) { opacity: .4; }
.hm-actions { grid-area: act; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 16px; min-height: 44px; }
.hm-actions .btn small { color: var(--muted); }
@media (prefers-reduced-motion: no-preference) {
  .hm-t.pop b { animation: hm-pop .3s steps(4) both; }
  .hm-t.lost b { animation: hm-pop .3s steps(4) calc(var(--i, 0) * 60ms) both; }
  .hm.won .hm-t b { animation: hm-wave .5s steps(4) calc(var(--i, 0) * 70ms) 2 both; }
  .hm-t.cur::after { animation: hm-blink 1s steps(1) infinite; }
  .hm-blink { animation: hm-blink 1.2s steps(1) infinite; }
  .hm-board canvas.hm-shake { animation: hm-shake .32s steps(6); }
}
@keyframes hm-pop { from { transform: translateY(40%) scale(.5); opacity: 0; } 60% { transform: translateY(-12%) scale(1.15); opacity: 1; } to { transform: none; opacity: 1; } }
@keyframes hm-wave { 0%, 100% { transform: none; } 50% { transform: translateY(-28%); } }
@keyframes hm-shake { 0%, 100% { transform: none; } 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(2px); } }
@keyframes hm-blink { 50% { opacity: 0; } }
`);

export function mount(stage, opts, api) {
  const mode = opts.mod === '2p' ? '2p' : '1p';
  const maxLives = LIVES[opts.zorluk] || LIVES.orta;
  const pre = 10 - maxLives;
  const bestKey = 'seri:' + (LIVES[opts.zorluk] ? opts.zorluk : 'orta');

  let phase = 'play';
  let word = '', catLabel = '', lives = maxLives, won = false;
  const guessed = new Set(), hinted = new Set();
  let misses = [];
  let streak = 0, lastStreak = 0, newRecord = false;
  const scores = [0, 0];
  let round = 1, setter = 0;
  let entry = [], showEntry = false, peek = -1, peekT = 0, hintCat = 0;
  let anims = [], dust = [], freeEnd = Infinity, raf = 0, maxTile = 56;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  const wrap = h('div', { class: 'hm', 'data-lay': 'wide' });
  const boardBox = h('div', { class: 'hm-board' });
  const info = h('section', { class: 'hm-info', 'aria-label': 'Kelime' });
  const kbd = h('div', { class: 'hm-kbd' });
  const headEl = h('div', { class: 'hm-head' });
  const subEl = h('div', { class: 'hm-sub', 'aria-live': 'polite' });
  const wordEl = h('div', { class: 'hm-word', role: 'img' });
  const missEl = h('div', { class: 'hm-miss' });
  const setRowEl = h('div', { class: 'hm-setrow' });
  const actions = h('div', { class: 'hm-actions' });
  info.append(headEl, subEl, wordEl, missEl, setRowEl);
  const keyEls = {};
  for (const row of ROWS) {
    const r = h('div', { class: 'hm-row' });
    for (const L of row) {
      const b = h('button', { class: 'hm-k', 'aria-label': L + ' harfi', onMousedown: (e) => e.preventDefault(), onClick: () => press(L) }, L);
      keyEls[L] = b;
      r.append(b);
    }
    kbd.append(r);
  }
  wrap.append(boardBox, info, kbd, actions);
  stage.append(wrap);
  layout();
  const pc = pixelCanvas(boardBox, BW, BH, { maxScale: 6 });
  const g = pc.ctx;
  pc.canvas.setAttribute('role', 'img');
  pc.canvas.setAttribute('aria-label', 'Kara tahtada adam asmaca çizimi');
  const slate = makeBoard();
  const ro = new ResizeObserver(() => layout());
  ro.observe(stage);

  function layout() {
    const sw = stage.clientWidth - 32, sh = stage.clientHeight - 24;
    if (sw <= 0 || sh <= 0) return;
    const setup = phase === 'set' || phase === 'pass';
    const lay = sh > sw * 0.9 ? 'tall' : sh < 440 ? 'side' : 'wide';
    if (wrap.dataset.lay !== lay) wrap.dataset.lay = lay;
    wrap.classList.toggle('setup', setup);
    maxTile = lay === 'wide' ? 60 : lay === 'tall' ? Math.min(52, Math.floor(sh * 0.07)) : 34;
    sizeTiles();
    const gap = sw < 480 ? 5 : 6;
    let kbdW, budget;
    if (lay === 'tall') { kbdW = sw; budget = sh * 0.3; }
    else if (lay === 'wide') { kbdW = Math.min(sw, 860); budget = sh * 0.4 - 60; }
    else { kbdW = (sw - 20) * (setup ? 0.52 : 0.6); budget = setup ? sh : sh - info.offsetHeight - 8; }
    let kw = clamp(Math.floor((kbdW - gap * 10) / 11), 22, 62);
    const kh = clamp(Math.min(Math.round(kw * (lay === 'tall' ? 1.45 : 1.2)), Math.floor((budget - gap * 2) / 3)), 30, 62);
    kw = Math.min(kw, Math.round(kh * 1.3));
    wrap.style.setProperty('--kw', kw + 'px');
    wrap.style.setProperty('--kh', kh + 'px');
    wrap.style.setProperty('--kg', gap + 'px');
    wrap.style.setProperty('--kfs', kw >= 54 && kh >= 54 ? '36px' : '24px');
  }

  function sizeTiles() {
    const src = phase === 'set' ? entry.join('') + (entry.length < MAX_ENTRY ? '_' : '') : word;
    const groups = src.split(' ').filter(Boolean);
    const longest = Math.max(5, ...groups.map((w) => w.length));
    const W = info.clientWidth || 320;
    const gap = W < 420 ? 4 : 8;
    const tw = clamp(Math.floor((W + gap) / longest) - gap, 18, Math.max(18, maxTile));
    const fs = tw >= 42 ? 48 : tw >= 28 ? 36 : 24;
    wordEl.style.setProperty('--tw', tw + 'px');
    wordEl.style.setProperty('--tg', gap + 'px');
    wordEl.style.setProperty('--tfs', fs + 'px');
    wordEl.style.setProperty('--tsh', fs / 12 + 'px');
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) { raf = 0; if (render(now)) raf = requestAnimationFrame(frame); }
  function push(pts, { dur = 260, brush = 2, solid = false, pal = CHALK, kind = '', bounce = false, instant = false } = {}) {
    let start = -1;
    if (!instant) {
      start = performance.now();
      for (const a of anims) if (!a.hidden) start = Math.max(start, a.start + a.dur);
    }
    const a = { pts, dur: instant ? 0 : dur, brush, solid, pal, kind, bounce, start, hidden: false };
    anims.push(a);
    kick();
    return a;
  }
  const strokeDur = (pts) => clamp(pts.length * 7, 160, 420);
  function hop(now) {
    if (now < freeEnd) return 0;
    const t = ((now - freeEnd) % 760) / 760;
    return t < 0.36 ? -Math.round(Math.sin((t / 0.36) * Math.PI) * 3) : 0;
  }
  function render(now) {
    g.drawImage(slate, 0, 0);
    g.save();
    g.beginPath(); g.rect(4, 4, BW - 8, 84); g.clip();
    let busy = false;
    const oy = hop(now);
    for (const a of anims) {
      if (a.hidden) continue;
      const p = a.dur <= 0 ? 1 : clamp((now - a.start) / a.dur, 0, 1);
      if (p < 1) busy = true;
      if (p <= 0) continue;
      const n = Math.ceil(a.pts.length * p);
      const dy = a.bounce ? oy : 0;
      for (let i = 0; i < n; i++) {
        const [x, y] = a.pts[i];
        for (let by = 0; by < a.brush; by++) {
          for (let bx = 0; bx < a.brush; bx++) {
            const r = hash(x + bx, y + by);
            if (!a.solid && r < 0.06) continue;
            g.fillStyle = !a.solid && r < 0.3 ? a.pal[1] : a.pal[0];
            g.fillRect(x + bx, y + by + dy, 1, 1);
          }
        }
      }
    }
    if (dust.length) {
      dust = dust.filter((d) => now - d.t0 < d.life);
      for (const d of dust) {
        if (now < d.t0) continue;
        const t = (now - d.t0) / 1000;
        g.fillStyle = (now - d.t0) / d.life < 0.55 ? '#dfe8e0' : '#6f8c7e';
        g.fillRect(Math.round(d.x + d.vx * t), Math.round(d.y + d.vy * t + 40 * t * t), 1, 1);
      }
      busy = true;
    }
    if (phase === 'end' && won) {
      busy = true;
      if (now >= freeEnd) {
        SPARKS.forEach(([x, y], i) => {
          const on = (Math.floor((now - freeEnd) / 240) + i) % 2 === 0;
          g.fillStyle = on ? GOLD[0] : GOLD[1];
          g.fillRect(x, y, 1, 1);
          if (on) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.fillStyle = GOLD[1]; g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.fillRect(x, y - 2, 1, 1); g.fillRect(x, y + 2, 1, 1); }
        });
      }
    }
    g.restore();
    return busy;
  }
  function puff(x, y, n) {
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 10 + Math.random() * 26;
      dust.push({ x: x + rand(9) - 4, y: y + rand(30) - 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, t0: now + rand(120), life: 420 + Math.random() * 360 });
    }
    kick();
  }
  function resetBoard() {
    anims = []; dust = []; freeEnd = Infinity;
    for (let i = 0; i < pre; i++) push(STAGES[i], { instant: true, kind: 'stage' + (i >= 3 ? ' man' : '') });
    kick();
  }
  function drawStage(i) {
    if (i < 0 || i >= STAGES.length) return;
    push(STAGES[i], { dur: strokeDur(STAGES[i]), kind: 'stage' + (i >= 3 ? ' man' : '') });
  }
  function shake() {
    const c = pc.canvas;
    c.classList.remove('hm-shake');
    void c.offsetWidth;
    c.classList.add('hm-shake');
  }
  function freeMan() {
    const hung = anims.filter((a) => a.kind.includes('man') && !a.hidden);
    const ropeShown = anims.some((a) => a.pts === STAGES[3]);
    let t = performance.now();
    for (const a of anims) if (!a.hidden) t = Math.max(t, a.start + a.dur);
    later(() => {
      if (hung.length) puff(60, 40, 22);
      for (const a of hung) a.hidden = true;
      if (ropeShown) { push(CUT_ROPE, { instant: true }); push(FRAYS, { instant: true, brush: 1 }); }
      push(FREE_GROUND, { dur: 180 });
      for (const pts of FREE) push(pts, { dur: strokeDur(pts) * 0.7, bounce: true });
      const last = push(HAPPY_FACE, { dur: 160, brush: 1, solid: true, bounce: true });
      freeEnd = last.start + last.dur;
      kick();
    }, Math.max(0, t - performance.now()) + 120);
  }

  function pickWord() {
    const ids = CATEGORIES[opts.kategori] ? [opts.kategori] : Object.keys(CATEGORIES);
    const [lo, hi] = LEN[opts.zorluk] || LEN.orta;
    let recent = load('asmaca:recent', []);
    if (!Array.isArray(recent)) recent = [];
    const pools = ids.map((id) => {
      let ws = CATEGORIES[id].words.filter((w) => SIZE(w) >= lo && SIZE(w) <= hi);
      if (ws.length < 6) ws = CATEGORIES[id].words.slice();
      return { id, ws };
    });
    let cands = pools.map((p) => ({ id: p.id, ws: p.ws.filter((w) => !recent.includes(w)) })).filter((p) => p.ws.length);
    if (!cands.length) {
      const all = new Set(pools.flatMap((p) => p.ws));
      recent = recent.filter((w) => !all.has(w));
      cands = pools;
    }
    const p = cands[rand(cands.length)];
    const w = p.ws[rand(p.ws.length)];
    recent.push(w);
    save('asmaca:recent', recent.slice(-300));
    return { word: w, label: CATEGORIES[p.id].label };
  }

  function startRound(w, label) {
    phase = 'play';
    word = w; catLabel = label;
    lives = maxLives; won = false; newRecord = false;
    guessed.clear(); hinted.clear(); misses = [];
    wrap.classList.remove('won');
    kbd.classList.remove('done');
    resetBoard();
    clear(setRowEl);
    buildWordTiles();
    paintHead(); paintSub(); paintMisses(); paintKeys(); paintActions();
    layout();
    status();
  }
  function newWord() { const p = pickWord(); startRound(p.word, p.label); }

  function beginSetup() {
    phase = 'set';
    word = ''; entry = []; showEntry = false; peek = -1; won = false;
    guessed.clear(); hinted.clear(); misses = [];
    wrap.classList.remove('won');
    kbd.classList.remove('done');
    resetBoard();
    paintHead(); paintSub(); paintMisses(); paintEntry(); paintSetRow(); paintKeys(); paintActions();
    layout();
    status();
  }

  function confirmEntry() {
    if (phase !== 'set') return;
    while (entry.length && entry[entry.length - 1] === ' ') entry.pop();
    if (entry.filter((c) => c !== ' ').length < 2) { api.sfx('error'); api.toast('EN AZ 2 HARF YAZ'); paintEntry(); return; }
    const w = entry.join('');
    const label = catName(HINTS[hintCat]);
    const guesser = 1 - setter;
    phase = 'pass';
    showEntry = false; peek = -1;
    paintEntry(); paintSetRow();
    api.sfx('select');
    api.overlay({
      title: 'KELİME HAZIR',
      text: 'Sıra ' + PNAME[guesser].toLowerCase().replace('oyuncu', 'oyuncuda') + '. Ekranı ona ver, hazır olunca başlasın.',
      closable: false,
      buttons: [{ label: 'BAŞLA ▶', primary: true, fn: () => { api.closeOverlay(); startRound(w, label); } }],
    });
  }

  function next() {
    if (phase !== 'end') return;
    if (mode === '1p') newWord();
    else { setter = 1 - setter; round++; beginSetup(); }
  }

  function press(L) {
    if (!L || api.blocked) return;
    if (phase === 'set') addEntry(L);
    else if (phase === 'play') guess(L);
  }
  function addEntry(ch) {
    if (entry.length >= MAX_ENTRY) { api.sfx('error'); api.toast('EN FAZLA ' + MAX_ENTRY + ' KARAKTER'); return; }
    entry.push(ch);
    peek = entry.length - 1;
    clearTimeout(peekT); timers.delete(peekT);
    peekT = later(() => { peek = -1; if (phase === 'set') paintEntry(); }, 650);
    api.sfx('nav');
    paintEntry();
  }
  function addSpace() {
    if (phase !== 'set' || !entry.length || entry[entry.length - 1] === ' ' || entry.length >= MAX_ENTRY - 1) return;
    entry.push(' ');
    api.sfx('nav');
    paintEntry();
  }
  function backspace() {
    if (phase !== 'set' || !entry.length) return;
    entry.pop();
    peek = -1;
    api.sfx('back');
    paintEntry();
  }

  const solved = () => [...word].every((c) => c === ' ' || guessed.has(c));
  function guess(L) {
    if (phase !== 'play') return;
    if (guessed.has(L)) { api.toast(L + ' HARFİNİ DENEDİN', 900); return; }
    guessed.add(L);
    if (word.includes(L)) {
      paintTiles(L);
      if (solved()) { finish(true); return; }
      api.sfx('match');
    } else {
      misses.push(L);
      lives--;
      drawStage(10 - lives - 1);
      shake();
      if (lives <= 0) { finish(false); return; }
      api.sfx('miss');
    }
    paintKeys(); paintMisses(); paintHead(); paintActions(); status();
  }
  function useHint() {
    if (phase !== 'play' || lives <= 1 || api.blocked) return;
    const hidden = [...new Set([...word].filter((c) => c !== ' ' && !guessed.has(c)))];
    if (!hidden.length) return;
    const L = hidden[rand(hidden.length)];
    lives--;
    hinted.add(L); guessed.add(L);
    drawStage(10 - lives - 1);
    paintTiles(L);
    if (solved()) { finish(true); return; }
    api.sfx('bonus');
    paintKeys(); paintHead(); paintActions(); status();
  }

  function finish(win) {
    phase = 'end';
    won = win;
    kbd.classList.add('done');
    if (mode === '1p') {
      if (win) {
        streak++;
        newRecord = api.submitBest(bestKey, streak) && streak >= 2;
      } else { lastStreak = streak; streak = 0; }
    } else scores[win ? 1 - setter : setter]++;
    if (win) {
      wrap.classList.add('won');
      api.sfx('win');
      freeMan();
      if (newRecord) later(() => api.toast('YENİ REKOR!', 1600), 400);
    } else {
      api.sfx('lose');
      push(DEAD_FACE, { dur: 240, brush: 1, solid: true });
    }
    paintTiles();
    paintKeys(); paintHead(); paintSub(); paintMisses(); paintActions(); status();
    layout();
  }

  function onKey(e) {
    if (api.blocked || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key;
    if ((k === 'Enter' || k === ' ') && tag === 'BUTTON') return;
    if (k === 'Enter') {
      if (phase === 'set') { e.preventDefault(); confirmEntry(); }
      else if (phase === 'end') { e.preventDefault(); next(); }
      return;
    }
    if (phase === 'set' && k === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (phase === 'set' && k === ' ') { e.preventDefault(); addSpace(); return; }
    if (e.repeat) return;
    const L = toLetter(k);
    if (L) { e.preventDefault(); press(L); return; }
    if (/^[qwx]$/i.test(k) && (phase === 'set' || phase === 'play')) api.toast(k.toUpperCase() + ' TÜRK ALFABESİNDE YOK', 1000);
  }
  window.addEventListener('keydown', onKey);

  let tileEls = [];
  function buildWordTiles() {
    clear(wordEl);
    tileEls = [];
    let grp = null, n = 0;
    for (const ch of word) {
      if (ch === ' ') { grp = null; tileEls.push(null); continue; }
      if (!grp) { grp = h('div', { class: 'hm-grp' }); wordEl.append(grp); }
      const t = h('span', { class: 'hm-t', style: { '--i': n++ } }, h('b', null, ''));
      grp.append(t);
      tileEls.push(t);
    }
    sizeTiles();
    paintTiles();
  }
  function paintTiles(fresh) {
    const chars = [...word];
    chars.forEach((ch, i) => {
      const t = tileEls[i];
      if (!t) return;
      const b = t.firstChild;
      const shown = guessed.has(ch);
      if (shown || phase === 'end') {
        if (!b.textContent) b.textContent = ch;
        if (!shown) t.classList.add('lost');
        if (fresh && ch === fresh) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      }
    });
    wordEl.setAttribute('aria-label', 'Kelime: ' + chars.map((c) => (c === ' ' ? '/' : guessed.has(c) || phase === 'end' ? c : 'boş')).join(' '));
  }
  function paintEntry() {
    clear(wordEl);
    const groups = [[]];
    entry.forEach((ch, i) => { if (ch === ' ') groups.push([]); else groups[groups.length - 1].push(i); });
    let total = 0;
    groups.forEach((idxs, gi) => {
      const last = gi === groups.length - 1;
      if (!idxs.length && !last) return;
      const grp = h('div', { class: 'hm-grp' });
      for (const i of idxs) {
        const vis = showEntry || i === peek;
        grp.append(h('span', { class: 'hm-t' + (vis ? '' : ' mask') }, h('b', null, vis ? entry[i] : '●')));
        total++;
      }
      if (last && entry.length < MAX_ENTRY && phase === 'set') grp.append(h('span', { class: 'hm-t cur' }, h('b', null, '')));
      wordEl.append(grp);
    });
    if (!entry.length && phase === 'set') wordEl.append(h('span', { class: 'hm-ph' }, isTouch() ? 'HARFLERE DOKUNARAK YAZ' : 'KLAVYEDEN YAZ'));
    wordEl.setAttribute('aria-label', total + ' harf yazıldı');
    sizeTiles();
  }
  function paintHead() {
    clear(headEl);
    if (phase === 'set' || phase === 'pass') {
      headEl.append(
        h('span', { class: 'hm-tur' }, 'TUR ', h('b', null, String(round))),
        h('span', { style: { color: PCOL[setter] } }, PNAME[setter] + ' YAZIYOR'));
      return;
    }
    const pips = h('span', { class: 'hm-pips', role: 'img', 'aria-label': 'Kalan hak ' + lives });
    for (let i = 0; i < maxLives; i++) pips.append(h('i', { class: i < lives ? 'on' : '' }, '♥'));
    headEl.append(h('span', { class: 'hm-cat' }, 'KATEGORİ ', h('b', null, catLabel)), pips);
  }
  function paintSub() {
    clear(subEl);
    if (phase === 'set') {
      subEl.append(h('span', { class: 'warn hm-blink' }, PNAME[1 - setter] + ' BAKMASIN!'));
    } else if (phase === 'play') {
      if (mode === '2p') subEl.append(h('span', { style: { color: PCOL[1 - setter] } }, 'TAHMİN SIRASI: ' + PNAME[1 - setter]));
    } else if (phase === 'end') {
      if (mode === '1p') {
        if (won) subEl.append(h('span', { class: 'win' }, 'BİLDİN!'), '  SERİ ' + streak);
        else subEl.append(h('span', { class: 'lose' }, 'ADAM ASILDI!'), lastStreak > 0 ? '  ' + lastStreak + ' KELİMELİK SERİ BİTTİ' : '');
      } else {
        const gs = 1 - setter;
        if (won) subEl.append(h('span', { style: { color: PCOL[gs] } }, PNAME[gs] + ' BİLDİ!'), '  +1 PUAN');
        else subEl.append(h('span', { class: 'lose' }, 'BULAMADI!'), '  ', h('span', { style: { color: PCOL[setter] } }, PNAME[setter]), ' +1 PUAN');
      }
    }
  }
  function paintMisses() {
    clear(missEl);
    if (phase === 'set' || phase === 'pass') return;
    if (misses.length) missEl.append('YANLIŞ', h('b', null, misses.join('')));
    else missEl.append(phase === 'end' ? 'HİÇ YANLIŞ YAPMADIN' : 'HENÜZ YANLIŞ YOK');
  }
  function paintSetRow() {
    clear(setRowEl);
    const out = h('output', null, SHORT[HINTS[hintCat]]);
    const cyc = (dir) => h('button', {
      class: 'icon-btn', 'aria-label': dir < 0 ? 'Önceki kategori' : 'Sonraki kategori',
      onMousedown: (e) => e.preventDefault(),
      onClick: () => { if (phase !== 'set') return; hintCat = (hintCat + dir + HINTS.length) % HINTS.length; out.textContent = SHORT[HINTS[hintCat]]; api.sfx('nav'); },
    }, dir < 0 ? '◀' : '▶');
    const eye = h('button', {
      class: 'btn small' + (showEntry ? ' on' : ''),
      onMousedown: (e) => e.preventDefault(),
      onClick: () => { if (phase !== 'set') return; showEntry = !showEntry; eye.textContent = showEntry ? 'GİZLE' : 'GÖSTER'; eye.classList.toggle('on', showEntry); api.sfx('nav'); paintEntry(); },
    }, showEntry ? 'GİZLE' : 'GÖSTER');
    setRowEl.append(h('div', { class: 'hm-catsel', role: 'group', 'aria-label': 'Kategori ipucu' }, h('span', null, 'KATEGORİ'), cyc(-1), out, cyc(1)), eye);
  }
  function paintKeys() {
    for (const L in keyEls) {
      const b = keyEls[L];
      const used = phase !== 'set' && phase !== 'pass' && guessed.has(L);
      const hit = used && word.includes(L);
      b.classList.toggle('hint', hinted.has(L) && used);
      b.classList.toggle('hit', hit && !hinted.has(L));
      b.classList.toggle('miss', used && !hit);
      b.disabled = phase === 'set' ? false : used || phase !== 'play';
    }
  }
  function paintActions() {
    clear(actions);
    const btn = (label, fn, cls = '', extra = {}) => h('button', { class: 'btn small ' + cls, onMousedown: (e) => e.preventDefault(), onClick: fn, ...extra }, label);
    if (phase === 'set' || phase === 'pass') {
      actions.append(
        btn('BOŞLUK', () => addSpace()),
        btn('◀ SİL', () => backspace()),
        btn('TAMAM ▶', () => confirmEntry(), 'primary'));
    } else if (phase === 'play') {
      actions.append(btn(h('span', null, 'İPUCU ', h('small', null, '(-1 ♥)')), () => useHint(), '', {
        disabled: lives <= 1, title: lives <= 1 ? 'Son hakkında ipucu alınamaz' : 'Rastgele bir harfi açar, bir hak götürür',
      }));
    } else if (phase === 'end') {
      const nb = h('button', { class: 'btn primary', onClick: () => next() }, mode === '1p' ? 'SONRAKİ KELİME ▶' : 'SONRAKİ TUR ▶');
      actions.append(nb);
      if (!isTouch()) setTimeout(() => { if (nb.isConnected && !api.blocked) nb.focus({ preventScroll: true }); }, 0);
    }
  }
  function status() {
    if (mode === '1p') {
      const best = api.best(bestKey);
      api.status([['SERİ', streak, '#7dff6a'], ['HAK', lives, lives <= 2 ? '#ff5a5a' : '#ffc845'], ['REKOR', best == null ? 0 : best]]);
    } else {
      api.status([[PNAME[0], scores[0], PCOL[0]], [PNAME[1], scores[1], PCOL[1]], ['TUR', round]]);
    }
  }

  if (mode === '1p') newWord();
  else beginSetup();

  const dbg = {
    get word() { return word; }, get phase() { return phase; }, get lives() { return lives; }, get entry() { return entry.join(''); },
    get scores() { return scores.slice(); }, get streak() { return streak; }, get setter() { return setter; },
    press: (ch) => press(toLetter(ch)), hint: () => useHint(), next: () => next(), confirm: () => confirmEntry(),
    type: (s) => { for (const ch of s) { if (ch === ' ') addSpace(); else addEntry(toLetter(ch)); } },
  };
  if (window.__retroDebug) window.__hm = dbg;

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
      pc.destroy();
      wrap.remove();
      if (window.__hm === dbg) delete window.__hm;
    },
  };
}
