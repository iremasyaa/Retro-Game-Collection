import ICONS from './icons.json';

export const PAL = ICONS.palette;
export const CART_COLORS = ICONS.cartColor;
export const CART_ACCENTS = ICONS.cartAccent || {};
const cache = new Map();

export function sprite(rows, palette = PAL, scale = 1, key) {
  const ck = key ? key + '@' + scale : null;
  if (ck && cache.has(ck)) return cache.get(ck);
  const hgt = rows.length, wid = rows[0].length;
  const c = document.createElement('canvas');
  c.width = wid * scale; c.height = hgt * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < hgt; y++) {
    const r = rows[y];
    for (let x = 0; x < wid; x++) {
      const col = palette[r[x]];
      if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); }
    }
  }
  if (ck) cache.set(ck, c);
  return c;
}

export function cartIcon(id, scale = 4) { return sprite(ICONS.cart[id], PAL, scale, 'cart:' + id); }
export function memoIcon(name, scale = 4) { return sprite(ICONS.memo[name], PAL, scale, 'memo:' + name); }
export const MEMO_NAMES = Object.keys(ICONS.memo);

export function pixelCanvas(container, w, h, { fit = 'contain', maxScale = 8, onResize } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.className = 'pix';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  container.appendChild(canvas);
  let scale = 1;
  const resize = () => {
    const cs = getComputedStyle(container);
    const aw = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (aw <= 0 || ah <= 0) return;
    let s = Math.min(aw / w, ah / h, maxScale);
    const k = Math.floor(s);
    if (k >= 1 && k / s >= 0.86) s = k;
    scale = s;
    canvas.style.width = Math.floor(w * s) + 'px';
    canvas.style.height = Math.floor(h * s) + 'px';
    if (onResize) onResize(s);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  return {
    canvas, ctx,
    get scale() { return scale; },
    toLocal(ev) {
      const r = canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (w / r.width), y: (ev.clientY - r.top) * (h / r.height) };
    },
    destroy() { ro.disconnect(); canvas.remove(); },
  };
}

export function text(ctx, str, x, y, { size = 12, color = '#f3ead7', align = 'left', base = 'alphabetic', shadow, bold = false } = {}) {
  ctx.font = (bold ? '700 ' : '400 ') + size + 'px RetroPix, monospace';
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, x + size / 12, y + size / 12); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function loop(update, render, { step = 1 / 60 } = {}) {
  let raf = 0, last = 0, acc = 0, running = false, paused = false;
  const frame = (t) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = t;
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.25) dt = 0.25;
    if (!paused) {
      acc += dt;
      while (acc >= step) { update(step); acc -= step; }
    }
    render(dt, paused);
  };
  return {
    start() { if (running) return; running = true; last = 0; acc = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    set paused(v) { paused = v; last = 0; },
    get paused() { return paused; },
  };
}

export function particles() {
  const list = [];
  return {
    burst(x, y, color, n = 10, speed = 60, life = 0.6, size = 2) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
        list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, size });
      }
    },
    update(dt, gravity = 0) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        p.vy += gravity * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    },
    draw(ctx) {
      for (const p of list) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
    clear() { list.length = 0; },
    get count() { return list.length; },
  };
}

export function swipe(el, onDir) {
  let sx = 0, sy = 0, active = false;
  const down = (e) => { if (e.pointerType === 'mouse') return; active = true; sx = e.clientX; sy = e.clientY; };
  const move = (e) => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    active = false;
    if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? 'R' : 'L'); else onDir(dy > 0 ? 'D' : 'U');
  };
  const up = () => { active = false; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
  };
}

export const isTouch = () => (typeof window !== 'undefined') && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
