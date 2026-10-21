import { box, plane, cylinder } from '../gl/geo.js';
import { canvasTex, material } from '../gl/engine.js';
import { h } from '../core/dom.js';
import { settings } from '../core/store.js';

export const sqPos = (sq) => [(sq & 7) - 3.5, 0, (sq >> 3) - 3.5];
export function posSq(p) {
  if (!p) return -1;
  const c = Math.floor(p[0] + 4), r = Math.floor(p[2] + 4);
  return c < 0 || c > 7 || r < 0 || r > 7 ? -1 : r * 8 + c;
}

export function buildBoard(E, { light = '#e6d7b4', dark = '#2e5d66', frame = '#26162f', files = 'abcdefgh', ranks = '87654321' } = {}) {
  const P = 40, B = 40, S = P * 8 + B * 2;
  const tex = canvasTex(S, S, (g) => {
    g.fillStyle = frame; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) { const x = (i * 97) % S, y = (i * 53 + ((i * 7) % 13)) % S; g.fillStyle = i % 3 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)'; g.fillRect(x, y, 3, 1); }
    g.fillStyle = '#ff4fa3'; g.fillRect(0, 0, S, 2); g.fillRect(0, S - 2, S, 2); g.fillRect(0, 0, 2, S); g.fillRect(S - 2, 0, 2, S);
    g.fillStyle = '#4b2c66'; g.fillRect(B - 4, B - 4, P * 8 + 8, P * 8 + 8);
    g.fillStyle = '#120a1d'; g.fillRect(B - 2, B - 2, P * 8 + 4, P * 8 + 4);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const isDark = (r + c) % 2 === 1;
      g.fillStyle = isDark ? dark : light;
      const x = B + c * P, y = B + r * P;
      g.fillRect(x, y, P, P);
      g.fillStyle = isDark ? 'rgba(0,0,0,.12)' : 'rgba(120,90,40,.10)';
      for (let k = 0; k < 14; k++) g.fillRect(x + ((k * 13 + r * 7 + c * 3) % P), y + ((k * 7 + c * 11 + r) % P), 2, 1);
      g.fillStyle = isDark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.25)';
      g.fillRect(x, y, P, 1);
    }
    g.font = '700 24px RetroPix, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#d9c9a3';
    for (let i = 0; i < 8; i++) {
      g.fillText(files[i], B + i * P + P / 2, S - B / 2 + 2);
      g.fillText(ranks[i], B / 2, B + i * P + P / 2 + 2);
    }
  });
  const group = new E.Node();
  const top = E.node(plane(10, 10), material({ tex: E.texture(tex), spec: 0.12, shine: 30 }));
  top.pos = [0, 0, 0];
  const slab = E.node(box(10, 0.5, 10), material({ color: '#1c1030', spec: 0.1 }));
  slab.pos = [0, -0.262, 0];
  const plinth = E.node(box(7.6, 2.4, 7.6), material({ color: '#140b22', spec: 0.05 }));
  plinth.pos = [0, -1.7, 0];
  const neon = material({ kind: 'fx', color: '#ff4fa3' });
  const neonC = material({ kind: 'fx', color: '#3ee0ff' });
  const strips = [
    [10.04, 0.07, 0.07, 0, -0.05, 5.0], [10.04, 0.07, 0.07, 0, -0.05, -5.0],
    [0.07, 0.07, 10.04, 5.0, -0.05, 0], [0.07, 0.07, 10.04, -5.0, -0.05, 0],
  ].map(([w, hh, d, x, y, z]) => { const n = E.node(box(w, hh, d), neon); n.pos = [x, y, z]; return n; });
  const base = [
    [7.7, 0.06, 0.06, 0, -2.88, 3.82], [7.7, 0.06, 0.06, 0, -2.88, -3.82],
    [0.06, 0.06, 7.7, 3.82, -2.88, 0], [0.06, 0.06, 7.7, -3.82, -2.88, 0],
  ].map(([w, hh, d, x, y, z]) => { const n = E.node(box(w, hh, d), neonC); n.pos = [x, y, z]; return n; });
  group.add(top, slab, plinth, ...strips, ...base);
  E.scene.add(group);
  E.env.shadowY = 0;
  return group;
}

