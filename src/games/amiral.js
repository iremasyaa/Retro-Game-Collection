import { h, css } from '../core/dom.js';
import { text, isTouch } from '../core/gfx.js';
import { N, SHIPS, newPlayer, cellsFor, canPlace, placeShip, removeShip, randomFleet, aiPick } from './amiral-ai.js';

const CS = 24, OFF = 18, SIZE = OFF + N * CS + 4;
const LETTERS = 'ABCDEFGHIJ';

css('amiral', `
.ab-root { width: 100%; height: 100%; display: flex; align-items: center; justify-content: safe center; gap: 24px 28px; flex-wrap: wrap; align-content: safe center; overflow-y: auto; }
.ab-col { display: flex; flex-direction: column; gap: 10px; align-items: center; min-width: 0; }
.ab-title { font: 700 24px/1 var(--font); letter-spacing: 1px; color: var(--muted); }
.ab-title.on { color: var(--amber); }
.ab-col canvas { image-rendering: pixelated; touch-action: none; }
.ab-panel { display: flex; flex-direction: column; gap: 12px; width: min(320px, 100%); }
.ab-ship { --fc: var(--line); display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px 8px; border: 0; cursor: pointer; text-align: left;
  background: var(--panel-2); color: var(--ink); font: 700 24px/1 var(--font);
  box-shadow: 0 -4px 0 0 var(--fc), 0 4px 0 0 var(--fc), -4px 0 0 0 var(--fc), 4px 0 0 0 var(--fc); }
.ab-ship .len { display: inline-flex; gap: 3px; }
.ab-ship .len i { width: 12px; height: 12px; background: #9a96bf; display: block; }
.ab-ship.sel { --fc: var(--cyan); background: #23406a; }
.ab-ship.done { color: var(--muted); }
.ab-ship.done .len i { background: var(--lime); }
.ab-ship:focus-visible { outline: none; --fc: var(--amber); }
.ab-btns { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.ab-hint { color: var(--muted); font-size: 24px; line-height: 1.15; }
@media (max-width: 560px) {
  .ab-panel { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ab-ship { padding: 8px 8px 6px; font-size: 12px; }
  .ab-ship .len i { width: 7px; height: 7px; }
  .ab-btns, .ab-panel > .btn, .ab-hint { grid-column: 1 / -1; }
  .ab-btns { margin-top: 0; justify-content: center; }
  .ab-hint { display: none; }
}
`);

