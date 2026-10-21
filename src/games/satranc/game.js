import { create3D, material } from '../../gl/engine.js';
import { ease } from '../../gl/math.js';
import { h, css } from '../../core/dom.js';
import { onSetting, settings } from '../../core/store.js';
import { runAI } from '../../core/ai.js';
import { buildBoard, markers, sqPos, posSq, controlBar, view3d, autoFit } from '../board3d.js';
import { GEO, HEIGHT } from './pieces.js';
import { newGame, result, legalMoves, san, play, takeBack, inCheck, bestMove, serialize, to64, from64, WHITE, BLACK, P, N, B, R, Q, K } from './engine.js';

const NAMES = { [WHITE]: 'BEYAZ', [BLACK]: 'SİYAH' };
css('satranc', `
.mv-list { position: absolute; right: max(16px, env(safe-area-inset-right, 0px)); top: 14px; width: 210px; max-height: calc(100% - 96px); overflow-y: auto;
  display: grid; grid-template-columns: 40px 1fr 1fr; gap: 4px 8px; align-content: start; padding: 12px 12px 10px; box-sizing: border-box;
  background: rgba(14,11,31,.82); font: 400 24px/1.1 var(--font); color: var(--ink); z-index: 5;
  box-shadow: 0 -4px 0 0 var(--line), 0 4px 0 0 var(--line), -4px 0 0 0 var(--line), 4px 0 0 0 var(--line); }
.mv-list .n { color: var(--muted); }
.mv-list .last { color: var(--amber); }
.mv-list h4 { grid-column: 1 / -1; margin: 0 0 4px; font: 700 24px/1 var(--font); color: var(--cyan); letter-spacing: 1px; }
@media (max-width: 900px) { .mv-list { display: none; } }
`);

