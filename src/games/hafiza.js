import { h, css, shuffle, fmtTime } from '../core/dom.js';
import { memoIcon, MEMO_NAMES } from '../core/gfx.js';
import { createMind, knownPair, pickFirst, pickSecond } from './hafiza-ai.js';

const SIZES = { kolay: [4, 4], orta: [6, 4], zor: [6, 6] };
const COLORS = ['#7dff6a', '#ff4fa3'];

css('hafiza', `
.mc-grid { display: grid; gap: var(--gap); justify-content: center; align-content: center; }
.mc { position: relative; width: var(--cw); height: var(--ch); padding: 0; border: 0; background: none; cursor: pointer; perspective: 600px; }
.mc:focus-visible { outline: 4px solid var(--cyan); outline-offset: 3px; }
.mc-in { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .24s steps(5); }
.mc.open .mc-in { transform: rotateY(180deg); }
.mc-back, .mc-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: grid; place-items: center; }
.mc-back {
  background:
    radial-gradient(circle at 50% 50%, #ff4fa3 0 2px, transparent 3px) 0 0 / 14px 14px,
    conic-gradient(from 45deg, #3b2a86 0 25%, #4a36a3 0 50%, #3b2a86 0 75%, #4a36a3 0) 0 0 / 14px 14px;
  box-shadow: inset 0 0 0 4px #140f2a, inset 0 0 0 8px #f3ead7, inset 0 0 0 10px #140f2a;
}
.mc-back::after { content: "?"; font: 700 36px/1 var(--font); color: #f3ead7; text-shadow: 3px 3px 0 #140f2a; }
.mc:hover:not(.open) .mc-back { filter: brightness(1.18); }
.mc-face { transform: rotateY(180deg); background: #f3ead7; box-shadow: inset 0 0 0 4px #140f2a; }
.mc-face canvas { width: 62%; height: auto; image-rendering: pixelated; }
.mc.matched .mc-face { box-shadow: inset 0 0 0 4px #140f2a, inset 0 0 0 8px var(--mc, #7dff6a); }
.mc.matched.done .mc-face { filter: saturate(.75) brightness(.92); }
`);

