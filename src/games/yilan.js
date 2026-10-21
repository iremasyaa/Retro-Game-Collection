import { rand } from '../core/dom.js';
import { pixelCanvas, text, loop, particles, swipe, sprite, memoIcon } from '../core/gfx.js';

const COLS = 30, ROWS = 20, CELL = 16;
const SPEED = { kolay: 0.13, orta: 0.1, zor: 0.077 };
const APPLE = [
  '......L.....',
  '.....L.LL...',
  '...rrLrrr...',
  '..rRrrrrrr..',
  '.rRRrrrrrrr.',
  '.rRrrrrrrrr.',
  '.rrrrrrrrrr.',
  '.rrrrrrrrrd.',
  '..rrrrrrrd..',
  '..rrrrrrdd..',
  '...rr..rd...',
  '............',
];
const KEYS = {
  ArrowUp: ['arrows', 0, -1], ArrowDown: ['arrows', 0, 1], ArrowLeft: ['arrows', -1, 0], ArrowRight: ['arrows', 1, 0],
  KeyW: ['wasd', 0, -1], KeyS: ['wasd', 0, 1], KeyA: ['wasd', -1, 0], KeyD: ['wasd', 1, 0],
};

export function mount(stage, opts, api) {
  const W = COLS * CELL, H = ROWS * CELL;
  const pc = pixelCanvas(stage, W, H);
  const { ctx, canvas } = pc;
  const two = opts.mod === '2p';
  const fx = particles();
  const apple = sprite(APPLE, undefined, 1, 'apple');
  const star = memoIcon('yildiz', 1);
  const base = SPEED[opts.hiz] || SPEED.orta;
  const bestKey = 'skor:' + opts.hiz;
  let state, snakes, food, bonus, stepT, acc, t, eaten, flash, endTimer = 0;

  function makeSnake(x, y, dx, color, light, keys, name) {
    const body = [];
    for (let i = 0; i < 4; i++) body.push({ x: x - dx * i, y });
    return { body, dir: { x: dx, y: 0 }, queue: [], alive: true, score: 0, grow: 0, color, light, keys, name };
  }

  function reset() {
    snakes = two
      ? [makeSnake(6, 6, 1, '#7dff6a', '#d9ffcf', 'wasd', '1. OYUNCU'), makeSnake(23, 13, -1, '#ff4fa3', '#ffd0e6', 'arrows', '2. OYUNCU')]
      : [makeSnake(8, 10, 1, '#7dff6a', '#d9ffcf', 'both', 'SEN')];
    bonus = null; food = null; food = freeCell();
    acc = 0; t = 0; eaten = 0; flash = 0; stepT = base;
    state = 'ready';
    fx.clear();
    updateStatus();
  }

  function occupied(x, y) {
    for (const s of snakes) for (const p of s.body) if (p.x === x && p.y === y) return true;
    return false;
  }
  function freeCell() {
    for (let i = 0; i < 2000; i++) {
      const x = rand(COLS), y = rand(ROWS);
      if (occupied(x, y)) continue;
      if (food && food.x === x && food.y === y) continue;
      if (bonus && bonus.x === x && bonus.y === y) continue;
      return { x, y };
    }
    return null;
  }

  function updateStatus() {
    if (two) {
      api.status([['1.', snakes[0].score, '#7dff6a'], ['2.', snakes[1].score, '#ff4fa3']]);
    } else {
      const best = api.best(bestKey) || 0;
      api.status([['SKOR', snakes[0].score, '#ffc845'], ['REKOR', Math.max(best, snakes[0].score)], ['BOY', snakes[0].body.length]]);
    }
  }

  function step() {
    for (const s of snakes) {
      if (s.queue.length) {
        const d = s.queue.shift();
        if (d.x !== -s.dir.x || d.y !== -s.dir.y) s.dir = d;
      }
    }
    const heads = snakes.map((s) => ({ x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y }));
    const eats = heads.map((hd) => (food && hd.x === food.x && hd.y === food.y ? 'food' : bonus && hd.x === bonus.x && hd.y === bonus.y ? 'bonus' : null));
    const dead = snakes.map((s, i) => {
      const hd = heads[i];
      if (hd.x < 0 || hd.y < 0 || hd.x >= COLS || hd.y >= ROWS) return true;
      for (let j = 0; j < snakes.length; j++) {
        const o = snakes[j];
        const keepsTail = o.grow > 0 || eats[j];
        const n = o.body.length - (keepsTail ? 0 : 1);
        for (let k = 0; k < n; k++) if (o.body[k].x === hd.x && o.body[k].y === hd.y) return true;
        if (j !== i && heads[j].x === hd.x && heads[j].y === hd.y) return true;
      }
      return false;
    });
    if (dead.some(Boolean)) { die(dead); return; }
    snakes.forEach((s, i) => {
      s.body.unshift(heads[i]);
      if (eats[i] === 'food') {
        s.grow += 1; s.score += 10; eaten++;
        api.sfx('eat');
        fx.burst(heads[i].x * CELL + 8, heads[i].y * CELL + 8, '#ff4f6a', 12, 70);
        food = freeCell();
        if (!bonus && eaten % 5 === 0) { const c = freeCell(); if (c) bonus = { ...c, ttl: 6 }; }
        stepT = Math.max(base * 0.55, base * Math.pow(0.985, eaten));
      } else if (eats[i] === 'bonus') {
        s.grow += 3; s.score += 50;
        api.sfx('bonus');
        fx.burst(heads[i].x * CELL + 8, heads[i].y * CELL + 8, '#ffc845', 22, 90);
        bonus = null;
      }
      if (s.grow > 0) s.grow--; else s.body.pop();
    });
    updateStatus();
  }

  function die(dead) {
    state = 'over';
    flash = 0.5;
    api.sfx('die');
    snakes.forEach((s, i) => {
      if (dead[i]) { s.alive = false; for (const p of s.body) fx.burst(p.x * CELL + 8, p.y * CELL + 8, s.color, 2, 50, 0.8); }
    });
    endTimer = setTimeout(() => {
      if (two) {
        const [a, b] = dead;
        const title = a && b ? 'BERABERE' : a ? '2. OYUNCU KAZANDI' : '1. OYUNCU KAZANDI';
        api.gameOver({ title, cls: a && b ? '' : 'win', stats: [['1. OYUNCU', snakes[0].score], ['2. OYUNCU', snakes[1].score]] });
      } else {
        const sc = snakes[0].score;
        const rec = sc > 0 && api.submitBest(bestKey, sc);
        api.gameOver({ title: 'OYUN BİTTİ', cls: 'lose', text: rec ? 'Yeni rekor!' : null, stats: [['SKOR', sc], ['REKOR', api.best(bestKey) || 0]] });
      }
    }, 900);
  }

  function update(dt) {
    t += dt;
    fx.update(dt);
    if (flash > 0) flash -= dt;
    if (state !== 'play') return;
    if (bonus) { bonus.ttl -= dt; if (bonus.ttl <= 0) bonus = null; }
    acc += dt;
    while (acc >= stepT && state === 'play') { acc -= stepT; step(); }
  }

  function render() {
    ctx.fillStyle = '#08130e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0b1b14';
    for (let y = 0; y < ROWS; y++) for (let x = (y & 1); x < COLS; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.strokeStyle = '#2fb84a'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
    if (food) ctx.drawImage(apple, food.x * CELL + 2, food.y * CELL + 2 + (Math.sin(t * 6) > 0.6 ? -1 : 0));
    if (bonus && (bonus.ttl > 2 || Math.floor(t * 8) % 2)) {
      ctx.drawImage(star, bonus.x * CELL + 2, bonus.y * CELL + 2);
      ctx.fillStyle = '#ffc845';
      ctx.fillRect(bonus.x * CELL, bonus.y * CELL + 15, Math.round(16 * bonus.ttl / 6), 1);
    }
    for (const s of snakes) drawSnake(s);
    fx.draw(ctx);
    if (flash > 0) { ctx.fillStyle = 'rgba(255,90,90,' + (flash * 0.5).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(8,19,14,.6)'; ctx.fillRect(0, H / 2 - 44, W, 76);
      text(ctx, 'HAZIR?', W / 2, H / 2 - 10, { size: 24, color: '#ffc845', align: 'center', bold: true, shadow: '#5a1d3c' });
      if (Math.floor(t * 2) % 2 === 0) text(ctx, two ? 'WASD ve ok tuşlarıyla başla' : 'Bir yön tuşuna bas ya da kaydır', W / 2, H / 2 + 18, { size: 12, color: '#f3ead7', align: 'center' });
    }
  }

  function drawSnake(s) {
    const n = s.body.length;
    for (let i = n - 1; i >= 0; i--) {
      const p = s.body[i];
      const x = p.x * CELL, y = p.y * CELL;
      if (!s.alive && Math.floor(t * 10) % 2) continue;
      ctx.fillStyle = i === 0 ? s.light : s.color;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      if (i > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        if (i % 2) ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
        const q = s.body[i - 1];
        ctx.fillStyle = s.color;
        if (q.x !== p.x) ctx.fillRect(Math.min(q.x, p.x) * CELL + CELL - 1, y + 3, 2, CELL - 6);
        if (q.y !== p.y) ctx.fillRect(x + 3, Math.min(q.y, p.y) * CELL + CELL - 1, CELL - 6, 2);
      }
    }
    const hd = s.body[0], d = s.dir;
    const cx = hd.x * CELL + 8, cy = hd.y * CELL + 8;
    const ex = d.y !== 0 ? 4 : 0, ey = d.x !== 0 ? 4 : 0;
    ctx.fillStyle = '#140f2a';
    ctx.fillRect(cx + d.x * 3 - ex - 1, cy + d.y * 3 - ey - 1, 3, 3);
    ctx.fillRect(cx + d.x * 3 + ex - 1, cy + d.y * 3 + ey - 1, 3, 3);
    if (s.alive && Math.floor(t * 3) % 4 === 0) {
      ctx.fillStyle = '#ff4f6a';
      ctx.fillRect(cx + d.x * 9 - (d.y ? 0 : 0), cy + d.y * 9, d.x ? 3 : 1, d.y ? 3 : 1);
    }
  }

  function onKey(e) {
    if (api.blocked) return;
    if (e.code === 'KeyP') { api.pause(); return; }
    const m = KEYS[e.code];
    if (!m) return;
    e.preventDefault();
    if (state === 'over') return;
    for (const s of snakes) {
      if (s.keys === 'both' || s.keys === m[0]) queueDir(s, m[1], m[2]);
    }
    if (state === 'ready') state = 'play';
  }
  function queueDir(s, dx, dy) {
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if ((dx === last.x && dy === last.y) || (dx === -last.x && dy === -last.y)) return;
    if (s.queue.length < 3) s.queue.push({ x: dx, y: dy });
  }
  window.addEventListener('keydown', onKey);
  const unswipe = swipe(canvas, (dir) => {
    if (api.blocked || state === 'over') return;
    const d = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[dir];
    queueDir(snakes[0], d[0], d[1]);
    if (state === 'ready') state = 'play';
  });

  const lp = loop(update, render);
  reset();
  lp.start();

  return {
    wantsAutoPause: true,
    pause() { lp.paused = true; },
    resume() { lp.paused = false; },
    destroy() { lp.stop(); clearTimeout(endTimer); window.removeEventListener('keydown', onKey); unswipe(); pc.destroy(); },
  };
}
