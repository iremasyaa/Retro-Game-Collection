import { create3D, material } from '../../gl/engine.js';
import { lathe, torus, cylinder, merge } from '../../gl/geo.js';
import { qaxis, ease } from '../../gl/math.js';
import { onSetting, settings } from '../../core/store.js';
import { runAI } from '../../core/ai.js';
import { buildBoard, markers, sqPos, posSq, controlBar, view3d, autoFit } from '../board3d.js';
import { initialBoard, genMoves, applyMove, key, RED, WHITE } from './rules.js';
import { chooseMove } from './ai.js';

const PIECE = lathe([[0, 0], [0.37, 0], [0.41, 0.035], [0.41, 0.125], [0.37, 0.16], [0.3, 0.16], [0.27, 0.135], [0.2, 0.135], [0.18, 0.155], [0, 0.155]], 18);
const CROWN = merge([
  { geo: torus(0.2, 0.035, 14, 5), t: { pos: [0, 0.33, 0] } },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ geo: cylinder(0.0, 0.05, 0.13, 4), t: { pos: [Math.cos(i * 1.047) * 0.2, 0.33, Math.sin(i * 1.047) * 0.2] } })),
]);
const NAMES = { [RED]: 'KIRMIZI', [WHITE]: 'BEYAZ' };

