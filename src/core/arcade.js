const PINK = '#ff4fa3', CYAN = '#3ee0ff', VIOLET = '#9b6bff', BLUE = '#5a92ff', WHITE = '#f3ead7';

const THEMES = [
  { body: '#2a1f5c', side: '#3d2f80', dark: '#160f38', trim: PINK, marq: '#ff4fa3', marq2: '#ffb3dc', panel: '#3b2f80' },
  { body: '#182a5c', side: '#24407e', dark: '#0e1838', trim: CYAN, marq: '#3ee0ff', marq2: '#c8f7ff', panel: '#27417f' },
  { body: '#3a1650', side: '#55206e', dark: '#210b30', trim: VIOLET, marq: '#9b6bff', marq2: '#ded0ff', panel: '#5a2a78' },
];

const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const rect = (g, x, y, w, h, c) => { if (w > 0 && h > 0) { g.fillStyle = c; g.fillRect(x, y, w, h); } };
const HALF = 0.11;
const FRONT_MACHINES = false;
const tri = (v, n) => { const p = ((v % 2) + 2) % 2; return Math.round((p < 1 ? p : 2 - p) * n); };
const clampI = (v, a, b) => (v < a ? a : v > b ? b : v);

const GAMES = [
  { glow: CYAN, draw(g, x, y, w, h, t) {
    rect(g, x, y, w, h, '#06102a');
    for (let yy = y; yy < y + h; yy += 2) px(g, x + (w >> 1), yy, '#1f4a8a');
    const ph = Math.max(2, Math.round(h * 0.3));
    const bx = x + 1 + tri(t * 0.9, w - 3), by = y + tri(t * 1.3 + 0.3, h - 1);
    rect(g, x, clampI(by - (ph >> 1), y, y + h - ph), 1, ph, CYAN);
    rect(g, x + w - 1, clampI(y + tri(t * 1.3 + 0.1, h - 1) - (ph >> 1), y, y + h - ph), 1, ph, PINK);
    px(g, bx, by, '#ffffff');
  } },
  { glow: VIOLET, draw(g, x, y, w, h, t, s) {
    rect(g, x, y, w, h, '#0a0420');
    for (let i = 0; i < 7; i++) px(g, x + ((i * 7 + s * 3) % w), y + Math.floor((t * (5 + i * 3) + i * 11) % h), i % 2 ? VIOLET : '#c8f7ff');
    const sx = x + tri(t * 0.5 + s * 0.1, w - 3);
    rect(g, sx, y + h - 2, 3, 1, PINK); px(g, sx + 1, y + h - 3, PINK);
    const k = (t * 2.5) % 1;
    if (k < 0.7) px(g, sx + 1, y + h - 4 - Math.floor(k * Math.max(1, h - 5)), CYAN);
    const n = Math.max(2, Math.floor(w / 5));
    for (let i = 0; i < n; i++) if ((Math.floor(t * 3) + i) % 4) rect(g, x + 1 + i * Math.floor((w - 2) / n) + tri(t * 0.4, 2), y + 1 + (i % 2), 2, 1, BLUE);
  } },
  { glow: PINK, draw(g, x, y, w, h, t, s) {
    rect(g, x, y, w, h, '#120a2e');
    const cols = [PINK, CYAN, VIOLET, BLUE];
    for (let c = 0; c + 1 < w; c += 2) {
      const hh = 2 + ((c * 7 + s * 5) % 3) * 2;
      for (let r = 0; r < hh; r += 2) rect(g, x + c, y + h - 2 - r, 2, 2, cols[(c / 2 + r / 2 + s) % 4]);
    }
    const step = Math.floor(t * 0.7 + s * 0.31);
    const k = (t * 0.7 + s * 0.31) % 1;
    const fx = x + 2 * ((step * 3) % Math.max(1, (w >> 1) - 2));
    const fy = y + Math.floor(k * Math.max(1, h - 9));
    rect(g, fx, fy, 4, 2, cols[step % 4]); rect(g, fx + 2, fy - 2, 2, 2, cols[step % 4]);
  } },
  { glow: CYAN, draw(g, x, y, w, h, t) {
    rect(g, x, y, w, h, '#071433');
    const ix = x + 1, iy = y + 1, iw = Math.max(2, w - 2), ih = Math.max(2, h - 2);
    const per = 2 * (iw - 1) + 2 * (ih - 1);
    const at = (k) => {
      k = ((k % per) + per) % per;
      if (k < iw - 1) return [ix + k, iy];
      k -= iw - 1;
      if (k < ih - 1) return [ix + iw - 1, iy + k];
      k -= ih - 1;
      if (k < iw - 1) return [ix + iw - 1 - k, iy + ih - 1];
      k -= iw - 1;
      return [ix, iy + ih - 1 - k];
    };
    const head = Math.floor(t * 9);
    for (let i = 7; i >= 0; i--) { const [a, b] = at(head - i); px(g, a, b, i ? CYAN : '#ffffff'); }
    if (Math.floor(t * 3) % 2) px(g, x + (w >> 1), y + (h >> 1), PINK);
  } },
  { glow: PINK, draw(g, x, y, w, h, t) {
    const hz = y + Math.max(1, Math.floor(h * 0.35));
    rect(g, x, y, w, hz - y, '#2a1050');
    rect(g, x, hz, w, y + h - hz, '#140c30');
    const cx = x + (w >> 1);
    for (let yy = hz; yy < y + h; yy++) {
      const f = (yy - hz + 1) / (y + h - hz);
      const half = Math.max(1, Math.round(f * w * 0.45));
      rect(g, cx - half, yy, half * 2, 1, '#3a3266');
      const on = Math.floor(3 / f - t * 7) % 2 === 0;
      px(g, cx - half, yy, on ? PINK : WHITE); px(g, cx + half - 1, yy, on ? PINK : WHITE);
      if (on && f > 0.35) px(g, cx, yy, WHITE);
    }
    rect(g, cx - 1 + Math.round(Math.sin(t * 2) * Math.max(1, w * 0.15)), y + h - 2, 3, 2, CYAN);
  } },
  { glow: VIOLET, draw(g, x, y, w, h, t, s) {
    rect(g, x, y, w, h, '#0a0726');
    const cols = [PINK, VIOLET, CYAN];
    for (let r = 0; r < 3; r++) for (let c = 0; c + 1 < w; c += 3) if ((c * 5 + r * 3 + s + Math.floor(t / 3)) % 7) rect(g, x + c, y + 1 + r, 2, 1, cols[r]);
    const bx = x + tri(t * 1.1 + s * 0.2, w - 1), by = y + 5 + tri(t * 1.7, Math.max(1, h - 7));
    px(g, bx, by, '#ffffff');
    rect(g, clampI(bx - 1, x, x + w - 3), y + h - 1, 3, 1, WHITE);
  } },
  { glow: BLUE, draw(g, x, y, w, h, t) {
    rect(g, x, y, w, h, '#08061c');
    const cols = Math.max(2, Math.floor((w - 2) / 3));
    const off = tri(t * 0.6, Math.max(0, w - cols * 3));
    const drop = Math.floor(t * 0.6) % 3;
    const frame = Math.floor(t * 4) % 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      const ex = x + off + c * 3, ey = y + 1 + r * 3 + drop;
      rect(g, ex, ey, 2, 1, r ? CYAN : PINK);
      px(g, ex + frame, ey + 1, r ? CYAN : PINK);
    }
    rect(g, x + tri(t * 0.8, w - 3), y + h - 1, 3, 1, WHITE);
  } },
  { glow: PINK, draw(g, x, y, w, h, t) {
    const cols = [PINK, VIOLET, BLUE, CYAN];
    for (let yy = 0; yy < h; yy++) rect(g, x, y + yy, w, 1, cols[Math.floor(yy / 2 + t * 4) % 4]);
    if (Math.floor(t * 2) % 2) rect(g, x + (w >> 1) - 3, y + (h >> 1) - 1, 6, 2, '#0a0726');
  } },
];