export function mount(stage, opts, api) {
  const two = opts.mod === '2p';
  const human = WHITE;
  const level = opts.zorluk || 'orta';
  const wrap = view3d(stage);
  let E;
  try {
    E = create3D(wrap, { pixel: settings.pixel3d, camera: { target: [0, -0.7, 1.0], pitch: 0.92, dist: 15, yaw: 0, min: { pitch: 0.3, dist: 7 }, max: { pitch: 1.45, dist: 24 } } });
  } catch (err) {
    wrap.textContent = '3D görünüm için WebGL gerekli. Tarayıcın WebGL desteklemiyor.';
    return { destroy() { wrap.remove(); } };
  }
  buildBoard(E);
  const unfit = autoFit(E);
  E.snapCamera();
  const mk = markers(E);
  const matW = material({ color: '#e4d8c2', spec: 0.45, shine: 28, rim: 0.3 });
  const matB = material({ color: '#3b3152', spec: 0.65, shine: 36, rim: 0.6, emissive: '#0b0614' });

  const st = newGame();
  let alive = true;
  let nodes = new Array(64).fill(null);
  let legal = [], sel = -1, hoverSq = -1, cursor = 52, showCursor = false, over = false, thinking = false, token = 0, choosing = false;
  const sans = [];
  const trays = new E.Node(); E.scene.add(trays);
  const list = h('div', { class: 'mv-list', 'aria-label': 'Hamle listesi' });
  stage.append(list);

  function makePiece(p) {
    const n = E.node(GEO[Math.abs(p)], p > 0 ? matW : matB);
    n.castShadow = true;
    n.rot = [0, 0, 0, 1];
    n.data.type = Math.abs(p);
    E.scene.add(n);
    return n;
  }
  function trayPos(color, k) {
    const side = color === WHITE ? -1 : 1;
    return [side * (5.75 + (k >= 8 ? 0.75 : 0)), 0, side * (3.2 - (k % 8) * 0.88)];
  }
  function syncAll() {
    nodes.forEach((n) => n && E.scene.remove(n));
    nodes = new Array(64).fill(null);
    for (let i = 0; i < 64; i++) { const p = st.b[from64(i)]; if (p) { const n = makePiece(p); n.pos = sqPos(i); nodes[i] = n; } }
    trays.children.slice().forEach((c) => trays.remove(c));
    const cnt = { [WHITE]: 0, [BLACK]: 0 };
    for (const { m } of st.hist) if (m.cap) { const color = m.cap > 0 ? WHITE : BLACK; const n = makePiece(m.cap); trays.add(n); n.pos = trayPos(color, cnt[color]++); n.scl = [0.72, 0.72, 0.72]; }
  }
  function capturedCount(color) { let c = 0; for (const { m } of st.hist) if (m.cap && (m.cap > 0 ? WHITE : BLACK) === color) c++; return c; }

  const isHumanTurn = () => !over && !thinking && !choosing && (two || st.side === human);
  function status() {
    const who = two ? NAMES[st.side] : st.side === human ? 'SEN' : 'BİLGİSAYAR';
    const parts = [['SIRA', over ? '-' : thinking ? 'DÜŞÜNÜYOR…' : who, st.side === WHITE ? '#efe6d2' : '#b9a6ff']];
    if (!over && inCheck(st)) parts.push(['', 'ŞAH!', '#ff4f6a']);
    if (sans.length) parts.push(['SON', sans[sans.length - 1]]);
    api.status(parts);
  }
  function renderList() {
    list.innerHTML = '';
    list.append(h('h4', null, 'HAMLELER'));
    for (let i = 0; i < sans.length; i += 2) {
      list.append(h('span', { class: 'n' }, i / 2 + 1 + '.'), h('span', { class: i === sans.length - 1 ? 'last' : '' }, sans[i]), h('span', { class: i + 1 === sans.length - 1 ? 'last' : '' }, sans[i + 1] || ''));
    }
    list.scrollTop = list.scrollHeight;
  }

  function refreshMarks() {
    const L = [];
    const lm = st.hist.length ? st.hist[st.hist.length - 1].m : null;
    if (lm) { L.push({ sq: to64(lm.from), kind: 'last' }); L.push({ sq: to64(lm.to), kind: 'last' }); }
    if (!over && inCheck(st)) L.push({ sq: to64(st.side > 0 ? st.kw : st.kb), kind: 'check', y: 0.02 });
    if (isHumanTurn()) {
      if (sel >= 0) {
        L.push({ sq: sel, kind: 'select', y: 0.02 });
        const seen = new Set();
        for (const m of legal) if (to64(m.from) === sel && !seen.has(m.to)) { seen.add(m.to); L.push({ sq: to64(m.to), kind: m.cap ? 'capture' : 'target' }); }
      }
      if (hoverSq >= 0) L.push({ sq: hoverSq, kind: 'hover' });
      if (showCursor) L.push({ sq: cursor, kind: 'cursor', y: 0.03 });
    }
    mk.set(L);
  }

  function newTurn() {
    const r = result(st);
    legal = r.over ? [] : r.moves;
    status(); refreshMarks();
    if (r.over) { endGame(r); return; }
    if (inCheck(st)) { api.sfx('check'); api.toast('ŞAH!'); }
    flipCamera();
    if (!two && st.side !== human) aiTurn();
  }

  function clickSquare(i) {
    if (!isHumanTurn() || api.blocked || E.busy) return;
    if (i < 0) { sel = -1; refreshMarks(); return; }
    const p = st.b[from64(i)];
    if (sel >= 0) {
      const ms = legal.filter((m) => to64(m.from) === sel && to64(m.to) === i);
      if (ms.length) {
        sel = -1;
        if (ms.length > 1) choosePromotion(ms);
        else doMove(ms[0]);
        return;
      }
    }
    if (p && (p > 0) === (st.side > 0)) {
      if (legal.some((m) => to64(m.from) === i)) { sel = i; api.sfx('select'); }
      else { sel = -1; api.sfx('error'); if (inCheck(st)) api.toast('ŞAHINI KORU!'); }
    } else sel = -1;
    refreshMarks();
  }

  function choosePromotion(ms) {
    choosing = true;
    const pick = (t) => { choosing = false; api.closeOverlay(); doMove(ms.find((m) => Math.abs(m.promo) === t)); };
    api.overlay({
      title: 'TERFİ', text: 'Piyonun neye dönüşsün?', closable: false,
      buttons: [{ label: 'VEZİR', primary: true, fn: () => pick(Q) }, { label: 'KALE', fn: () => pick(R) }, { label: 'FİL', fn: () => pick(B) }, { label: 'AT', fn: () => pick(N) }],
    });
  }

  function slide(n, from, to, { dur = 0.32, arc = 0.18, done } = {}) {
    const [x0, , z0] = sqPos(from), [x1, , z1] = sqPos(to);
    E.tween(dur, (t) => { n.pos = [x0 + (x1 - x0) * t, Math.sin(Math.PI * t) * arc, z0 + (z1 - z0) * t]; }, { ease: ease.inOut, done });
  }
  function toTray(n, color) {
    const k = capturedCount(color);
    E.scene.remove(n); trays.add(n);
    const s = n.pos.slice(), p = trayPos(color, k);
    E.tween(0.5, (t) => {
      n.pos = [s[0] + (p[0] - s[0]) * t, s[1] + Math.sin(Math.PI * t) * 1.5, s[2] + (p[2] - s[2]) * t];
      const sc = 1 - 0.28 * t; n.scl = [sc, sc, sc];
    }, { ease: ease.inOut });
  }

  function doMove(m) {
    thinking = false;
    const text = san(st, m, legal);
    const f = to64(m.from), t = to64(m.to);
    const n = nodes[f];
    let victimSq = m.cap ? (m.flag === 1 ? to64(m.to + (st.side > 0 ? 16 : -16)) : t) : -1;
    const victim = victimSq >= 0 ? nodes[victimSq] : null;
    const capColor = m.cap ? (m.cap > 0 ? WHITE : BLACK) : 0;
    nodes[f] = null;
    if (victimSq >= 0) nodes[victimSq] = null;
    nodes[t] = n;
    if (m.flag === 2 || m.flag === 3) {
      const rf = to64(m.flag === 2 ? m.to + 1 : m.to - 2), rt = to64(m.flag === 2 ? m.to - 1 : m.to + 1);
      const rn = nodes[rf]; nodes[rf] = null; nodes[rt] = rn;
      if (rn) setTimeout(() => slide(rn, rf, rt, { dur: 0.3, arc: 0.6 }), 120);
    }
    play(st, m);
    sans.push(text);
    renderList();
    api.sfx(m.cap ? 'capture' : m.flag >= 2 && m.flag <= 3 ? 'place' : 'move');
    const knight = Math.abs(m.piece) === N;
    if (n) slide(n, f, t, {
      dur: knight ? 0.42 : 0.32, arc: knight ? 0.9 : 0.18,
      done: () => {
        if (m.promo && n) { n.mesh = E.mesh(GEO[Math.abs(m.promo)]); n.data.type = Math.abs(m.promo); api.sfx('power'); }
      },
    });
    if (victim) setTimeout(() => toTray(victim, capColor), 140);
    sel = -1;
    const my = token;
    setTimeout(() => { if (my === token && alive) newTurn(); }, 360);
  }

  async function aiTurn() {
    thinking = true; status(); refreshMarks();
    const my = ++token;
    const t0 = performance.now();
    let m = await runAI('satranc', [serialize(st), level], () => bestMove(st, level));
    if (my !== token || over) return;
    const wait = Math.max(0, 500 - (performance.now() - t0));
    setTimeout(() => {
      if (my !== token || over) return;
      if (!m) { thinking = false; status(); return; }
      const match = legal.find((x) => x.from === m.from && x.to === m.to && (x.promo || 0) === (m.promo || 0));
      if (!match) { thinking = false; status(); return; }
      waitIdle(() => { if (my === token) doMove(match); });
    }, wait);
  }
  function waitIdle(fn) { if (api.blocked || E.busy) setTimeout(() => waitIdle(fn), 120); else fn(); }

  function endGame(r) {
    over = true; thinking = false;
    status(); refreshMarks();
    const texts = {
      pat: ['PAT', 'Yasal hamle kalmadı ama şah tehdit altında değil. Berabere.'],
      50: ['BERABERE', '50 hamle boyunca taş alınmadı ve piyon oynanmadı.'],
      tekrar: ['BERABERE', 'Aynı pozisyon üç kez tekrarlandı.'],
      malzeme: ['BERABERE', 'Mat edecek kadar taş kalmadı.'],
    };
    setTimeout(() => {
      const stats = [['HAMLE', Math.ceil(sans.length / 2)]];
      if (r.kind !== 'mat') { api.sfx('draw'); const [t, x] = texts[r.kind]; api.gameOver({ title: t, text: x, stats }); return; }
      if (two) { api.sfx('win'); api.gameOver({ title: 'ŞAH MAT!', cls: 'win', text: NAMES[r.winner] + ' kazandı.', stats }); }
      else if (r.winner === human) { api.sfx('win'); api.gameOver({ title: 'ŞAH MAT!', cls: 'win', text: 'Tebrikler, bilgisayarı yendin.', stats }); }
      else { api.sfx('lose'); api.gameOver({ title: 'ŞAH MAT', cls: 'lose', text: 'Bilgisayar kazandı. Bir daha dene!', stats }); }
    }, 900);
  }

  function flipCamera() { if (two && settings.flip) E.cam.yaw = st.side === WHITE ? 0 : Math.PI; }

  function undo() {
    if (thinking || E.busy || choosing) { api.sfx('error'); return; }
    let n = two ? 1 : st.side === human ? 2 : 1;
    if (st.hist.length < n) { api.sfx('error'); return; }
    for (let i = 0; i < n; i++) { takeBack(st); sans.pop(); }
    over = false; sel = -1; token++;
    syncAll(); renderList();
    const r = result(st); legal = r.over ? [] : r.moves;
    status(); refreshMarks(); flipCamera();
    api.sfx('back');
  }

  E.onPick = (ray) => {
    if (!isHumanTurn() || api.blocked) return;
    showCursor = false;
    let best = -1, bestT = Infinity;
    for (let i = 0; i < 64; i++) {
      const n = nodes[i];
      if (!n) continue;
      const [x, , z] = sqPos(i);
      const t = E.hitCyl(ray, x, z, 0.36, 0, HEIGHT[n.data.type] || 0.8);
      if (t > 0 && t < bestT) { bestT = t; best = i; }
    }
    const own = best >= 0 && (st.b[from64(best)] > 0) === (st.side > 0);
    let sq = posSq(E.hitY(ray, 0));
    if (best >= 0 && (own || (sel >= 0 && legal.some((m) => to64(m.from) === sel && to64(m.to) === best)))) sq = best;
    clickSquare(sq);
  };
  E.onHover = (ray) => { const sq = ray ? posSq(E.hitY(ray, 0)) : -1; if (sq !== hoverSq) { hoverSq = sq; refreshMarks(); } };
  const onKey = (e) => {
    if (api.blocked) return;
    const r = cursor >> 3, c = cursor & 7;
    const flip = Math.cos(E.cam.yaw) < 0;
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
    { label: 'KAMERA', title: 'Kamerayı sıfırla', fn: () => { E.cam.yaw = two && settings.flip && st.side === BLACK ? Math.PI : 0; E.cam.pitch = 0.92; unfit.refit(); } },
  ]);
  const offSet = onSetting((k, v) => { if (k === 'pixel3d') E.setPixel(v); });

  syncAll(); renderList();
  newTurn();
  if (window.__retroDebug) window.__chess = {
    fen(f) { token++; const g = newGame(f); Object.assign(st, g); sans.length = 0; over = false; thinking = false; syncAll(); renderList(); newTurn(); },
    info: () => ({ side: st.side, over, thinking, hist: st.hist.length, sans: sans.slice() }),
  };
  return {
    destroy() { alive = false; token++; offSet(); unfit(); window.removeEventListener('keydown', onKey); E.destroy(); wrap.remove(); list.remove(); },
  };
}