export function mount(stage, opts, api) {
  const two = opts.mod === '2p';
  const human = RED;
  const wrap = view3d(stage);
  let E;
  try {
    E = create3D(wrap, { pixel: settings.pixel3d, camera: { target: [0, -0.9, 1.1], pitch: 0.98, dist: 15, yaw: 0, min: { pitch: 0.35, dist: 7 }, max: { pitch: 1.45, dist: 24 } } });
  } catch (err) {
    wrap.textContent = '3D görünüm için WebGL gerekli. Tarayıcın WebGL desteklemiyor.';
    return { destroy() { wrap.remove(); } };
  }
  buildBoard(E);
  const unfit = autoFit(E);
  E.snapCamera();
  const mk = markers(E);
  const matRed = material({ color: '#d8344c', spec: 0.45, shine: 26, rim: 0.35, emissive: '#1a0306' });
  const matWhite = material({ color: '#efe4cc', spec: 0.4, shine: 26, rim: 0.25 });
  const matGold = material({ color: '#ffc845', spec: 0.8, shine: 40, emissive: '#3a2400' });

  let b = initialBoard(), side = RED, nodes = new Array(64).fill(null);
  let history = [], reps = new Map(), quiet = 0, over = false, thinking = false, token = 0;
  let sel = -1, partial = [], hoverSq = -1, cursor = 52, showCursor = false, lastMove = null;
  const captured = { [RED]: 0, [WHITE]: 0 };
  const trays = new E.Node(); E.scene.add(trays);

  function makePiece(p) {
    const g = new E.Node();
    const disc = E.node(PIECE, p > 0 ? matRed : matWhite);
    disc.castShadow = true;
    g.add(disc);
    if (Math.abs(p) === 2) addKing(g, p);
    E.scene.add(g);
    return g;
  }
  function addKing(g, p) {
    const d2 = E.node(PIECE, p > 0 ? matRed : matWhite); d2.pos = [0, 0.16, 0]; d2.castShadow = true;
    const cr = E.node(CROWN, matGold); cr.pos = [0, 0, 0]; cr.castShadow = true;
    g.add(d2, cr);
    g.data.king = true;
  }
  function syncAll() {
    nodes.forEach((n) => n && E.scene.remove(n));
    nodes = new Array(64).fill(null);
    for (let sq = 0; sq < 64; sq++) if (b[sq]) { const n = makePiece(b[sq]); n.pos = sqPos(sq); nodes[sq] = n; }
    trays.children.slice().forEach((c) => trays.remove(c));
    captured[RED] = captured[WHITE] = 0;
    const count = (s) => b.filter((p) => p * s > 0).length;
    for (let i = 0; i < 12 - count(RED); i++) trayAdd(RED, true);
    for (let i = 0; i < 12 - count(WHITE); i++) trayAdd(WHITE, true);
  }
  function trayPos(color, k) {
    const x = color === RED ? -5.85 : 5.85;
    return [x, 0.0 + Math.floor(k / 6) * 0.16, (color === RED ? -1 : 1) * (2.6 - (k % 6) * 0.9)];
  }
  function trayAdd(color, instant, node) {
    const k = captured[color]++;
    const n = node || makePiece(color);
    trays.add(n);
    const p = trayPos(color, k);
    if (instant) n.pos = p;
    return [n, p];
  }

  const isHumanTurn = () => !over && !thinking && (two || side === human);
  function status() {
    const cnt = (s) => b.filter((p) => p * s > 0).length;
    const who = two ? NAMES[side] : side === human ? 'SEN' : 'BİLGİSAYAR';
    api.status([
      ['SIRA', over ? '-' : thinking ? 'DÜŞÜNÜYOR…' : who, side === RED ? '#ff6b80' : '#efe4cc'],
      ['KIRMIZI', cnt(RED), '#ff6b80'],
      ['BEYAZ', cnt(WHITE), '#efe4cc'],
    ]);
  }

  function legal() { return over ? [] : genMoves(b, side); }
  function refreshMarks() {
    const list = [];
    if (lastMove) { list.push({ sq: lastMove.from, kind: 'last' }); list.push({ sq: lastMove.path[lastMove.path.length - 1], kind: 'last' }); }
    if (isHumanTurn()) {
      const ms = legal();
      const cur = sel >= 0 ? (partial.length ? partial[partial.length - 1] : sel) : -1;
      if (sel >= 0) {
        list.push({ sq: cur, kind: 'select', y: 0.02 });
        for (const m of ms) if (m.from === sel && prefixOk(m)) {
          const nxt = m.path[partial.length];
          if (nxt != null) list.push({ sq: nxt, kind: m.caps.length ? 'capture' : 'target' });
        }
      } else if (ms.length && ms[0].caps.length) {
        const froms = new Set(ms.map((m) => m.from));
        froms.forEach((sq) => list.push({ sq, kind: 'movable' }));
      }
      if (hoverSq >= 0) list.push({ sq: hoverSq, kind: 'hover' });
      if (showCursor) list.push({ sq: cursor, kind: 'cursor', y: 0.03 });
    }
    mk.set(list);
  }
  const prefixOk = (m) => partial.every((sq, i) => m.path[i] === sq);

  function clickSquare(sq) {
    if (!isHumanTurn() || api.blocked || E.busy) return;
    const ms = legal();
    if (sq < 0) { sel = -1; partial = []; refreshMarks(); return; }
    if (sel >= 0) {
      const cands = ms.filter((m) => m.from === sel && prefixOk(m) && m.path[partial.length] === sq);
      if (cands.length) {
        const done = cands.find((m) => m.path.length === partial.length + 1);
        const fromSq = partial.length ? partial[partial.length - 1] : sel;
        partial.push(sq);
        if (done && cands.length === 1) { const m = done; sel = -1; partial = []; playMove(m, fromSq); return; }
        animateHop(fromSq, sq, cands[0].caps[partial.length - 1], () => refreshMarks());
        api.sfx('capture');
        refreshMarks();
        return;
      }
      if (partial.length) { api.sfx('error'); return; }
    }
    if (b[sq] * side > 0) {
      if (ms.some((m) => m.from === sq)) { sel = sq; partial = []; api.sfx('select'); }
      else { api.sfx('error'); if (ms.length && ms[0].caps.length) api.toast('YEMEK ZORUNLU!'); sel = -1; }
    } else { sel = -1; }
    refreshMarks();
  }

  function animateHop(from, to, capSq, done) {
    const n = nodes[from];
    if (!n) { done && done(); return; }
    const [x0, , z0] = sqPos(from), [x1, , z1] = sqPos(to);
    const jump = capSq != null;
    nodes[to] = n; nodes[from] = null;
    E.tween(jump ? 0.32 : 0.24, (t) => { n.pos = [x0 + (x1 - x0) * t, Math.sin(Math.PI * t) * (jump ? 0.7 : 0.25), z0 + (z1 - z0) * t]; }, {
      ease: ease.inOut,
      done: () => {
        if (jump) removeCaptured(capSq);
        done && done();
      },
    });
  }
  function removeCaptured(sq) {
    const n = nodes[sq];
    if (!n) return;
    nodes[sq] = null;
    const color = b[sq] > 0 ? RED : WHITE;
    E.scene.remove(n);
    const [tn, p] = trayAdd(color, false, n);
    const s = n.pos.slice();
    E.tween(0.45, (t) => { tn.pos = [s[0] + (p[0] - s[0]) * t, s[1] + Math.sin(Math.PI * t) * 1.2 + (p[1] - s[1]) * t, s[2] + (p[2] - s[2]) * t]; }, { ease: ease.inOut });
  }

  function playMove(m, fromStep) {
    const startIdx = m.path.indexOf(fromStep) + 1;
    const steps = [];
    let prev = fromStep;
    for (let i = startIdx; i < m.path.length; i++) { steps.push([prev, m.path[i], m.caps.length ? m.caps[i] : null]); prev = m.path[i]; }
    const run = (k) => {
      if (k >= steps.length) { finishMove(m); return; }
      const [a, c, cap] = steps[k];
      api.sfx(cap != null ? 'capture' : 'move');
      animateHop(a, c, cap, () => run(k + 1));
    };
    thinking = false;
    run(0);
  }

  function finishMove(m) {
    history.push({ b: b.slice(), side, quiet, lastMove });
    const wasMan = Math.abs(b[m.from]) === 1;
    b = applyMove(b, m);
    const to = m.path[m.path.length - 1];
    if (m.promote) { addKing(nodes[to], b[to]); api.sfx('power'); api.toast('DAMA!'); }
    quiet = m.caps.length || m.promote || wasMan ? 0 : quiet + 1;
    lastMove = m;
    side = -side;
    const k = key(b, side);
    reps.set(k, (reps.get(k) || 0) + 1);
    sel = -1; partial = [];
    if (checkEnd()) return;
    status(); refreshMarks();
    flipCamera();
    if (!two && side !== human) aiTurn();
  }

  function checkEnd() {
    const ms = genMoves(b, side);
    let res = null;
    if (!ms.length) res = { winner: -side };
    else if (quiet >= 80) res = { draw: '40 hamledir taş alınmadı' };
    else if ((reps.get(key(b, side)) || 0) >= 3) res = { draw: 'Aynı pozisyon üç kez tekrarlandı' };
    if (!res) return false;
    over = true;
    status(); refreshMarks();
    setTimeout(() => {
      if (res.draw) { api.sfx('draw'); api.gameOver({ title: 'BERABERE', text: res.draw + '.' }); return; }
      const w = res.winner;
      if (two) { api.sfx('win'); api.gameOver({ title: NAMES[w] + ' KAZANDI', cls: 'win', text: 'Rakibin hamle yapacak taşı kalmadı.' }); }
      else if (w === human) { api.sfx('win'); api.gameOver({ title: 'KAZANDIN!', cls: 'win', text: 'Bilgisayarın hamle yapacak taşı kalmadı.' }); }
      else { api.sfx('lose'); api.gameOver({ title: 'KAYBETTİN', cls: 'lose', text: 'Hamle yapacak taşın kalmadı.' }); }
    }, 700);
    return true;
  }

  async function aiTurn() {
    thinking = true; status(); refreshMarks();
    const my = ++token;
    const level = opts.zorluk || 'orta';
    const t0 = performance.now();
    const m = await runAI('dama', [b, side, level], () => chooseMove(b, side, level));
    const wait = Math.max(0, 450 - (performance.now() - t0));
    setTimeout(() => {
      if (my !== token || over) return;
      if (!m) { thinking = false; checkEnd(); return; }
      waitIdle(() => { if (my === token) playMove(m, m.from); });
    }, wait);
  }
  function waitIdle(fn) { if (api.blocked || E.busy) setTimeout(() => waitIdle(fn), 120); else fn(); }

  function flipCamera() {
    if (!two || !settings.flip) return;
    E.cam.yaw = side === RED ? 0 : Math.PI;
  }

  function undo() {
    if (thinking || E.busy || !history.length) { api.sfx('error'); return; }
    let steps = two ? 1 : (side === human ? 2 : 1);
    if (steps > history.length) steps = history.length;
    if (!two && history.length < 2 && side === human) { api.sfx('error'); return; }
    for (let i = 0; i < steps; i++) {
      const hst = history.pop();
      const k = key(b, side); reps.set(k, Math.max(0, (reps.get(k) || 1) - 1));
      b = hst.b; side = hst.side; quiet = hst.quiet; lastMove = hst.lastMove;
    }
    over = false; sel = -1; partial = []; token++;
    syncAll(); status(); refreshMarks(); flipCamera();
    api.sfx('back');
  }

  E.onPick = (ray) => {
    if (!isHumanTurn() || api.blocked) return;
    showCursor = false;
    let best = -1, bestT = Infinity;
    for (let sq = 0; sq < 64; sq++) {
      if (!nodes[sq]) continue;
      const [x, , z] = sqPos(sq);
      const hgt = nodes[sq].data.king ? 0.45 : 0.18;
      const t = E.hitCyl(ray, x, z, 0.42, 0, hgt);
      if (t > 0 && t < bestT) { bestT = t; best = sq; }
    }
    const sq = best >= 0 && b[best] * side > 0 && partial.length === 0 ? best : posSq(E.hitY(ray, 0));
    clickSquare(sq);
  };
  E.onHover = (ray) => {
    const sq = ray ? posSq(E.hitY(ray, 0)) : -1;
    if (sq !== hoverSq) { hoverSq = sq; refreshMarks(); }
  };
  const onKey = (e) => {
    if (api.blocked) return;
    const r = cursor >> 3, c = cursor & 7;
    const flip = E.cam.yaw > Math.PI / 2 && E.cam.yaw < Math.PI * 1.5;
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (d) {
      e.preventDefault();
      const dr = flip ? -d[0] : d[0], dc = flip ? -d[1] : d[1];
      cursor = Math.max(0, Math.min(7, r + dr)) * 8 + Math.max(0, Math.min(7, c + dc));
      showCursor = true; api.sfx('nav'); refreshMarks();
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCursor = true; clickSquare(cursor); }
    else if (e.code === 'KeyZ' || e.code === 'Backspace') undo();
  };
  window.addEventListener('keydown', onKey);

  controlBar(stage, [
    { label: 'GERİ AL', fn: undo },
    { label: 'KAMERA', title: 'Kamerayı sıfırla', fn: () => { E.cam.yaw = (two && settings.flip && side === WHITE) ? Math.PI : 0; E.cam.pitch = 0.98; unfit.refit(); } },
  ]);
  const offSet = onSetting((k, v) => { if (k === 'pixel3d') E.setPixel(v); });

  syncAll(); status(); refreshMarks();
  if (two && settings.flip && side === WHITE) E.cam.yaw = Math.PI;
  if (window.__retroDebug) window.__dama = { set(nb, sd) { token++; b = nb.slice(); side = sd; over = false; history = []; reps = new Map(); syncAll(); status(); refreshMarks(); if (!two && side !== human) aiTurn(); }, info: () => ({ b, side, over, thinking }) };
  return {
    destroy() { token++; offSet(); unfit(); window.removeEventListener('keydown', onKey); E.destroy(); wrap.remove(); },
  };
}