const PLAYER_BODY = [
  '....###....', '...#####...', '...#####...', '...#####...', '....###....',
  '..#######..', '..#######..', '...#####...', '...#####...', '...#####...',
  '...#####...', '...#####...', '...##.##...', '...##.##...', '...##.##...', '...##.##...', '..###.###..',
];

const SIGNS = {
  joy: [[[0.15, 0.74], [0.85, 0.74], [0.85, 0.95], [0.15, 0.95], [0.15, 0.74]], [[0.5, 0.74], [0.6, 0.34]], circle(0.62, 0.24, 0.12, 14)],
  star: [starPath(0.5, 0.53, 0.5, 0.21)],
  bolt: [[[0.58, 0.04], [0.26, 0.56], [0.48, 0.56], [0.36, 0.96], [0.76, 0.42], [0.54, 0.42], [0.66, 0.04], [0.58, 0.04]]],
  heart: [heartPath()],
};
function circle(cx, cy, r, n) { const p = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
function starPath(cx, cy, R, r) { const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p; }
function heartPath() {
  const p = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    p.push([0.5 + x / 36, 0.48 - y / 36]);
  }
  return p;
}
function linePts(x0, y0, x1, y1, out) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.add(x0 + ',' + y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function arcade(canvas) {
  const g = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let W = 0, H = 0, raf = 0, alive = true;
  let bg = null, fg = null, ceilY = 0, floorY = 0, stripY = 0;
  let cabs = [], fronts = [], players = [], lamps = [], signs = [], dust = [];
  const patterns = {}, tiles = {};
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function ditherTile(col) {
    if (!tiles[col]) {
      const c = document.createElement('canvas');
      c.width = c.height = 2;
      const x = c.getContext('2d');
      x.fillStyle = col; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1);
      tiles[col] = c;
    }
    return tiles[col];
  }
  function dither(col) {
    if (!patterns[col]) patterns[col] = g.createPattern(ditherTile(col), 'repeat');
    return patterns[col];
  }

  function makeCab(x, base, w, h, i) {
    const theme = THEMES[i % THEMES.length];
    const game = GAMES[(i * 3 + 1) % GAMES.length];
    const mh = Math.max(3, Math.round(h * 0.13));
    const top = base - h;
    const inset = Math.max(2, Math.round(w * 0.14));
    const scr = { x: x + inset, y: top + mh + Math.max(1, Math.round(h * 0.05)), w: w - inset * 2, h: Math.max(4, Math.round(h * 0.32)) };
    const cpY = scr.y + scr.h + Math.max(1, Math.round(h * 0.05));
    const cph = Math.max(2, Math.round(h * 0.09));
    const u = Math.max(1, Math.round(w / 12));
    const door = { x: x + Math.round(w * 0.32), y: cpY + cph + Math.max(1, Math.round(h * 0.08)), w: Math.max(3, Math.round(w * 0.36)), h: Math.max(3, Math.round(h * 0.15)) };
    return { x, base, w, h, top, mh, scr, cpY, cph, u, door, theme, game, seed: i * 7 + 3, flash: 0 };
  }

  function layout() {
    ceilY = Math.max(5, Math.round(H * 0.08));
    floorY = Math.round(H * 0.64);
    const ch = Math.max(16, Math.round(H * 0.22));
    const cw = Math.max(10, Math.round(ch * 0.58));
    const gap = Math.max(2, Math.round(cw * 0.34));
    stripY = floorY - ch - Math.max(3, Math.round(ch * 0.14));
    const step = cw + gap;
    const n = Math.ceil(W / step) + 2;
    const x0 = Math.round(W / 2 - (n * step - gap) / 2);
    cabs = [];
    for (let i = 0; i < n; i++) cabs.push(makeCab(x0 + i * step, floorY, cw, ch, i));
    const mid = Math.floor(n / 2);
    const wanted = W > H * 1.2 ? [mid - 2, mid + 1, mid - 4, mid + 3] : [mid - 1, mid + 1];
    players = wanted.filter((i) => i >= 0 && i < n).map((i, k) => ({ cab: cabs[i], ph: k * 1.7, jumpAt: 2.5 + k * 3.7, jumpT: -1 }));
    fronts = [];
    if (FRONT_MACHINES && W > H * 1.25) {
      const fh = Math.round(H * 0.56), fw = Math.round(fh * 0.58);
      fronts.push(makeCab(-Math.round(fw * 0.4), H + Math.round(fh * 0.08), fw, fh, 4));
      fronts.push(makeCab(W - fw + Math.round(fw * 0.4), H + Math.round(fh * 0.08), fw, fh, 5));
    }
    lamps = [];
    const nl = Math.max(2, Math.round(W / 85));
    for (let i = 0; i < nl; i++) lamps.push({ x: Math.round(((i + 0.5) / nl) * W), col: [PINK, CYAN, VIOLET][i % 3], ph: i * 1.9, a: 0 });
    signs = [];
    if (W > H * 1.1) {
      const s = Math.round(H * 0.15);
      const add = (kind, cx, cy, size, col, ph) => {
        const pts = new Set();
        for (const path of SIGNS[kind]) {
          for (let k = 1; k < path.length; k++) {
            linePts(Math.round(cx + path[k - 1][0] * size), Math.round(cy + path[k - 1][1] * size), Math.round(cx + path[k][0] * size), Math.round(cy + path[k][1] * size), pts);
          }
        }
        const core = [...pts].map((p) => p.split(',').map(Number));
        const glow = new Set();
        for (const [a, b] of core) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = a + dx + ',' + (b + dy); if (!pts.has(k)) glow.add(k); }
        signs.push({ core, glow: [...glow].map((p) => p.split(',').map(Number)), col, ph });
      };
      add('joy', Math.round(W * 0.13 - s / 2), Math.round(H * 0.16), s, CYAN, 0.7);
      add('star', Math.round(W * 0.87 - s / 2), Math.round(H * 0.16), s, PINK, 2.3);
      if (W > H * 1.6) {
        const s2 = Math.round(s * 0.7);
        add('bolt', Math.round(W * 0.27 - s2 / 2), Math.round(H * 0.11), s2, VIOLET, 4.1);
        add('heart', Math.round(W * 0.73 - s2 / 2), Math.round(H * 0.12), s2, BLUE, 5.3);
      }
    }
    dust = Array.from({ length: Math.max(12, Math.round((W * H) / 700)) }, () => ({ x: rnd() * W, y: rnd() * H, v: 0.5 + rnd() * 1.5, p: rnd() * 6.28 }));
  }

  function carpetTile() {
    const T = 32, c = document.createElement('canvas');
    c.width = c.height = T;
    const x = c.getContext('2d');
    x.fillStyle = '#0c0a26'; x.fillRect(0, 0, T, T);
    const cols = ['#8a2a68', '#21788f', '#5a3d99', '#30508f'];
    const P = (a, b, col) => { x.fillStyle = col; x.fillRect(((a % T) + T) % T, ((b % T) + T) % T, 1, 1); };
    for (let i = 0; i < 24; i++) {
      const a = Math.floor(rnd() * T), b = Math.floor(rnd() * T), col = cols[i % 4], k = Math.floor(rnd() * 4);
      if (k === 0) { P(a, b, col); P(a + 1, b, col); P(a, b + 1, col); P(a + 1, b + 1, col); }
      else if (k === 1) { for (let j = 0; j < 6; j++) P(a + j, b + (j % 2), col); }
      else if (k === 2) { for (let j = -2; j <= 2; j++) P(a + j, b + 2, col); P(a - 1, b + 1, col); P(a + 1, b + 1, col); P(a, b, col); }
      else { P(a, b - 1, col); P(a, b + 1, col); P(a - 1, b, col); P(a + 1, b, col); }
    }
    return x.getImageData(0, 0, T, T).data;
  }

  function paintCab(x, c) {
    const { x: L, top, w, h, mh, scr, cpY, cph, u, door, theme: th } = c;
    const R = L + w - 1;
    rect(x, L, top + mh, w, h - mh, th.body);
    rect(x, L, top + mh, 1, h - mh, th.side);
    rect(x, R, top + mh, 1, h - mh, th.dark);
    rect(x, L - 1, top, w + 2, mh, th.dark);
    rect(x, scr.x - 1, scr.y - 1, scr.w + 2, scr.h + 2, '#05030d');
    rect(x, L - 1, cpY, w + 2, cph, th.panel);
    rect(x, L - 1, cpY, w + 2, 1, th.side);
    rect(x, L - 1, cpY + cph, w + 2, 1, th.dark);
    const jx = L + Math.round(w * 0.27);
    rect(x, jx, cpY - 2 * u, u, 2 * u, '#b9b0dc');
    const bw = Math.max(2, 2 * u);
    rect(x, jx + Math.floor((u - bw) / 2), cpY - 3 * u, bw, u, th.trim);
    rect(x, L + Math.round(w * 0.56), cpY + Math.max(0, (cph - u) >> 1), u, u, PINK);
    rect(x, L + Math.round(w * 0.74), cpY + Math.max(0, (cph - u) >> 1), u, u, CYAN);
    rect(x, door.x - 1, door.y - 1, door.w + 2, door.h + 2, '#05030d');
    rect(x, door.x, door.y, door.w, door.h, th.dark);
    rect(x, L, c.base - Math.max(2, Math.round(h * 0.2)), w, 1, th.trim);
    rect(x, L, c.base - 2, w, 2, '#07040f');
  }

  function paintBackground() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    rect(x, 0, 0, W, ceilY, '#0a0718');
    for (let i = 6; i < W; i += 14) rect(x, i, 0, 1, ceilY, '#110c26');
    rect(x, 0, ceilY - 1, W, 1, '#1d1442');
    const WALL = ['#110a29', '#130b2d', '#150c31', '#170d35', '#190e39', '#1b0f3d', '#1d1041'];
    const span = floorY - ceilY;
    for (let i = 0; i < WALL.length; i++) {
      const y0 = ceilY + Math.floor((span * i) / WALL.length), y1 = ceilY + Math.floor((span * (i + 1)) / WALL.length);
      rect(x, 0, y0, W, y1 - y0, WALL[i]);
      if (i > 0) { x.fillStyle = WALL[i - 1]; for (let k = i % 2; k < W; k += 2) x.fillRect(k, y0, 1, 1); }
    }
    for (let k = 9; k < W; k += 22) { rect(x, k, ceilY, 1, stripY - ceilY - 1, '#0e0823'); rect(x, k + 1, ceilY, 1, stripY - ceilY - 1, '#1e1446'); }
    rect(x, 0, stripY + 2, W, floorY - stripY - 2, '#150b33');
    for (let k = 0; k < W; k += 4) rect(x, k, stripY + 2, 2, floorY - stripY - 2, '#170c37');
    x.fillStyle = x.createPattern(ditherTile('rgba(255,79,163,.55)'), 'repeat'); x.fillRect(0, stripY - 1, W, 1); x.fillRect(0, stripY + 1, W, 1);
    rect(x, 0, stripY, W, 1, '#d23d8a');
    for (const l of lamps) { rect(x, l.x - 3, ceilY - 2, 7, 2, '#2a1f5c'); rect(x, l.x - 2, ceilY, 5, 1, l.col); }
    const D = H - floorY;
    if (D > 0) {
      const tile = carpetTile();
      const img = x.createImageData(W, D);
      const d = img.data;
      const yh = Math.round(H * 0.45), near = H - yh;
      const ka = near / 2, kb = (near * near) / 2;
      for (let yy = 0; yy < D; yy++) {
        const z = 1 / (floorY + yy - yh);
        const v = Math.floor(kb * z) & 31;
        const fog = Math.min(1, (yy + 2) / (D * 0.85));
        for (let xx = 0; xx < W; xx++) {
          const uu = Math.floor((xx - W / 2) * ka * z + 4096) & 31;
          const ti = (v * 32 + uu) * 4, o = (yy * W + xx) * 4;
          d[o] = 12 + (tile[ti] - 12) * fog;
          d[o + 1] = 10 + (tile[ti + 1] - 10) * fog;
          d[o + 2] = 38 + (tile[ti + 2] - 38) * fog;
          d[o + 3] = 255;
        }
      }
      x.putImageData(img, 0, floorY);
    }
    rect(x, 0, floorY, W, 1, '#05030d');
    for (const cab of cabs) paintCab(x, cab);
    return c;
  }

  function paintFront() {
    if (!fronts.length) return null;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    for (const cab of fronts) {
      paintCab(x, cab);
      x.fillStyle = 'rgba(5,3,13,.4)';
      x.fillRect(cab.x - 1, cab.top, cab.w + 2, cab.base - cab.top);
    }
    return c;
  }

  function drawCabLive(c, t) {
    const { x: L, top, w, mh, scr, theme: th, door, u } = c;
    const pulse = Math.floor(t * 2 + c.seed) % 4 === 0;
    rect(g, L, top + 1, w, mh - 2, pulse ? th.marq2 : th.marq);
    if (mh >= 5) rect(g, L + 1, top + 2, w - 2, mh - 4, pulse ? th.marq : th.marq2);
    if (w >= 20) {
      const s = Math.max(3, u * 3);
      for (let k = 1; k < w - 1; k += s) if ((Math.floor(t * 6) + k / s) % 2 < 1) px(g, L + k, top, '#ffffff');
    }
    if (w >= 30 && mh >= 7) {
      const mx = L + (w >> 1), my = top + (mh >> 1);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) px(g, mx + dx, my + dy, '#ffffff');
      for (const k of [-1, 1]) { rect(g, mx + k * Math.round(w * 0.28) - 1, my, 3, 1, th.dark); rect(g, mx + k * Math.round(w * 0.18), my, 1, 1, th.dark); }
    }
    g.globalAlpha = 0.35; rect(g, L - 1, top - 1, w + 2, 1, th.marq); g.globalAlpha = 1;
    c.game.draw(g, scr.x, scr.y, scr.w, scr.h, t + c.seed * 0.37, c.seed);
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let yy = scr.y + 1; yy < scr.y + scr.h; yy += 2) g.fillRect(scr.x, yy, scr.w, 1);
    px(g, scr.x, scr.y, 'rgba(255,255,255,.45)');
    if (c.flash > 0) { g.globalAlpha = c.flash; rect(g, scr.x, scr.y, scr.w, scr.h, '#ffffff'); g.globalAlpha = 1; }
    const on = Math.floor(t * 1.5 + c.seed) % 2 === 0;
    const cy = door.y + Math.max(1, door.h >> 2);
    rect(g, door.x + Math.max(1, door.w >> 3), cy, u, Math.max(1, u * 2), on ? PINK : '#5a1d3c');
    rect(g, door.x + door.w - Math.max(1, door.w >> 3) - u, cy, u, Math.max(1, u * 2), on ? '#5a1d3c' : PINK);
  }
  function drawReflection(c, t) {
    const rh = Math.max(2, Math.round(c.h * 0.16));
    const flick = 0.85 + 0.15 * Math.sin(t * 9 + c.seed);
    for (let k = 0; k < rh; k++) {
      g.globalAlpha = 0.3 * (1 - k / rh) * flick;
      rect(g, c.x + 1, c.base + k, c.w - 2, 1, c.game.glow);
    }
    g.globalAlpha = 1;
  }
  function drawPlayer(p, t) {
    const c = p.cab;
    const u = Math.max(1, Math.round((c.h * 0.68) / 17));
    const pw = 11 * u, phh = 17 * u;
    let jump = 0, cheer = false;
    if (p.jumpT < 0 && t > p.jumpAt) { p.jumpT = t; c.flash = 0.9; }
    if (p.jumpT >= 0) {
      const k = (t - p.jumpT) / 0.45;
      if (k >= 1) { p.jumpT = -1; p.jumpAt = t + 6 + ((c.seed * 13) % 7); }
      else { jump = Math.round(Math.sin(k * Math.PI) * 3 * u); cheer = true; }
    }
    const x0 = c.x + Math.round((c.w - pw) / 2);
    const y0 = c.base + 2 * u - phh - jump;
    const bob = !cheer && Math.floor(t * 2 + p.ph) % 2 ? u : 0;
    g.globalAlpha = 0.5; rect(g, x0 + u, c.base + 2 * u - 1, pw - 2 * u, Math.max(1, u), '#000000'); g.globalAlpha = 1;
    const ink = '#07040f', rim = c.game.glow;
    const rows = PLAYER_BODY;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const dy = r < 4 ? bob : 0;
      for (let k = 0; k < 11; k++) if (row[k] === '#') rect(g, x0 + k * u, y0 + r * u + dy, u, u, ink);
    }
    const armL = cheer ? -3 : (Math.floor(t * 5 + p.ph) % 2 ? -1 : 0);
    const armR = cheer ? -3 : (Math.floor(t * 4 + p.ph + 1) % 2 ? -1 : 0);
    rect(g, x0 + u, y0 + (6 + armL) * u, u, 3 * u, ink);
    rect(g, x0 + 9 * u, y0 + (6 + armR) * u, u, 3 * u, ink);
    g.globalAlpha = 0.75;
    rect(g, x0 + 3 * u, y0 + bob, 5 * u, Math.max(1, u >> 1), rim);
    rect(g, x0 + 2 * u, y0 + 5 * u, 7 * u, Math.max(1, u >> 1), rim);
    g.globalAlpha = 0.45;
    rect(g, x0 + 3 * u, y0 + u + bob, Math.max(1, u >> 1), 3 * u, rim);
    rect(g, x0 + 8 * u - Math.max(1, u >> 1), y0 + u + bob, Math.max(1, u >> 1), 3 * u, rim);
    g.globalAlpha = 1;
  }
  function drawSigns(t) {
    for (const s of signs) {
      const k = (t + s.ph) % 7.3;
      const off = k < 0.08 || (k > 0.16 && k < 0.22);
      const dim = k > 0.08 && k < 0.16;
      if (off) {
        for (const [a, b] of s.core) px(g, a, b, '#2a1f4a');
        continue;
      }
      g.globalAlpha = dim ? 0.15 : 0.4;
      for (const [a, b] of s.glow) px(g, a, b, s.col);
      g.globalAlpha = dim ? 0.6 : 1;
      for (const [a, b] of s.core) px(g, a, b, s.col);
      g.globalAlpha = 1;
    }
  }
  function drawBeams(t) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const yEnd = floorY + Math.round((H - floorY) * 0.3);
    const L = yEnd - ceilY;
    for (const l of lamps) {
      l.a = reduce ? 0 : Math.sin(t * 0.35 + l.ph) * 0.38;
      const a1 = Math.tan(l.a - HALF) * L, a2 = Math.tan(l.a + HALF) * L;
      g.globalAlpha = 0.14;
      g.fillStyle = dither(l.col);
      g.beginPath();
      g.moveTo(l.x - 1, ceilY + 1); g.lineTo(l.x + 2, ceilY + 1);
      g.lineTo(l.x + a2, yEnd); g.lineTo(l.x + a1, yEnd); g.closePath();
      g.fill();
      const rx = Math.max(3, (a2 - a1) * 0.6), cx = l.x + (a1 + a2) / 2;
      g.globalAlpha = 0.2;
      g.beginPath(); g.ellipse(cx, yEnd, rx, Math.max(2, rx * 0.28), 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 0.7;
    for (const d of dust) {
      const y = ((d.y + t * d.v * 2) % (H - ceilY)) + ceilY;
      const x = d.x + Math.sin(t * 0.6 + d.p) * 4;
      let lit = false;
      for (const l of lamps) {
        const dy = y - ceilY;
        if (dy <= 2) continue;
        if (dy > yEnd - ceilY) continue;
        const ang = Math.atan2(x - l.x, dy);
        if (ang > l.a - HALF && ang < l.a + HALF) { lit = true; break; }
      }
      if (lit) px(g, Math.round(x), Math.round(y), WHITE);
    }
    g.restore();
  }
  function drawStripChase(t) {
    const len = Math.max(6, Math.round(W * 0.06));
    for (let k = 0; k < 3; k++) {
      const x = Math.round((((t * 0.22 + k / 3) % 1) * (W + len)) - len);
      rect(g, x, stripY, len, 1, '#ffd0e6');
      g.globalAlpha = 0.5; rect(g, x, stripY - 1, len, 1, PINK); rect(g, x, stripY + 1, len, 1, PINK); g.globalAlpha = 1;
    }
  }

  let last = -1e9;
  function draw(now) {
    if (!alive) return;
    if (!reduce && now - last < 30) { raf = requestAnimationFrame(draw); return; }
    last = now;
    if (bg) {
      const t = (now - t0) / 1000;
      g.drawImage(bg, 0, 0);
      drawSigns(t);
      drawStripChase(t);
      for (const c of cabs) { c.flash = Math.max(0, c.flash - 0.04); drawReflection(c, t); drawCabLive(c, t); }
      for (const p of players) drawPlayer(p, t);
      if (fg) g.drawImage(fg, 0, 0);
      for (const c of fronts) { drawReflection(c, t); drawCabLive(c, t); }
      drawBeams(t);
    }
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const sc = r.width < 700 ? 3 : 4;
    W = Math.max(1, Math.round(r.width / sc));
    H = Math.max(1, Math.round(r.height / sc));
    canvas.width = W; canvas.height = H;
    seed = 11;
    layout();
    bg = paintBackground();
    fg = paintFront();
    if (reduce) draw(t0 + 2500);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  if (window.__retroDebug) window.__arcade = { draw: () => draw(performance.now()), stop: () => { alive = false; cancelAnimationFrame(raf); } };
  if (!reduce) raf = requestAnimationFrame(draw);
  return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
}
