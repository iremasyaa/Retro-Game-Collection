import { h, rand, fmtTime } from '../core/dom.js';
import { pixelCanvas, text, sprite, isTouch } from '../core/gfx.js';

const LEVELS = { kolay: [9, 9, 10], orta: [16, 16, 40], zor: [30, 16, 88] };
const C = 16, M = 8;
const NUM = ['', '#3ee0ff', '#7dff6a', '#ff4fa3', '#9b6bff', '#ff8a3d', '#34d1bf', '#f3ead7', '#a99fd8'];
const MINE = sprite([
  '......#.....',
  '...#..#..#..',
  '....#####...',
  '...#######..',
  '..##ww#####.',
  '#####w######',
  '..#########.',
  '...#######..',
  '....#####...',
  '...#..#..#..',
  '......#.....',
  '............',
], undefined, 1, 'mine');
const FLAG = sprite([
  '............',
  '....wrr.....',
  '....wrrrr...',
  '....wrrrrrr.',
  '....wrrrr...',
  '....wrr.....',
  '....w.......',
  '....w.......',
  '....w.......',
  '..ggggg.....',
  '.ggggggg....',
  '............',
], undefined, 1, 'flag');

export function mount(stage, opts, api) {
  let [cols, rows, mines] = LEVELS[opts.zorluk] || LEVELS.kolay;
  if (cols > rows && stage.clientHeight > stage.clientWidth * 1.1) { const t = cols; cols = rows; rows = t; }
  const W = cols * C + M * 2, H = rows * C + M * 2;
  const wrap = h('div', { style: 'width:100%;height:100%;display:flex;flex-direction:column;gap:12px;min-height:0' });
  const area = h('div', { style: 'flex:1 1 auto;min-height:0;display:grid;place-items:center' });
  const flagBtn = h('button', { class: 'btn small', 'aria-pressed': 'false' }, 'BAYRAK: KAPALI');
  const hud = h('div', { style: 'display:flex;justify-content:center;gap:14px;flex-wrap:wrap' }, flagBtn);
  wrap.append(area, hud);
  stage.append(wrap);
  const pc = pixelCanvas(area, W, H, { maxScale: 5 });
  const { ctx, canvas } = pc;
  canvas.style.cursor = 'pointer';

  const N = cols * rows;
  const mine = new Uint8Array(N), open = new Uint8Array(N), flag = new Uint8Array(N), adj = new Uint8Array(N);
  let started = false, over = false, won = false, t0 = 0, elapsed = 0, opened = 0, boomAt = -1, shake = 0;
  let hover = -1, cursor = Math.floor(rows / 2) * cols + Math.floor(cols / 2), showCursor = false, flagMode = false;
  let tickInt = 0, raf = 0, endT = 0;

  const idx = (x, y) => y * cols + x;
  const nbrs = (i) => {
    const x = i % cols, y = (i / cols) | 0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(idx(nx, ny));
    }
    return out;
  };

  function layMines(safe) {
    const banned = new Set([safe, ...nbrs(safe)]);
    if (N - banned.size < mines) banned.clear(), banned.add(safe);
    let placed = 0;
    while (placed < mines) {
      const i = rand(N);
      if (mine[i] || banned.has(i)) continue;
      mine[i] = 1; placed++;
    }
    for (let i = 0; i < N; i++) adj[i] = nbrs(i).reduce((s, j) => s + mine[j], 0);
  }

  function status() {
    const flags = flag.reduce((a, b) => a + b, 0);
    const best = api.best('sure:' + opts.zorluk);
    api.status([['MAYIN', mines - flags, '#ff4fa3'], ['SÜRE', fmtTime(elapsed)], ['REKOR', best == null ? '-' : fmtTime(best)]]);
  }

  function reveal(i) {
    if (over || open[i] || flag[i]) return;
    if (!started) {
      started = true; layMines(i); t0 = performance.now();
      tickInt = setInterval(() => { if (!over && !api.blocked) { elapsed = (performance.now() - t0) / 1000; status(); } }, 250);
    }
    if (mine[i]) { lose(i); return; }
    const stack = [i];
    let n = 0;
    while (stack.length) {
      const j = stack.pop();
      if (open[j] || flag[j]) continue;
      open[j] = 1; opened++; n++;
      if (adj[j] === 0) for (const k of nbrs(j)) if (!open[k] && !mine[k]) stack.push(k);
    }
    api.sfx(n > 1 ? 'select' : 'reveal');
    if (opened === N - mines) win();
  }

  function chord(i) {
    if (!open[i] || !adj[i]) return;
    const ns = nbrs(i);
    const f = ns.reduce((s, j) => s + flag[j], 0);
    if (f !== adj[i]) { api.sfx('error'); return; }
    for (const j of ns) if (!open[j] && !flag[j]) { reveal(j); if (over) return; }
  }

  function toggleFlag(i) {
    if (over || open[i]) return;
    flag[i] ^= 1;
    api.sfx(flag[i] ? 'flag' : 'nav');
    status();
  }

  function act(i, wantFlag) {
    if (over || api.blocked) return;
    if (wantFlag) { toggleFlag(i); return; }
    if (open[i]) chord(i); else reveal(i);
    status();
  }

  function lose(i) {
    over = true; boomAt = i; shake = 0.5;
    api.sfx('boom');
    clearInterval(tickInt);
    endT = setTimeout(() => api.gameOver({ title: 'BUM!', cls: 'lose', text: 'Bir mayına bastın.', stats: [['SÜRE', fmtTime(elapsed)], ['AÇILAN', opened + '/' + (N - mines)]] }), 1100);
  }
  function win() {
    over = true; won = true;
    elapsed = (performance.now() - t0) / 1000;
    for (let i = 0; i < N; i++) if (mine[i]) flag[i] = 1;
    clearInterval(tickInt);
    status();
    api.sfx('win');
    const rec = api.submitBest('sure:' + opts.zorluk, Math.round(elapsed * 10) / 10, true);
    endT = setTimeout(() => api.gameOver({ title: 'TEMİZLENDİ!', cls: 'win', text: rec ? 'Yeni rekor!' : 'Bütün mayınları buldun.', stats: [['SÜRE', fmtTime(elapsed)], ['REKOR', fmtTime(api.best('sure:' + opts.zorluk))]] }), 800);
  }

  const cellAt = (ev) => {
    const p = pc.toLocal(ev);
    const x = Math.floor((p.x - M) / C), y = Math.floor((p.y - M) / C);
    return x >= 0 && y >= 0 && x < cols && y < rows ? idx(x, y) : -1;
  };
  let pressT = 0, longFired = false, pressCell = -1;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    const i = cellAt(e);
    pressCell = i; longFired = false; showCursor = false;
    if (i < 0) return;
    if (e.pointerType !== 'mouse') {
      clearTimeout(pressT);
      pressT = setTimeout(() => { longFired = true; if (navigator.vibrate) navigator.vibrate(20); act(i, true); }, 430);
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    clearTimeout(pressT);
    const i = cellAt(e);
    if (i < 0 || i !== pressCell || longFired) return;
    act(i, e.button === 2 || flagMode);
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') hover = cellAt(e); });
  canvas.addEventListener('pointerleave', () => { hover = -1; clearTimeout(pressT); });
  flagBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagBtn.textContent = 'BAYRAK: ' + (flagMode ? 'AÇIK' : 'KAPALI');
    flagBtn.classList.toggle('on', flagMode);
    flagBtn.setAttribute('aria-pressed', String(flagMode));
    flagBtn.blur();
  });
  if (!isTouch()) hud.append(h('span', { style: 'align-self:center;color:var(--muted)' }, 'Sağ tık: bayrak · Ok tuşları + BOŞLUK / F'));

  const onKey = (e) => {
    if (api.blocked) return;
    const x = cursor % cols, y = (cursor / cols) | 0;
    let nx = x, ny = y;
    if (e.key === 'ArrowLeft') nx--; else if (e.key === 'ArrowRight') nx++;
    else if (e.key === 'ArrowUp') ny--; else if (e.key === 'ArrowDown') ny++;
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showCursor = true; act(cursor, false); return; }
    else if (e.code === 'KeyF') { showCursor = true; act(cursor, true); return; }
    else return;
    e.preventDefault();
    showCursor = true;
    cursor = idx(Math.max(0, Math.min(cols - 1, nx)), Math.max(0, Math.min(rows - 1, ny)));
    api.sfx('nav');
  };
  window.addEventListener('keydown', onKey);

  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (shake > 0) shake -= dt;
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 6 * shake) : 0;
    const sy = shake > 0 ? Math.round((Math.random() - 0.5) * 6 * shake) : 0;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    ctx.fillStyle = '#0e0b1f'; ctx.fillRect(-8, -8, W + 16, H + 16);
    ctx.fillStyle = '#43397d'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6a5fc0'; ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, 0, 2, H);
    ctx.fillStyle = '#231d52'; ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(W - 2, 0, 2, H);
    ctx.fillStyle = '#100c24'; ctx.fillRect(M - 2, M - 2, cols * C + 4, rows * C + 4);
    for (let i = 0; i < N; i++) {
      const x = M + (i % cols) * C, y = M + ((i / cols) | 0) * C;
      if (open[i] || (over && mine[i] && !won)) {
        ctx.fillStyle = i === boomAt ? '#ff4f6a' : '#15112e';
        ctx.fillRect(x, y, C, C);
        ctx.fillStyle = '#1f1945'; ctx.fillRect(x, y, C, 1); ctx.fillRect(x, y, 1, C);
        if (mine[i]) ctx.drawImage(MINE, x + 2, y + 2);
        else if (adj[i]) text(ctx, String(adj[i]), x + 8, y + 12, { size: 12, color: NUM[adj[i]], align: 'center', bold: true });
        if (over && !won && flag[i] && !mine[i]) {
          ctx.drawImage(MINE, x + 2, y + 2);
          ctx.strokeStyle = '#ff4f6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y + 2); ctx.lineTo(x + 2, y + 14); ctx.stroke();
        }
      } else {
        const hot = (i === hover && !over) ? 1 : 0;
        ctx.fillStyle = hot ? '#3a31a0' : '#2b2470'; ctx.fillRect(x, y, C, C);
        ctx.fillStyle = hot ? '#6d62e0' : '#4f44b4'; ctx.fillRect(x, y, C, 2); ctx.fillRect(x, y, 2, C);
        ctx.fillStyle = '#17123f'; ctx.fillRect(x, y + C - 2, C, 2); ctx.fillRect(x + C - 2, y, 2, C);
        if (flag[i]) {
          if (over && !won && !mine[i]) {
            ctx.drawImage(MINE, x + 2, y + 2);
            ctx.strokeStyle = '#ff4f6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y + 2); ctx.lineTo(x + 2, y + 14); ctx.stroke();
          } else ctx.drawImage(FLAG, x + 2, y + 2);
        }
      }
    }
    if (showCursor && !over) {
      const x = M + (cursor % cols) * C, y = M + ((cursor / cols) | 0) * C;
      ctx.strokeStyle = Math.floor(now / 250) % 2 ? '#ffc845' : '#3ee0ff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, C - 2, C - 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  raf = requestAnimationFrame(frame);
  status();

  return {
    pause() {}, resume() { if (started && !over) t0 = performance.now() - elapsed * 1000; },
    destroy() { cancelAnimationFrame(raf); clearInterval(tickInt); clearTimeout(pressT); clearTimeout(endT); window.removeEventListener('keydown', onKey); pc.destroy(); wrap.remove(); },
  };
}