export function mount(stage, opts, api) {
  const [c0, r0] = SIZES[opts.boyut] || SIZES.orta;
  const mode = opts.mod;
  const pairs = (c0 * r0) / 2;
  const names = shuffle(MEMO_NAMES.slice()).slice(0, pairs);
  const deck = shuffle([...names, ...names]).map((name) => ({ name, open: false, matched: false, by: -1 }));
  const grid = h('div', { class: 'mc-grid' });
  stage.append(grid);
  const els = deck.map((c, i) => {
    const b = h('button', { class: 'mc', 'aria-label': 'Kapalı kart' },
      h('span', { class: 'mc-in' }, h('span', { class: 'mc-back' }), h('span', { class: 'mc-face' }, copy(memoIcon(c.name, 4)))));
    b.addEventListener('click', () => humanFlip(i));
    grid.append(b);
    return b;
  });

  let first = -1, lock = false, turn = 0, moves = 0, over = false;
  const scores = [0, 0];
  const mind = mode === 'ai' ? createMind(opts.zorluk) : null;
  const timers = new Set();
  const t0 = performance.now();
  let timerInt = 0;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

  function layout() {
    const sw = stage.clientWidth - 32, sh = stage.clientHeight - 24;
    let cols = c0, rows = r0;
    if (sh > sw * 1.15 && cols > rows) { cols = r0; rows = c0; }
    const gap = Math.max(6, Math.min(14, Math.floor(Math.min(sw, sh) / 60)));
    const cw = Math.floor(Math.min((sw - gap * (cols - 1)) / cols, ((sh - gap * (rows - 1)) / rows) / 1.2));
    grid.style.setProperty('--gap', gap + 'px');
    grid.style.setProperty('--cw', Math.max(36, cw) + 'px');
    grid.style.setProperty('--ch', Math.max(43, Math.round(cw * 1.2)) + 'px');
    grid.style.gridTemplateColumns = `repeat(${cols}, var(--cw))`;
  }
  const ro = new ResizeObserver(layout);
  ro.observe(stage);
  layout();

  function paint(i) {
    const c = deck[i], b = els[i];
    b.classList.toggle('open', c.open || c.matched);
    b.classList.toggle('matched', c.matched);
    if (c.matched) b.style.setProperty('--mc', mode === 'solo' ? COLORS[0] : COLORS[c.by]);
    b.setAttribute('aria-label', c.open || c.matched ? 'Kart: ' + c.name : 'Kapalı kart');
  }

  function status() {
    if (mode === 'solo') {
      const best = api.best('hamle:' + opts.boyut);
      api.status([['HAMLE', moves, '#ffc845'], ['ÇİFT', scores[0] + '/' + pairs], ['SÜRE', fmtTime((performance.now() - t0) / 1000)], ['REKOR', best == null ? '-' : best]]);
    } else {
      const n1 = mode === 'ai' ? 'SEN' : '1. OYUNCU', n2 = mode === 'ai' ? 'BİLGİSAYAR' : '2. OYUNCU';
      api.status([
        [(turn === 0 && !over ? '▶ ' : '') + n1, scores[0], COLORS[0]],
        [(turn === 1 && !over ? '▶ ' : '') + n2, scores[1], COLORS[1]],
      ]);
    }
  }
  if (mode === 'solo') timerInt = setInterval(() => { if (!over) status(); }, 1000);

  const closedCards = () => deck.reduce((out, c, i) => { if (!c.matched && !c.open) out.push(i); return out; }, []);

  function humanFlip(i) {
    if (lock || over || api.blocked) return;
    if (mode === 'ai' && turn === 1) return;
    const c = deck[i];
    if (c.open || c.matched) return;
    reveal(i);
  }

  function reveal(i) {
    const c = deck[i];
    c.open = true; paint(i);
    api.sfx('flip');
    if (mind) mind.see(i, c.name);
    if (first < 0) { first = i; return; }
    const a = first, b = i;
    first = -1; moves++; lock = true;
    if (deck[a].name === deck[b].name) {
      later(() => {
        deck[a].matched = deck[b].matched = true;
        deck[a].by = deck[b].by = turn;
        if (mind) { mind.forget(a); mind.forget(b); }
        scores[turn]++;
        api.sfx('match');
        paint(a); paint(b);
        lock = false;
        status();
        if (scores[0] + scores[1] === pairs) finish();
        else if (mode === 'ai' && turn === 1) later(aiTurn, 650);
      }, 360);
    } else {
      later(() => {
        api.sfx('miss');
        deck[a].open = deck[b].open = false;
        paint(a); paint(b);
        lock = false;
        if (mode !== 'solo') turn = 1 - turn;
        status();
        if (mode === 'ai' && turn === 1) later(aiTurn, 700);
      }, 900);
    }
    status();
  }

  function aiTurn() {
    if (over || api.blocked) { if (!over) later(aiTurn, 400); return; }
    const known = mind.recall();
    const pair = knownPair(known, closedCards());
    if (pair) {
      reveal(pair[0]); later(() => reveal(pair[1]), 650);
      return;
    }
    const a = pickFirst(known, closedCards());
    reveal(a);
    later(() => reveal(pickSecond(mind.recall(), closedCards(), a, deck[a].name)), 700);
  }

  function finish() {
    over = true;
    status();
    els.forEach((b) => b.classList.add('done'));
    later(() => {
      if (mode === 'solo') {
        const rec = api.submitBest('hamle:' + opts.boyut, moves, true);
        api.sfx('win');
        api.gameOver({ title: 'TEBRİKLER!', cls: 'win', text: rec ? 'Yeni rekor!' : 'Bütün çiftleri buldun.', stats: [['HAMLE', moves], ['SÜRE', fmtTime((performance.now() - t0) / 1000)], ['REKOR', api.best('hamle:' + opts.boyut)]] });
      } else {
        const [a, b] = scores;
        let title, cls = 'win';
        if (a === b) { title = 'BERABERE'; cls = ''; api.sfx('draw'); }
        else if (mode === 'ai') { title = a > b ? 'KAZANDIN!' : 'KAYBETTİN'; cls = a > b ? 'win' : 'lose'; api.sfx(a > b ? 'win' : 'lose'); }
        else { title = (a > b ? '1.' : '2.') + ' OYUNCU KAZANDI'; api.sfx('win'); }
        api.gameOver({ title, cls, stats: [[mode === 'ai' ? 'SEN' : '1. OYUNCU', a], [mode === 'ai' ? 'BİLGİSAYAR' : '2. OYUNCU', b]] });
      }
    }, 700);
  }

  status();
  if (window.__retroDebug) window.__memo = { deck, flip: (i) => humanFlip(i) };
  return {
    destroy() { ro.disconnect(); clearInterval(timerInt); timers.forEach(clearTimeout); grid.remove(); },
  };
}

function copy(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