const MARK = {
  target: () => material({ kind: 'fx', mode: 1, color: '#3ee0ff', blend: 'add', opacity: 0.95, depthWrite: false }),
  capture: () => material({ kind: 'fx', mode: 2, color: '#ff4f6a', blend: 'add', opacity: 1, depthWrite: false }),
  select: () => material({ kind: 'fx', mode: 2, color: '#ffc845', blend: 'add', opacity: 1, depthWrite: false }),
  last: () => material({ kind: 'fx', mode: 0, color: '#ffc845', blend: 'alpha', opacity: 0.28, depthWrite: false }),
  hover: () => material({ kind: 'fx', mode: 0, color: '#ffffff', blend: 'alpha', opacity: 0.16, depthWrite: false }),
  cursor: () => material({ kind: 'fx', mode: 2, color: '#3ee0ff', blend: 'add', opacity: 1, depthWrite: false }),
  check: () => material({ kind: 'fx', mode: 1, color: '#ff4f6a', blend: 'add', opacity: 1, depthWrite: false }),
  movable: () => material({ kind: 'fx', mode: 1, color: '#7dff6a', blend: 'add', opacity: 0.55, depthWrite: false }),
};

export function markers(E) {
  const geo = plane(1, 1);
  const pools = {};
  const group = new E.Node();
  E.scene.add(group);
  let t = 0;
  E.onFrame((dt) => {
    t += dt;
    const s = 0.8 + Math.sin(t * 6) * 0.08;
    for (const k of ['target', 'movable', 'check']) for (const n of (pools[k] || [])) if (n.visible) { n.scl = [s, 1, s]; }
  });
  return {
    set(list) {
      const used = {};
      for (const { sq, kind, y = 0.012 } of list) {
        const pool = pools[kind] || (pools[kind] = []);
        const i = used[kind] = (used[kind] || 0);
        let n = pool[i];
        if (!n) { n = E.node(geo, MARK[kind]()); pool.push(n); group.add(n); }
        const [x, , z] = sqPos(sq);
        n.pos = [x, y + (kind === 'last' ? 0 : kind === 'hover' ? 0.002 : 0.004), z];
        n.scl = kind === 'select' || kind === 'capture' || kind === 'cursor' ? [1, 1, 1] : [0.8, 1, 0.8];
        n.visible = true;
        used[kind] = i + 1;
      }
      for (const k in pools) pools[k].forEach((n, i) => { if (i >= (used[k] || 0)) n.visible = false; });
    },
  };
}

export function controlBar(stage, buttons) {
  const bar = h('div', { class: 'hud-row' });
  const els = buttons.map((b) => {
    const el = h('button', { class: 'btn small' + (b.primary ? ' primary' : ''), title: b.title || b.label }, b.label);
    el.addEventListener('click', (e) => { e.currentTarget.blur(); b.fn(); });
    bar.append(el);
    return el;
  });
  stage.append(bar);
  return { bar, els };
}

export function view3d(stage) {
  stage.style.padding = '0';
  const box3 = h('div', { style: 'position:absolute;inset:0' });
  stage.append(box3);
  return box3;
}

export const pixelOn = () => settings.pixel3d;

export function autoFit(E, { base = 15, span = 17.5 } = {}) {
  let last = 1.6;
  const apply = (aspect) => {
    last = aspect;
    const d = Math.max(base, (span / aspect) * 0.92);
    E.cam.dist = d;
    E.cam.max.dist = Math.max(24, d * 1.45);
    E.cam.min.dist = Math.min(7, d * 0.55);
    if (aspect < 0.8) E.cam.pitch = Math.max(E.cam.pitch, 1.18);
  };
  const off = E.onResize(apply);
  off.refit = () => apply(last);
  return off;
}