export function mount(stage, opts, api) {
  const two = opts.mod === '2p';
  const level = opts.zorluk || 'orta';
  const P = [newPlayer(), newPlayer()];
  const names = two ? ['1. OYUNCU', '2. OYUNCU'] : ['SEN', 'BİLGİSAYAR'];
  let phase = 'place', placer = 0, turn = 0, busy = false, over = false;
  let sel = 0, horiz = true, hover = -1;
  const fx = [];
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

  const root = h('div', { class: 'ab-root' });
  const mk = () => { const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE; return c; };
  const cvL = mk(), cvR = mk();
  const gL = cvL.getContext('2d'), gR = cvR.getContext('2d');
  const titleL = h('div', { class: 'ab-title' }), titleR = h('div', { class: 'ab-title' });
  const colL = h('div', { class: 'ab-col' }, titleL, cvL);
  const colR = h('div', { class: 'ab-col' }, titleR, cvR);
  const panel = h('div', { class: 'ab-panel' });
  root.append(colL, colR, panel);
  stage.append(root);

  function size() {
    const sw = stage.clientWidth - 32, sh = stage.clientHeight - 24;
    const portrait = sh > sw * 1.1;
    let s;
    if (phase === 'place') s = portrait ? Math.min(sw, sh - (panel.offsetHeight || 300) - 70) : Math.min(sw - 380, sh - 60);
    else s = portrait ? Math.min(sw, (sh - 100) / 2) : Math.min((sw - 48) / 2, sh - 60);
    s = Math.max(200, Math.floor(s));
    const k = Math.floor(s / SIZE);
    if (k >= 1 && k * SIZE / s > 0.85) s = k * SIZE;
    for (const c of [cvL, cvR]) { c.style.width = s + 'px'; c.style.height = s + 'px'; }
  }
  const ro = new ResizeObserver(size);
  ro.observe(stage);

  function buildPanel() {
    panel.innerHTML = '';
    const p = P[placer];
    SHIPS.forEach(([name, len], si) => {
      const done = !!p.ships[si];
      const b = h('button', { class: 'ab-ship' + (si === sel ? ' sel' : '') + (done ? ' done' : '') },
        h('span', null, (done ? '✓ ' : '') + name), h('span', { class: 'len' }, Array.from({ length: len }, () => h('i'))));
      b.onclick = () => { sel = si; if (p.ships[si]) { horiz = p.ships[si].horiz; } api.sfx('nav'); buildPanel(); };
      panel.append(b);
    });
    const ready = SHIPS.every((_, si) => p.ships[si]);
    panel.append(
      h('div', { class: 'ab-btns' },
        h('button', { class: 'btn small', onClick: () => { horiz = !horiz; api.sfx('nav'); } }, 'DÖNDÜR'),
        h('button', { class: 'btn small', onClick: () => { randomFleet(p); api.sfx('place'); sel = 0; buildPanel(); } }, 'RASTGELE'),
        h('button', { class: 'btn small', onClick: () => { p.grid.fill(-1); p.ships = []; sel = 0; api.sfx('back'); buildPanel(); } }, 'TEMİZLE')),
      h('button', { class: 'btn primary', disabled: !ready, onClick: finishPlacement }, 'HAZIR ▶'),
      h('div', { class: 'ab-hint' }, isTouch() ? 'Gemiyi seç, haritaya dokun. Yerleşik gemiye dokunursan geri alırsın.' : 'Gemiyi seç, haritaya tıkla. R ya da sağ tık döndürür.'));
  }

  function setPhaseUI() {
    const placing = phase === 'place';
    colR.hidden = placing;
    panel.hidden = !placing;
    if (placing) {
      titleL.textContent = (two ? names[placer] + ' · ' : '') + 'FİLONU YERLEŞTİR';
      titleL.className = 'ab-title on';
      buildPanel();
    } else {
      const me = viewer();
      titleL.textContent = (two ? names[me] + ' FİLOSU' : 'FİLON');
      titleR.textContent = 'RADAR · ' + (two ? names[1 - me] : 'DÜŞMAN');
      titleL.className = 'ab-title'; titleR.className = 'ab-title on';
    }
    size();
    status();
  }
  const viewer = () => (two ? turn : 0);

  function status() {
    if (phase === 'place') { api.status([['YERLEŞTİRME', two ? names[placer] : 'FİLON', '#3ee0ff']]); return; }
    const alive = (p) => p.ships.filter((s) => !s.sunk).length;
    api.status([
      ['SIRA', over ? '-' : names[turn], turn === 0 ? '#7dff6a' : '#ff4fa3'],
      [two ? '1.' : 'FİLON', alive(P[0]) + '/5'],
      [two ? '2.' : 'DÜŞMAN', alive(P[1]) + '/5'],
    ]);
  }

  function finishPlacement() {
    api.sfx('select');
    if (two && placer === 0) {
      phase = 'hide';
      passScreen('1. OYUNCU HAZIR', '2. oyuncu filosunu yerleştirsin. 1. oyuncu bakmasın!', () => { placer = 1; sel = 0; horiz = true; phase = 'place'; setPhaseUI(); });
      return;
    }
    if (!two) randomFleet(P[1]);
    phase = 'battle'; turn = 0;
    if (two) passScreen('SAVAŞ BAŞLIYOR', 'Sıra 1. oyuncuda. 2. oyuncu ekrana bakmasın.', () => setPhaseUI());
    else { setPhaseUI(); api.toast('ATEŞ SERBEST!'); }
  }

  function passScreen(title, msg, then) {
    root.style.visibility = 'hidden';
    api.overlay({
      title, text: msg, closable: false,
      buttons: [{ label: 'HAZIRIM ▶', primary: true, fn: () => { api.closeOverlay(); root.style.visibility = ''; then(); } }],
    });
  }

  function fire(shooter, i) {
    const target = P[1 - shooter];
    if (target.shots[i]) return null;
    const si = target.grid[i];
    if (si >= 0) {
      target.shots[i] = 2;
      const s = target.ships[si];
      s.hits++;
      fx.push({ board: 1 - shooter, i, type: 'boom', t: 0 });
      if (s.hits === s.len) { s.sunk = true; return { hit: true, sunk: s }; }
      return { hit: true };
    }
    target.shots[i] = 1;
    fx.push({ board: 1 - shooter, i, type: 'splash', t: 0 });
    return { hit: false };
  }

  function afterShot(shooter, res) {
    if (res.sunk) { api.sfx('sink'); api.toast(res.sunk.name + ' BATTI!', 1600); }
    else api.sfx(res.hit ? 'hit' : 'splash');
    status();
    if (P[1 - shooter].ships.every((s) => s.sunk)) { endGame(shooter); return true; }
    return false;
  }

  function humanShoot(i) {
    if (busy || over || phase !== 'battle' || api.blocked) return;
    if (!two && turn !== 0) return;
    const shooter = turn;
    const res = fire(shooter, i);
    if (!res) { api.sfx('error'); return; }
    busy = true;
    api.sfx('shoot');
    later(() => {
      if (afterShot(shooter, res)) return;
      later(() => {
        turn = 1 - turn;
        status();
        if (two) {
          phase = 'hide';
          passScreen('SIRA ' + names[turn] + 'DA', 'Ekranı ' + names[turn].toLowerCase() + 'ya ver.', () => { phase = 'battle'; busy = false; setPhaseUI(); });
        } else { aiTurn(); }
      }, res.hit ? 1000 : 750);
    }, 180);
  }

  function aiTurn() {
    later(() => {
      if (over) return;
      if (api.blocked) { aiTurn(); return; }
      const i = aiPick(P[0], level);
      api.sfx('shoot');
      const res = fire(1, i);
      later(() => {
        if (afterShot(1, res)) return;
        later(() => { turn = 0; busy = false; status(); }, 500);
      }, 200);
    }, 650);
  }

  function endGame(winner) {
    over = true; busy = true;
    status();
    later(() => {
      const shotsBy = (s) => P[1 - s].shots.reduce((a, v) => a + (v ? 1 : 0), 0);
      const hitsBy = (s) => P[1 - s].shots.reduce((a, v) => a + (v === 2 ? 1 : 0), 0);
      const acc = (s) => Math.round((100 * hitsBy(s)) / Math.max(1, shotsBy(s))) + '%';
      if (two) {
        api.sfx('win');
        api.gameOver({ title: names[winner] + ' KAZANDI', cls: 'win', stats: [['ATIŞ', shotsBy(winner)], ['İSABET', acc(winner)]] });
      } else {
        api.sfx(winner === 0 ? 'win' : 'lose');
        api.gameOver({ title: winner === 0 ? 'ZAFER!' : 'FİLON BATTI', cls: winner === 0 ? 'win' : 'lose', text: winner === 0 ? 'Düşman filosunun tamamını batırdın.' : 'Bilgisayar bütün gemilerini buldu.', stats: [['ATIŞ', shotsBy(0)], ['İSABET', acc(0)]] });
      }
    }, 1500);
  }

  const cellOf = (cv, e) => {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE, y = ((e.clientY - r.top) / r.height) * SIZE;
    const cx = Math.floor((x - OFF) / CS), cy = Math.floor((y - OFF) / CS);
    return cx >= 0 && cy >= 0 && cx < N && cy < N ? cy * N + cx : -1;
  };
  cvL.addEventListener('contextmenu', (e) => { e.preventDefault(); if (phase === 'place') { horiz = !horiz; api.sfx('nav'); } });
  cvL.addEventListener('pointermove', (e) => { hover = cellOf(cvL, e); });
  cvL.addEventListener('pointerleave', () => { hover = -1; });
  cvL.addEventListener('pointerup', (e) => {
    if (phase !== 'place' || e.button === 2 || api.blocked) return;
    const i = cellOf(cvL, e);
    if (i < 0) return;
    const p = P[placer];
    if (p.grid[i] >= 0) {
      const si = p.grid[i];
      horiz = p.ships[si].horiz; removeShip(p, si); sel = si; api.sfx('back'); buildPanel();
      return;
    }
    if (p.ships[sel]) { const nxt = SHIPS.findIndex((_, k) => !p.ships[k]); if (nxt >= 0) sel = nxt; else return; }
    const cells = cellsFor(i % N, (i / N) | 0, SHIPS[sel][1], horiz);
    if (!canPlace(p, cells)) { api.sfx('error'); return; }
    placeShip(p, sel, cells, horiz);
    api.sfx('place');
    const nxt = SHIPS.findIndex((_, k) => !p.ships[k]);
    if (nxt >= 0) sel = nxt;
    buildPanel();
  });
  let hoverR = -1;
  cvR.addEventListener('pointermove', (e) => { hoverR = cellOf(cvR, e); });
  cvR.addEventListener('pointerleave', () => { hoverR = -1; });
  cvR.addEventListener('pointerup', (e) => { const i = cellOf(cvR, e); if (i >= 0) humanShoot(i); });
  const onKey = (e) => {
    if (api.blocked) return;
    if (e.code === 'KeyR' && phase === 'place') { horiz = !horiz; api.sfx('nav'); }
  };
  window.addEventListener('keydown', onKey);

  let t = 0, last = performance.now(), raf = 0;
  function labels(g, col) {
    for (let k = 0; k < N; k++) {
      text(g, LETTERS[k], OFF + k * CS + CS / 2, 13, { size: 12, color: col, align: 'center' });
      text(g, String(k + 1), OFF - 3, OFF + k * CS + 16, { size: 12, color: col, align: 'right' });
    }
  }
  function drawShip(g, s, alpha = 1, color = '#9a96bf') {
    const x0 = s.cells[0] % N, y0 = (s.cells[0] / N) | 0;
    const px = OFF + x0 * CS, py = OFF + y0 * CS;
    const w = s.horiz ? s.len * CS : CS, hh = s.horiz ? CS : s.len * CS;
    g.globalAlpha = alpha;
    g.fillStyle = '#2b2850'; g.fillRect(px + 3, py + 3, w - 6, hh - 6);
    g.fillStyle = s.sunk ? '#55507a' : color; g.fillRect(px + 4, py + 4, w - 8, hh - 8);
    g.fillStyle = s.sunk ? '#3d3961' : '#c9c5e6';
    if (s.horiz) g.fillRect(px + 6, py + 6, w - 12, 2); else g.fillRect(px + 6, py + 6, 2, hh - 12);
    g.fillStyle = s.sunk ? '#2b2850' : '#5d5390';
    for (let k = 0; k < s.len; k++) {
      const cx = px + (s.horiz ? k * CS : 0) + CS / 2, cy = py + (s.horiz ? 0 : k * CS) + CS / 2;
      g.fillRect(cx - 3, cy - 3, 6, 6);
    }
    g.fillStyle = '#0b2a5a';
    if (s.horiz) { g.fillRect(px + 3, py + 3, 3, 3); g.fillRect(px + 3, py + CS - 6, 3, 3); }
    else { g.fillRect(px + 3, py + 3, 3, 3); g.fillRect(px + CS - 6, py + 3, 3, 3); }
    g.globalAlpha = 1;
  }
  function flame(g, i, phase0) {
    const x = OFF + (i % N) * CS, y = OFF + ((i / N) | 0) * CS;
    const f = Math.floor(t * 10 + phase0) % 3;
    g.fillStyle = '#ff4f6a'; g.fillRect(x + 7, y + 9 - f, 10, 10 + f);
    g.fillStyle = '#ff8a3d'; g.fillRect(x + 9, y + 11 - f, 6, 7 + f);
    g.fillStyle = '#ffc845'; g.fillRect(x + 11, y + 13 - (f % 2), 2, 4);
  }
  function miss(g, i, col) {
    const x = OFF + (i % N) * CS + CS / 2, y = OFF + ((i / N) | 0) * CS + CS / 2;
    g.fillStyle = col;
    g.fillRect(x - 3, y - 1, 6, 2); g.fillRect(x - 1, y - 3, 2, 6);
  }
  function drawFx(g, board) {
    for (const e of fx) {
      if (e.board !== board || e.t > 0.8) continue;
      const x = OFF + (e.i % N) * CS + CS / 2, y = OFF + ((e.i / N) | 0) * CS + CS / 2;
      const r = Math.round(4 + e.t * 22);
      g.strokeStyle = e.type === 'boom' ? 'rgba(255,200,69,' + (1 - e.t / 0.8).toFixed(2) + ')' : 'rgba(243,234,215,' + (1 - e.t / 0.8).toFixed(2) + ')';
      g.lineWidth = 2;
      g.strokeRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function drawOwn(g, pIdx) {
    const p = P[pIdx];
    g.fillStyle = '#0e0b1f'; g.fillRect(0, 0, SIZE, SIZE);
    labels(g, '#7f9fd8');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = OFF + x * CS, py = OFF + y * CS;
      g.fillStyle = (x + y) % 2 ? '#0b2a5a' : '#0d3068'; g.fillRect(px, py, CS, CS);
      const w = (Math.floor(t * 2 + x * 0.7 + y * 1.3)) % 6;
      g.fillStyle = '#1d4c94'; g.fillRect(px + 4 + w * 2, py + 8 + ((x + y) % 3) * 4, 4, 1);
    }
    g.fillStyle = '#174a8a';
    for (let k = 0; k <= N; k++) { g.fillRect(OFF + k * CS, OFF, 1, N * CS); g.fillRect(OFF, OFF + k * CS, N * CS, 1); }
    for (const s of p.ships) if (s) drawShip(g, s);
    if (phase === 'place' && pIdx === placer && hover >= 0 && !p.ships[sel]) {
      const cells = cellsFor(hover % N, (hover / N) | 0, SHIPS[sel][1], horiz);
      const ok = canPlace(p, cells);
      const cl = cells || [hover];
      for (const i of cl) {
        g.fillStyle = ok ? 'rgba(125,255,106,.45)' : 'rgba(255,79,106,.5)';
        g.fillRect(OFF + (i % N) * CS + 2, OFF + ((i / N) | 0) * CS + 2, CS - 4, CS - 4);
      }
    }
    for (let i = 0; i < N * N; i++) {
      if (p.shots[i] === 2) flame(g, i, i);
      else if (p.shots[i] === 1) miss(g, i, '#d9e6ff');
    }
    drawFx(g, pIdx);
  }

  function drawRadar(g, pIdx) {
    const p = P[pIdx];
    g.fillStyle = '#0e0b1f'; g.fillRect(0, 0, SIZE, SIZE);
    labels(g, '#39d26a');
    g.fillStyle = '#03140a'; g.fillRect(OFF, OFF, N * CS, N * CS);
    g.fillStyle = '#0c3b1c';
    for (let k = 0; k <= N; k++) { g.fillRect(OFF + k * CS, OFF, 1, N * CS); g.fillRect(OFF, OFF + k * CS, N * CS, 1); }
    const cx = OFF + (N * CS) / 2, cy = OFF + (N * CS) / 2, R = N * CS * 0.75;
    g.save();
    g.beginPath(); g.rect(OFF, OFF, N * CS, N * CS); g.clip();
    const a0 = t * 1.4;
    for (let k = 0; k < 14; k++) {
      const a = a0 - k * 0.05;
      g.strokeStyle = 'rgba(57,255,106,' + (0.32 * (1 - k / 14)).toFixed(3) + ')';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
    }
    g.strokeStyle = 'rgba(57,255,106,.18)'; g.lineWidth = 1;
    for (const rr of [40, 80, 120]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    for (const s of p.ships) if (s && s.sunk) {
      const x0 = s.cells[0] % N, y0 = (s.cells[0] / N) | 0;
      const w = s.horiz ? s.len * CS : CS, hh = s.horiz ? CS : s.len * CS;
      g.fillStyle = 'rgba(57,255,106,.16)'; g.fillRect(OFF + x0 * CS + 2, OFF + y0 * CS + 2, w - 4, hh - 4);
      g.strokeStyle = '#39ff6a'; g.lineWidth = 2; g.strokeRect(OFF + x0 * CS + 3, OFF + y0 * CS + 3, w - 6, hh - 6);
    }
    for (let i = 0; i < N * N; i++) {
      const x = OFF + (i % N) * CS, y = OFF + ((i / N) | 0) * CS;
      if (p.shots[i] === 2) {
        g.fillStyle = '#ff4f6a';
        for (let k = 0; k < 12; k += 2) { g.fillRect(x + 6 + k, y + 6 + k, 2, 2); g.fillRect(x + 16 - k, y + 6 + k, 2, 2); }
      } else if (p.shots[i] === 1) {
        g.fillStyle = '#2f8f4f'; g.fillRect(x + 10, y + 10, 4, 4);
      }
    }
    if (hoverR >= 0 && phase === 'battle' && !busy && !over && !p.shots[hoverR]) {
      const x = OFF + (hoverR % N) * CS, y = OFF + ((hoverR / N) | 0) * CS;
      g.strokeStyle = Math.floor(t * 4) % 2 ? '#ffc845' : '#39ff6a'; g.lineWidth = 2;
      g.strokeRect(x + 2, y + 2, CS - 4, CS - 4);
      g.fillStyle = '#ffc845'; g.fillRect(x + CS / 2 - 1, y + 5, 2, 5); g.fillRect(x + CS / 2 - 1, y + CS - 10, 2, 5); g.fillRect(x + 5, y + CS / 2 - 1, 5, 2); g.fillRect(x + CS - 10, y + CS / 2 - 1, 5, 2);
    }
    drawFx(g, pIdx);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    for (let k = fx.length - 1; k >= 0; k--) { fx[k].t += dt; if (fx[k].t > 1) fx.splice(k, 1); }
    if (phase === 'hide') return;
    if (phase === 'place') { drawOwn(gL, placer); return; }
    const me = viewer();
    drawOwn(gL, me);
    drawRadar(gR, 1 - me);
  }

  setPhaseUI();
  raf = requestAnimationFrame(frame);
  return {
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey); root.remove(); },
  };
}
