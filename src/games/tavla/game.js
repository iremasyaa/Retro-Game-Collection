import { create3D, material, canvasTex } from '../../gl/engine.js';
import { box, plane, lathe } from '../../gl/geo.js';
import { qaxis, qmul, qslerp, ease } from '../../gl/math.js';
import { onSetting, settings } from '../../core/store.js';
import { runAI } from '../../core/ai.js';
import { controlBar, view3d } from '../board3d.js';
import { initial, turns, applySingle, sameMove, winner, clone, pips, BAR, OFF } from './rules.js';
import { chooseTurn } from './ai.js';

const PW = 0.9, HB = 0.5, EDGE = 4.68, APEX = 0.85, TRAYX = 6.75;
const pointX = (i) => {
  if (i <= 11) return i <= 5 ? HB + (5.5 - i) * PW : -(HB + (i - 6 + 0.5) * PW);
  const k = i - 12;
  return k <= 5 ? -(HB + (5.5 - k) * PW) : HB + (k - 6 + 0.5) * PW;
};
const rowSign = (i) => (i <= 11 ? 1 : -1);
const CHECKER = lathe([[0, 0], [0.37, 0], [0.4, 0.03], [0.4, 0.12], [0.37, 0.15], [0.29, 0.15], [0.27, 0.128], [0.12, 0.128], [0.1, 0.145], [0, 0.145]], 20);
const DIE_FACES = [3, 4, 1, 6, 2, 5];
const FACE_UP = { 1: [0, 0, 0, 1], 6: qaxis(1, 0, 0, Math.PI), 2: qaxis(1, 0, 0, -Math.PI / 2), 5: qaxis(1, 0, 0, Math.PI / 2), 3: qaxis(0, 0, 1, Math.PI / 2), 4: qaxis(0, 0, 1, -Math.PI / 2) };
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]] };

function dieGeo() {
  const uv = DIE_FACES.map((v) => { const c = (v - 1) % 3, r = Math.floor((v - 1) / 3); return [c / 3, r / 2, (c + 1) / 3, (r + 1) / 2]; });
  return box(0.6, 0.6, 0.6, uv);
}
function dieAtlas(bg, pip) {
  return canvasTex(96, 64, (g) => {
    for (let v = 1; v <= 6; v++) {
      const ox = ((v - 1) % 3) * 32, oy = Math.floor((v - 1) / 3) * 32;
      g.fillStyle = bg; g.fillRect(ox, oy, 32, 32);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(ox, oy + 30, 32, 2); g.fillRect(ox + 30, oy, 2, 32);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(ox, oy, 32, 2); g.fillRect(ox, oy, 2, 32);
      g.fillStyle = pip;
      for (const [px, py] of PIPS[v]) g.fillRect(ox + 6 + px * 8, oy + 6 + py * 8, 6, 6);
    }
  });
}

export function mount(stage, opts, api) {
  const two = opts.mod === '2p';
  const level = opts.zorluk || 'orta';
  const target = +(opts.mac || 3);
  const NAMES = two ? ['BEYAZ', 'SİYAH'] : ['SEN', 'BİLGİSAYAR'];
  const wrap = view3d(stage);
  let E;
  try {
    E = create3D(wrap, { pixel: settings.pixel3d, camera: { target: [0.6, -0.9, 1.0], pitch: 1.02, dist: 17, yaw: 0, min: { pitch: 0.35, dist: 8 }, max: { pitch: 1.45, dist: 28 } } });
  } catch (err) {
    wrap.textContent = '3D görünüm için WebGL gerekli. Tarayıcın WebGL desteklemiyor.';
    return { destroy() { wrap.remove(); } };
  }
  let portrait = false;
  const baseYaw = () => (portrait ? -Math.PI / 2 : 0);
  const unfit = E.onResize((aspect) => {
    portrait = aspect < 0.75;
    E.cam.dist = portrait ? Math.max(20, 18.5 / aspect) : Math.max(17, 24.5 / aspect);
    E.cam.max.dist = Math.max(28, E.cam.dist * 1.4);
    E.cam.yaw = baseYaw() + (two && settings.flip && side === 1 ? Math.PI : 0);
    E.cam.target = portrait ? [-1.6, -1.4, 0] : [0.6, -0.9, 1.0];
    E.cam.pitch = portrait ? 1.2 : 1.02;
  });
  unfit.refit = () => { E.cam.yaw = baseYaw(); E.cam.pitch = portrait ? 1.2 : 1.02; };
  E.snapCamera();
  E.env.shadowY = 0;

  const surfTex = canvasTex(472, 400, (g) => {
    g.fillStyle = '#0f3036'; g.fillRect(0, 0, 472, 400);
    for (let i = 0; i < 2600; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.035)'; g.fillRect((i * 131) % 472, (i * 71 + (i % 7)) % 400, 2, 1); }
    const U = (x) => ((x + 5.9) / 11.8) * 472, V = (z) => ((z + 5) / 10) * 400;
    for (let i = 0; i < 24; i++) {
      const x = pointX(i), sgn = rowSign(i);
      g.fillStyle = i % 2 === 0 ? '#e6d3ad' : '#b8324a';
      g.beginPath();
      g.moveTo(U(x - PW / 2 + 0.03), V(sgn * EDGE)); g.lineTo(U(x + PW / 2 - 0.03), V(sgn * EDGE)); g.lineTo(U(x), V(sgn * APEX));
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath(); g.moveTo(U(x), V(sgn * EDGE)); g.lineTo(U(x + PW / 2 - 0.03), V(sgn * EDGE)); g.lineTo(U(x), V(sgn * APEX)); g.closePath(); g.fill();
      g.font = '700 12px RetroPix, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#9fd8cf';
      g.fillText(String(i + 1), U(x), V(sgn * 4.86));
    }
  });
  const S = E.scene;
  const add = (geo, mat, pos) => { const n = E.node(geo, mat); n.pos = pos; S.add(n); return n; };
  const wood = material({ color: '#5a3322', spec: 0.15, shine: 18 });
  const woodDark = material({ color: '#3a1f16', spec: 0.1 });
  const neon = material({ kind: 'fx', color: '#ff4fa3' });
  const neonC = material({ kind: 'fx', color: '#3ee0ff' });
  add(plane(11.8, 10), material({ tex: E.texture(surfTex), spec: 0.05 }), [0, 0.002, 0]);
  add(plane(1.2, 10), material({ color: '#0b2226', spec: 0.05 }), [TRAYX, 0.002, 0]);
  add(box(14.3, 0.4, 11), woodDark, [0.6, -0.215, 0]);
  for (const z of [-5.25, 5.25]) { add(box(14.3, 0.32, 0.5), wood, [0.6, 0.16, z]); add(box(14.3, 0.05, 0.06), neon, [0.6, 0.345, z + (z > 0 ? 0.22 : -0.22)]); }
  for (const x of [-6.15, 7.55]) { add(box(0.5, 0.32, 11), wood, [x, 0.16, 0]); add(box(0.06, 0.05, 11), neon, [x + (x > 0 ? 0.22 : -0.22), 0.345, 0]); }
  add(box(0.3, 0.32, 10), wood, [6.05, 0.16, 0]);
  add(box(1.2, 0.32, 0.25), wood, [TRAYX, 0.16, 0]);
  add(box(1.0, 0.3, 10), wood, [0, 0.15, 0]);
  add(box(0.08, 0.04, 10), neonC, [0, 0.31, 0]);
  add(box(10.5, 2.4, 8.2), material({ color: '#140b22', spec: 0.05 }), [0.6, -1.6, 0]);
  for (const [w, d, x, z] of [[10.6, 0.06, 0.6, 4.12], [10.6, 0.06, 0.6, -4.12], [0.06, 8.3, -4.67, 0], [0.06, 8.3, 5.87, 0]]) add(box(w, 0.06, d), neonC, [x, -2.78, z]);

  const matW = material({ color: '#f2ead8', spec: 0.5, shine: 26, rim: 0.25 });
  const matB = material({ color: '#2b2433', spec: 0.7, shine: 34, rim: 0.6, emissive: '#0a0612' });
  const dieG = dieGeo();
  const dieMats = [material({ tex: E.texture(dieAtlas('#f3ead7', '#140f2a')), spec: 0.4, shine: 30 }), material({ tex: E.texture(dieAtlas('#2b2433', '#f3ead7')), spec: 0.5, shine: 30, rim: 0.4 })];
  const dice = [E.node(dieG, dieMats[0]), E.node(dieG, dieMats[0])];
  dice.forEach((d) => { d.castShadow = true; d.visible = false; S.add(d); });

  const glowGeo = plane(1, 1);
  const glowMats = {
    movable: material({ kind: 'fx', mode: 1, color: '#7dff6a', blend: 'add', opacity: 0.6, depthWrite: false }),
    select: material({ kind: 'fx', mode: 2, color: '#ffc845', blend: 'add', opacity: 1, depthWrite: false }),
    target: material({ kind: 'fx', mode: 1, color: '#3ee0ff', blend: 'add', opacity: 0.95, depthWrite: false }),
    hit: material({ kind: 'fx', mode: 2, color: '#ff4f6a', blend: 'add', opacity: 1, depthWrite: false }),
  };
  const glowPool = {};
  let glowT = 0;
  E.onFrame((dt) => { glowT += dt; const s = 1 + Math.sin(glowT * 6) * 0.08; for (const n of (glowPool.target || [])) if (n.visible) n.scl = [n.data.s * s, 1, n.data.s2 * s]; });
  function setGlows(list) {
    const used = {};
    for (const g of list) {
      const pool = glowPool[g.kind] || (glowPool[g.kind] = []);
      const i = used[g.kind] || 0;
      let n = pool[i];
      if (!n) { n = E.node(glowGeo, glowMats[g.kind]); pool.push(n); S.add(n); }
      n.pos = g.pos; n.data.s = g.sx || 0.95; n.data.s2 = g.sz || 0.95; n.scl = [n.data.s, 1, n.data.s2]; n.visible = true;
      used[g.kind] = i + 1;
    }
    for (const k in glowPool) glowPool[k].forEach((n, i) => { if (i >= (used[k] || 0)) n.visible = false; });
  }

  let s = initial(), side = 0, dv = [], valid = [], played = [], turnStart = null, phase = 'opening', srcSel = null;
  const match = [0, 0];
  let token = 0, alive = true, hoverKey = null;
  let stacks = { pts: Array.from({ length: 24 }, () => []), bar: [[], []], off: [[], []] };
  const ownerOf = (n) => n.data.side;

  function slot(where, i, k, n) {
    if (where === 'pt') {
      const sp = n <= 5 ? 0.82 : Math.min(0.82, (EDGE - APEX - 0.4) / (n - 1));
      return { pos: [pointX(i), 0, rowSign(i) * (EDGE - 0.41 - k * sp)], rot: [0, 0, 0, 1] };
    }
    if (where === 'bar') return { pos: [0, 0.3, (i === 0 ? 1 : -1) * (0.75 + k * 0.84)], rot: [0, 0, 0, 1] };
    return { pos: [TRAYX, 0.4, (i === 0 ? 1 : -1) * (4.55 - k * 0.17)], rot: qaxis(1, 0, 0, Math.PI / 2) };
  }
  function makeChecker(sd) { const n = E.node(CHECKER, sd === 0 ? matW : matB); n.castShadow = true; n.data.side = sd; S.add(n); return n; }
  function syncAll() {
    for (const arr of [...stacks.pts, ...stacks.bar, ...stacks.off]) for (const n of arr) S.remove(n);
    stacks = { pts: Array.from({ length: 24 }, () => []), bar: [[], []], off: [[], []] };
    for (let i = 0; i < 24; i++) { const c = s.pts[i]; for (let k = 0; k < Math.abs(c); k++) stacks.pts[i].push(makeChecker(c > 0 ? 0 : 1)); }
    for (const sd of [0, 1]) { for (let k = 0; k < s.bar[sd]; k++) stacks.bar[sd].push(makeChecker(sd)); for (let k = 0; k < s.off[sd]; k++) stacks.off[sd].push(makeChecker(sd)); }
    layout(false);
  }
  function layout(animate) {
    const place = (n, sl) => {
      if (n.data.moving) return;
      if (!animate) { n.pos = sl.pos; n.rot = sl.rot; return; }
      const p0 = n.pos.slice();
      if (Math.hypot(p0[0] - sl.pos[0], p0[1] - sl.pos[1], p0[2] - sl.pos[2]) < 0.01) return;
      E.tween(0.15, (t) => { n.pos = [p0[0] + (sl.pos[0] - p0[0]) * t, p0[1] + (sl.pos[1] - p0[1]) * t, p0[2] + (sl.pos[2] - p0[2]) * t]; });
    };
    stacks.pts.forEach((arr, i) => arr.forEach((n, k) => place(n, slot('pt', i, k, arr.length))));
    [0, 1].forEach((sd) => { stacks.bar[sd].forEach((n, k) => place(n, slot('bar', sd, k))); stacks.off[sd].forEach((n, k) => place(n, slot('off', sd, k))); });
  }
  function stackOf(where, i) { return where === BAR ? stacks.bar[side] : where === OFF ? stacks.off[side] : stacks.pts[where]; }

  function animateMove(m, sd, done) {
    const from = m.from === BAR ? stacks.bar[sd] : stacks.pts[m.from];
    const n = from.pop();
    let victim = null;
    if (m.hit) { victim = stacks.pts[m.to].pop(); stacks.bar[1 - sd].push(victim); }
    let sl;
    if (m.to === OFF) { stacks.off[sd].push(n); sl = slot('off', sd, stacks.off[sd].length - 1); }
    else { stacks.pts[m.to].push(n); sl = slot('pt', m.to, stacks.pts[m.to].length - 1, stacks.pts[m.to].length); }
    if (!n) { layout(true); done && done(); return; }
    n.data.moving = true;
    const p0 = n.pos.slice(), q0 = n.rot.slice();
    const lift = 0.9 + Math.min(1.2, Math.hypot(sl.pos[0] - p0[0], sl.pos[2] - p0[2]) * 0.12);
    api.sfx('move');
    E.tween(0.42, (t) => {
      n.pos = [p0[0] + (sl.pos[0] - p0[0]) * t, p0[1] + (sl.pos[1] - p0[1]) * t + Math.sin(Math.PI * t) * lift, p0[2] + (sl.pos[2] - p0[2]) * t];
      n.rot = qslerp(q0, sl.rot, t);
    }, {
      ease: ease.inOut,
      done: () => {
        n.data.moving = false; api.sfx(m.to === OFF ? 'match' : 'place');
        if (victim) {
          api.sfx('capture');
          const vp = victim.pos.slice(), vs = slot('bar', 1 - sd, stacks.bar[1 - sd].length - 1);
          victim.data.moving = true;
          E.tween(0.4, (t) => { victim.pos = [vp[0] + (vs.pos[0] - vp[0]) * t, vp[1] + (vs.pos[1] - vp[1]) * t + Math.sin(Math.PI * t) * 1.4, vp[2] + (vs.pos[2] - vp[2]) * t]; }, { done: () => { victim.data.moving = false; layout(true); } });
        }
        layout(true);
        done && done();
      },
    });
  }

  function rollAnim(values, sides, cb) {
    api.sfx('dice');
    values.forEach((v, k) => {
      const d = dice[k];
      d.mat = dieMats[sides[k]];
      d.visible = true;
      const restX = sides.length === 2 && sides[0] !== sides[1] ? (k === 0 ? 2.9 : -2.9) : (sides[0] === 0 ? 2.4 + k * 1.1 : -3.5 + k * 1.1);
      const rest = [restX, 0.3, (k ? -0.1 : 0.12)];
      const start = [restX + (Math.random() - 0.5) * 2, 3.2, (sides[k] === 0 ? 3.2 : -3.2)];
      const qEnd = qmul(qaxis(0, 1, 0, (Math.random() - 0.5) * 1.2), FACE_UP[v]);
      const ax = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
      const spins = 9 + Math.random() * 6;
      E.tween(0.9 + k * 0.08, (t) => {
        d.pos = [start[0] + (rest[0] - start[0]) * ease.out(t), 0.3 + (1 - ease.outBounce(t)) * 2.9, start[2] + (rest[2] - start[2]) * ease.out(t)];
        d.rot = qmul(qaxis(ax[0], ax[1], ax[2], (1 - ease.out(t)) * spins), qEnd);
      }, { ease: ease.linear, done: k === values.length - 1 ? () => { api.sfx('place'); cb && cb(); } : null });
    });
  }

  const maxLen = () => (valid.length ? valid[0].seq.length : 0);
  function allowedNext() {
    const out = [];
    for (const t of valid) {
      if (t.seq.length <= played.length) continue;
      if (!played.every((m, i) => sameMove(m, t.seq[i]))) continue;
      const m = t.seq[played.length];
      if (!out.some((x) => sameMove(x, m))) out.push(m);
    }
    return out;
  }
  const remainingDice = () => {
    const all = dv[0] === dv[1] ? [dv[0], dv[0], dv[0], dv[0]] : dv.slice();
    for (const m of played) { const i = all.indexOf(m.die); if (i >= 0) all.splice(i, 1); }
    return all;
  };

  function status() {
    const parts = [];
    parts.push([two ? 'BEYAZ' : 'SEN', match[0], '#f2ead8'], [two ? 'SİYAH' : 'BİLG.', match[1], '#b9a6ff']);
    if (phase === 'opening') parts.push(['', 'BAŞLAMAK İÇİN ZAR AT', '#ffc845']);
    else if (phase !== 'over') {
      parts.push(['SIRA', NAMES[side], side === 0 ? '#f2ead8' : '#b9a6ff']);
      if (phase === 'move' || phase === 'ai' || phase === 'anim') { const r = remainingDice(); if (r.length) parts.push(['ZAR', r.join(' '), '#ffc845']); }
    }
    parts.push(['PİP', pips(s, 0) + '·' + pips(s, 1)]);
    api.status(parts);
  }

  const isHuman = (sd) => two || sd === 0;
  function refreshGlows() {
    const L = [];
    if (phase === 'move' && isHuman(side)) {
      const next = allowedNext();
      const sources = new Map();
      for (const m of next) sources.set(m.from, true);
      const topOf = (from) => {
        const st = from === BAR ? stacks.bar[side] : stacks.pts[from];
        if (!st.length) return null;
        const sl = from === BAR ? slot('bar', side, st.length - 1) : slot('pt', from, st.length - 1, st.length);
        return [sl.pos[0], sl.pos[1] + 0.16, sl.pos[2]];
      };
      if (srcSel == null) for (const f of sources.keys()) { const p = topOf(f); if (p) L.push({ pos: [p[0], p[1] + 0.005, p[2]], kind: 'movable', sx: 1.0, sz: 1.0 }); }
      else {
        const p = topOf(srcSel);
        if (p) L.push({ pos: [p[0], p[1] + 0.01, p[2]], kind: 'select', sx: 1.0, sz: 1.0 });
        for (const m of next) {
          if (m.from !== srcSel) continue;
          if (m.to === OFF) L.push({ pos: [TRAYX, 0.02, (side === 0 ? 1 : -1) * 2.6], kind: 'target', sx: 1.1, sz: 4.4 });
          else {
            const arr = stacks.pts[m.to];
            const own = arr.length && ownerOf(arr[0]) === side ? arr.length : 0;
            const sl = slot('pt', m.to, own, Math.max(own + 1, 1));
            L.push({ pos: [sl.pos[0], 0.02 + (own > 0 && own <= 5 ? 0 : 0), sl.pos[2]], kind: m.hit ? 'hit' : 'target' });
          }
        }
      }
    }
    setGlows(L);
  }

  function rollOpening() {
    if (phase !== 'opening') return;
    phase = 'anim'; status();
    let a, b;
    a = 1 + Math.floor(Math.random() * 6); b = 1 + Math.floor(Math.random() * 6);
    rollAnim([a, b], [0, 1], () => {
      if (!alive) return;
      if (a === b) { api.toast('EŞİT! TEKRAR'); setTimeout(() => { if (!alive) return; phase = 'opening'; rollOpening(); }, 1100); return; }
      side = a > b ? 0 : 1;
      api.toast(NAMES[side] + ' BAŞLIYOR');
      dv = [Math.max(a, b), Math.min(a, b)];
      setTimeout(() => { if (alive) beginMoves(); }, 900);
    });
  }
  function rollTurn() {
    if (phase !== 'roll') return;
    phase = 'anim'; status(); refreshGlows();
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    rollAnim([a, b], [side, side], () => {
      if (!alive) return;
      dv = [a, b];
      if (a === b) api.toast('ÇİFT ' + a + '!');
      beginMoves();
    });
  }
  function beginMoves() {
    valid = turns(s, side, dv);
    played = []; turnStart = clone(s); srcSel = null;
    if (!maxLen()) {
      phase = 'anim'; status();
      api.toast('OYNANACAK HAMLE YOK', 1500);
      setTimeout(() => { if (alive) endTurn(); }, 1600);
      return;
    }
    if (isHuman(side)) {
      phase = 'move';
      if (s.bar[side]) srcSel = BAR;
      status(); refreshGlows();
    } else aiTurn();
  }
  async function aiTurn() {
    phase = 'ai'; status(); refreshGlows();
    const my = ++token;
    const snap = clone(s), sd = side, dd = dv.slice();
    const t0 = performance.now();
    const seq = await runAI('tavla', [snap, sd, dd, level], () => chooseTurn(snap, sd, dd, level));
    if (my !== token || !alive) return;
    const wait = Math.max(0, 600 - (performance.now() - t0));
    setTimeout(() => {
      if (my !== token || !alive) return;
      const play = (k) => {
        if (my !== token || !alive) return;
        if (!seq || k >= seq.length) { setTimeout(() => { if (my === token && alive) endTurn(); }, 450); return; }
        if (api.blocked) { setTimeout(() => play(k), 200); return; }
        const m = seq[k];
        played.push(m);
        s = applySingle(s, sd, m);
        status();
        animateMove(m, sd, () => setTimeout(() => play(k + 1), 260));
      };
      play(0);
    }, wait);
  }
  function humanMove(m) {
    played.push(m);
    s = applySingle(s, side, m);
    srcSel = null;
    phase = 'anim';
    status(); refreshGlows();
    animateMove(m, side, () => {
      if (!alive) return;
      phase = 'move';
      if (winner(s) || played.length >= maxLen() || !allowedNext().length) { phase = 'anim'; status(); refreshGlows(); setTimeout(() => { if (alive) endTurn(); }, 450); return; }
      if (s.bar[side]) srcSel = BAR;
      status(); refreshGlows();
    });
  }
  function endTurn() {
    const w = winner(s);
    if (w) { handOver(w); return; }
    side = 1 - side; dv = []; played = []; valid = [];
    dice.forEach((d) => { d.visible = false; });
    phase = 'roll';
    flipCamera();
    status(); refreshGlows();
    if (!isHuman(side)) setTimeout(() => { if (alive && phase === 'roll') rollTurn(); }, 650);
  }
  function handOver(w) {
    phase = 'over';
    const pts = w.mars ? 2 : 1;
    match[w.side] += pts;
    status(); refreshGlows();
    const humanWon = two || w.side === 0;
    api.sfx(humanWon ? 'win' : 'lose');
    const who = two ? NAMES[w.side] : w.side === 0 ? 'SEN' : 'BİLGİSAYAR';
    const finished = match[w.side] >= target;
    const stats = [[two ? 'BEYAZ' : 'SEN', match[0]], [two ? 'SİYAH' : 'BİLGİSAYAR', match[1]]];
    setTimeout(() => {
      if (!alive) return;
      if (finished) {
        const title = two ? NAMES[w.side] + ' KAZANDI' : w.side === 0 ? 'MAÇI KAZANDIN!' : 'MAÇI KAYBETTİN';
        api.gameOver({ title, cls: humanWon ? 'win' : 'lose', text: (w.mars ? 'Mars ile bitti! ' : '') + target + ' sayılık maç sona erdi.', stats });
      } else {
        api.overlay({
          title: w.mars ? 'MARS!' : (two ? who + ' ELİ ALDI' : w.side === 0 ? 'ELİ ALDIN!' : 'ELİ KAYBETTİN'),
          cls: humanWon ? 'win' : 'lose', closable: false,
          text: who + ' +' + pts + ' sayı. ' + target + ' sayıya ulaşan maçı kazanır.', stats,
          buttons: [{ label: 'SONRAKİ EL ▶', primary: true, fn: () => { api.closeOverlay(); newHand(); } }, { label: 'MENÜ', fn: () => api.toMenu() }],
        });
      }
    }, 900);
  }
  function newHand() {
    token++;
    s = initial(); side = 0; dv = []; valid = []; played = []; srcSel = null;
    dice.forEach((d) => { d.visible = false; });
    syncAll();
    phase = 'opening';
    status(); refreshGlows();
  }

  function undo() {
    if (phase !== 'move' || !played.length || E.busy) { api.sfx('error'); return; }
    s = clone(turnStart); played = []; srcSel = s.bar[side] ? BAR : null;
    syncAll(); status(); refreshGlows();
    api.sfx('back');
  }
  function flipCamera() { if (two && settings.flip) E.cam.yaw = baseYaw() + (side === 0 ? 0 : Math.PI); }

  function regionAt(ray) {
    const p = E.hitY(ray, 0.15);
    if (!p) return null;
    const [x, , z] = p;
    if (x > 6.1 && x < 7.4 && Math.abs(z) < 5) return OFF;
    if (Math.abs(x) <= 0.5 && Math.abs(z) < 5) return BAR;
    if (Math.abs(z) < 0.45 || Math.abs(z) > 5.05) return 'dice';
    for (let i = 0; i < 24; i++) if (Math.abs(x - pointX(i)) <= PW / 2 && (z > 0) === (i <= 11)) return i;
    return null;
  }
  function click(r) {
    if (api.blocked || E.busy) return;
    if (phase === 'opening') { rollOpening(); return; }
    if (phase === 'roll' && isHuman(side)) { rollTurn(); return; }
    if (phase !== 'move' || !isHuman(side)) return;
    const next = allowedNext();
    if (r == null || r === 'dice') { if (!s.bar[side]) { srcSel = null; refreshGlows(); } return; }
    if (srcSel != null) {
      let cands = next.filter((m) => m.from === srcSel && m.to === r);
      if (cands.length) { cands.sort((a, b) => a.die - b.die); humanMove(cands[0]); return; }
    }
    if (next.some((m) => m.from === r)) { srcSel = r; api.sfx('select'); }
    else if (r !== OFF) { if (s.bar[side]) { api.toast('ÖNCE KIRIK PULU GİR'); api.sfx('error'); } else { srcSel = null; } }
    refreshGlows();
  }
  E.onPick = (ray) => click(regionAt(ray));
  const onKey = (e) => {
    if (api.blocked) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (phase === 'opening') rollOpening(); else if (phase === 'roll' && isHuman(side)) rollTurn(); }
    else if (e.code === 'KeyZ' || e.code === 'Backspace') undo();
  };
  window.addEventListener('keydown', onKey);

  const { els } = controlBar(stage, [
    { label: 'ZAR AT', primary: true, fn: () => { if (phase === 'opening') rollOpening(); else if (phase === 'roll' && isHuman(side)) rollTurn(); else api.sfx('error'); } },
    { label: 'GERİ AL', fn: undo },
    { label: 'KAMERA', title: 'Kamerayı sıfırla', fn: () => { unfit.refit(); if (two && settings.flip && side === 1) E.cam.yaw += Math.PI; } },
  ]);
  const rollBtn = els[0];
  const offFrame = E.onFrame(() => {
    const can = phase === 'opening' || (phase === 'roll' && isHuman(side));
    if (rollBtn.disabled === can) rollBtn.disabled = !can;
  });
  const offSet = onSetting((k, v) => { if (k === 'pixel3d') E.setPixel(v); });

  syncAll(); status(); refreshGlows();
  if (window.__retroDebug) window.__tavla = { info: () => ({ s, side, phase, dv, played, next: allowedNext(), srcSel, match }), pointX, slot, set(ns, sd) { token++; s = ns; side = sd; phase = 'roll'; dv = []; played = []; valid = []; syncAll(); status(); refreshGlows(); if (!isHuman(side)) setTimeout(() => rollTurn(), 300); } };
  return {
    destroy() { alive = false; token++; offFrame(); offSet(); unfit(); window.removeEventListener('keydown', onKey); E.destroy(); wrap.remove(); },
  };
}
