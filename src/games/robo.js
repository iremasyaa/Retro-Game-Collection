import { h, rand } from '../core/dom.js';
import { pixelCanvas, text, loop, particles, swipe, sprite, isTouch } from '../core/gfx.js';

const T = 16;
const MAZES = [
  [
    '#####################',
    '#V........#........V#',
    '#.##.####.#.####.##.#',
    '#o##.####.#.####.##o#',
    '#.........V.........#',
    '#.##.#.#######.#.##.#',
    '#....#....#....#....#',
    '####.####.#.####.####',
    '####.#.........#.####',
    '####.#.###.###.#.####',
    '#T.....#.....#.....T#',
    '####.#.#.###.#.#.####',
    '####.#....B....#.####',
    '####.#.#######.#.####',
    '#.........#.........#',
    '#.##.####.#.####.##.#',
    '#o.#......P......#.o#',
    '##.#.#.#######.#.#.##',
    '#....#....#....#....#',
    '#.#######.#.#######.#',
    '#...................#',
    '#####################',
  ],
  [
    '#####################',
    '#V.................V#',
    '#.#####.##.##.#####.#',
    '#o#...#.......#...#o#',
    '#.#.#.#.#####.#.#.#.#',
    '#...#.....V.....#...#',
    '###.###.#.#.#.###.###',
    '#.......#.#.#.......#',
    '#.#####.#.#.#.#####.#',
    '#.#.......B.......#.#',
    '#T..#.###.#.###.#..T#',
    '#.#.#.#.......#.#.#.#',
    '#.#.#.#.#####.#.#.#.#',
    '#...#.....#.....#...#',
    '###.#####.#.#####.###',
    '#.......#.#.#.......#',
    '#.#####.#.P.#.#####.#',
    '#o#.......#.......#o#',
    '#.#.#####.#.#####.#.#',
    '#...................#',
    '#####################',
  ],
];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const PLAYER_SPEED = 6.2;
const VSPEED = { kolay: 3.9, orta: 4.7, zor: 5.5 };
const EMP = { kolay: 8, orta: 6, zor: 4.5 };
const NOISE = { kolay: 0.3, orta: 0.12, zor: 0.02 };
const VCOLORS = ['#ff4f6a', '#7dff6a', '#b18cff'];
const VBOWS = [['#ffc845', '#b07d10'], ['#ff4fa3', '#a3205f'], ['#3ee0ff', '#127a8f']];
const VRIM = ['#c22a45', '#2fa846', '#7a55dc'];
const VNAMES = ['takip', 'pusu', 'gezgin'];

const ROBOT = [
  ['..xx...xx...', '..xXx.xXx...', '...xxXxx....', '..kkkkkkkk..', '.kQQQQQQqqk.', '.kQwwqwwqqk.', '.kqwkqwkqqk.', '.kqqqqqqqqk.', '.kqqqkkqqqk.', '.kqqqqqqqqk.', '..kkkkkkkk..', '..kGk..kGk..'],
  ['..xx...xx...', '..xXx.xXx...', '...xxXxx....', '..kkkkkkkk..', '.kQQQQQQqqk.', '.kQwwqwwqqk.', '.kqwkqwkqqk.', '.kqqqqqqqqk.', '.kqqqkkqqqk.', '.kqqqqqqqqk.', '..kkkkkkkk..', '..Gkk..Gkk..'],
];
const VIRUS = [
  ['...ff.ff....', '...fFfFf....', '....fff.....', '.k.kcccck.k.', '..kcccccck..', 'kkcwwccwwckk', '..cwwccwwc..', '.kcccccccck.', 'kkcccccccckk', '..kcccccck..', '.k.kkkkkk.k.', '...k....k...'],
  ['...ff.ff....', '...fFfFf....', '....fff.....', 'k..kcccck..k', '.kkcccccckk.', '..cwwccwwc..', 'kkcwwccwwckk', '.kcccccccck.', '..cccccccc..', 'kkkcccccckkk', '...kkkkkk...', '..k......k..'],
];
const DISK = ['.kkkkkkkkk..', '.kbbkwwkbk..', '.kbbkwwkbbk.', '.kbbkkkkbbk.', '.kbbbbbbbbk.', '.kbwwwwwwbk.', '.kbwkkkkwbk.', '.kbwwwwwwbk.', '.kkkkkkkkkk.'];

export function mount(stage, opts, api) {
  const diff = opts.zorluk || 'orta';
  const W = 21 * T, H = 22 * T;
  const pc = pixelCanvas(stage, W, H);
  const { ctx, canvas } = pc;
  const fx = particles();
  const pal = (c) => ({ k: '#140f2a', s: '#d9d4f0', b: '#3ee0ff', y: '#ffc845', G: '#5d5390', c, w: '#ffffff' });
  const ROBO_PAL = { k: '#140f2a', q: '#ff7fc8', Q: '#ffc2e2', w: '#ffffff', x: '#ff3048', X: '#a3142c', G: '#5d5390' };
  const robot = [0, 1].map((f) => sprite(ROBOT[f], ROBO_PAL, 1, 'pink-robo' + f));
  const viruses = VCOLORS.map((c, i) => [0, 1].map((f) => sprite(VIRUS[f], { k: VRIM[i], c, w: '#ffffff', f: VBOWS[i][0], F: VBOWS[i][1] }, 1, 'bowvir' + i + f)));
  const frozen = [0, 1].map((f) => sprite(VIRUS[f], { k: '#3ee0ff', c: '#bfe9ff', w: '#ffffff', f: '#ffffff', F: '#9fd8ff' }, 1, 'bowvirf' + f));
  const disk = sprite(DISK, pal(), 1, 'disk');

  let level = 0, lives = 3, score = 0, t = 0;
  let maze, rows, cols, bits, bitsLeft, collected, tele, spawns, start, bonusTile, bg;
  let player, vs, empT, state, stateT, bonus, endT = 0, flash = 0, combo = 0;
  const floaters = [];

  function loadLevel() {
    maze = MAZES[level % MAZES.length];
    rows = maze.length; cols = maze[0].length;
    bits = new Uint8Array(rows * cols);
    tele = []; spawns = []; bitsLeft = 0; collected = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const ch = maze[y][x];
      if (ch === '.') { bits[y * cols + x] = 1; bitsLeft++; }
      if (ch === 'o') { bits[y * cols + x] = 2; bitsLeft++; }
      if (ch === 'T') tele.push([x, y]);
      if (ch === 'V') spawns.push([x, y]);
      if (ch === 'P') start = [x, y];
      if (ch === 'B') { bonusTile = [x, y]; bits[y * cols + x] = 1; bitsLeft++; }
    }
    bg = buildBackground();
    resetActors();
    status();
  }
  const oy = () => Math.floor((H - rows * T) / 2);
  const open = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && maze[y][x] !== '#';

  function resetActors() {
    player = { tx: start[0], ty: start[1], dx: 0, dy: 0, prog: 0, want: null, moving: false, face: 1, anim: 0 };
    const sp = Math.min(VSPEED[diff] + Math.min(1.2, level * 0.3), PLAYER_SPEED * 0.95);
    vs = spawns.slice(0, 3).map(([x, y], i) => ({ tx: x, ty: y, home: [x, y], dx: 0, dy: 1, prog: 0, kind: i, speed: sp * (i === 2 ? 0.92 : 1), release: 1.5 + i * 2.6, active: false, dead: false, respawnT: 0 }));
    empT = 0; bonus = null; combo = 0; floaters.length = 0;
    state = 'ready'; stateT = 1.6;
  }

  function status() {
    const best = api.best('skor:' + diff) || 0;
    api.status([['SKOR', score, '#ffc845'], ['CAN', '♥'.repeat(Math.max(0, lives)) || '-', '#ff4f6a'], ['BÖLÜM', level + 1], ['REKOR', Math.max(best, score)]]);
  }

  function bfs(tx, ty) {
    const d = new Int16Array(rows * cols).fill(-1);
    const q = [ty * cols + tx]; d[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], x = c % cols, y = (c / cols) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!open(nx, ny)) continue;
        const n = ny * cols + nx;
        if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); }
      }
      if (maze[y][x] === 'T') for (const [ax, ay] of tele) { const n = ay * cols + ax; if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); } }
    }
    return d;
  }
  function nearestOpen(x, y) {
    x = Math.max(0, Math.min(cols - 1, x)); y = Math.max(0, Math.min(rows - 1, y));
    if (open(x, y)) return [x, y];
    for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (open(x + dx, y + dy)) return [x + dx, y + dy];
    return [player.tx, player.ty];
  }

  function virusChoose(v) {
    const opts2 = DIRS.filter(([dx, dy]) => open(v.tx + dx, v.ty + dy) && !(dx === -v.dx && dy === -v.dy));
    const choices = opts2.length ? opts2 : DIRS.filter(([dx, dy]) => open(v.tx + dx, v.ty + dy));
    if (!choices.length) return [0, 0];
    if (choices.length === 1) return choices[0];
    let target;
    const ptx = player.tx, pty = player.ty;
    if (v.kind === 0) target = [ptx, pty];
    else if (v.kind === 1) target = nearestOpen(ptx + player.dx * 4, pty + player.dy * 4);
    else {
      const d0 = Math.abs(v.tx - ptx) + Math.abs(v.ty - pty);
      if (d0 > 7) return choices[rand(choices.length)];
      target = [ptx, pty];
    }
    if (Math.random() < NOISE[diff]) return choices[rand(choices.length)];
    const dist = bfs(target[0], target[1]);
    let best = choices[0], bv = 1e9;
    for (const c of choices) {
      const dv = dist[(v.ty + c[1]) * cols + v.tx + c[0]];
      if (dv >= 0 && dv < bv) { bv = dv; best = c; }
    }
    return best;
  }

  function arrive(e, isPlayer) {
    e.tx += e.dx; e.ty += e.dy;
    if (maze[e.ty][e.tx] === 'T') {
      const other = tele.find(([x, y]) => x !== e.tx || y !== e.ty);
      if (other) { e.tx = other[0]; e.ty = other[1]; if (isPlayer) { api.sfx('teleport'); fx.burst(e.tx * T + 8, e.ty * T + 8 + oy(), '#b18cff', 14, 60); } }
    }
  }
  function stepPlayer(dt) {
    const p = player, speed = PLAYER_SPEED;
    if (p.want && p.moving && p.want[0] === -p.dx && p.want[1] === -p.dy) {
      p.tx += p.dx; p.ty += p.dy; p.dx = p.want[0]; p.dy = p.want[1]; p.prog = 1 - p.prog;
    }
    if (!p.moving) {
      if (p.want && open(p.tx + p.want[0], p.ty + p.want[1])) { p.dx = p.want[0]; p.dy = p.want[1]; p.moving = true; p.prog = 0; }
      else return;
    }
    p.prog += speed * dt;
    p.anim += dt;
    while (p.prog >= 1) {
      p.prog -= 1;
      arrive(p, true);
      collect(p.tx, p.ty);
      if (p.want && open(p.tx + p.want[0], p.ty + p.want[1])) { p.dx = p.want[0]; p.dy = p.want[1]; }
      if (!open(p.tx + p.dx, p.ty + p.dy)) { p.moving = false; p.prog = 0; break; }
    }
    if (p.dx) p.face = p.dx;
  }
  function stepVirus(v, dt) {
    if (!v.active || v.dead) return;
    if (empT > 0) return;
    if (v.dx === 0 && v.dy === 0) { const c = virusChoose(v); v.dx = c[0]; v.dy = c[1]; }
    if (!open(v.tx + v.dx, v.ty + v.dy)) { const c = virusChoose(v); v.dx = c[0]; v.dy = c[1]; v.prog = 0; }
    v.prog += v.speed * dt;
    while (v.prog >= 1) {
      v.prog -= 1;
      arrive(v, false);
      const c = virusChoose(v); v.dx = c[0]; v.dy = c[1];
    }
  }
  const pos = (e) => [e.tx + e.dx * e.prog, e.ty + e.dy * e.prog];

  function collect(x, y) {
    const i = y * cols + x;
    const b = bits[i];
    if (bonus && x === bonus.x && y === bonus.y) {
      score += 200 * (level + 1); api.sfx('bonus'); fx.burst(x * T + 8, y * T + 8 + oy(), '#3ee0ff', 20, 80);
      api.toast('+' + 200 * (level + 1)); bonus = null; status();
    }
    if (!b) return;
    bits[i] = 0; bitsLeft--; collected++;
    if (b === 1) { score += 10; api.sfx('bit'); }
    else { score += 50; empT = EMP[diff]; combo = 0; api.sfx('emp'); flash = 0.25; api.toast('EMP! VİRÜSLERİ TEMİZLE'); }
    if ((collected === 70 || collected === 150) && !bonus) bonus = { x: bonusTile[0], y: bonusTile[1], ttl: 9 };
    status();
    if (bitsLeft === 0) {
      state = 'clear'; stateT = 1.8; api.sfx('level');
    }
  }

  function die() {
    state = 'dead'; stateT = 1.4; lives--;
    api.sfx('die');
    const [px, py] = pos(player);
    fx.burst(px * T + 8, py * T + 8 + oy(), '#ff7fc8', 30, 90, 1);
    status();
  }

  function update(dt) {
    t += dt; fx.update(dt);
    if (flash > 0) flash -= dt;
    if (bonus) { bonus.ttl -= dt; if (bonus.ttl <= 0) bonus = null; }
    if (state === 'ready') { stateT -= dt; if (stateT <= 0) state = 'play'; return; }
    if (state === 'dead') {
      stateT -= dt;
      if (stateT <= 0) {
        if (lives <= 0) {
          state = 'over';
          const rec = score > 0 && api.submitBest('skor:' + diff, score);
          endT = setTimeout(() => api.gameOver({ title: 'SİSTEM ÇÖKTÜ', cls: 'lose', text: rec ? 'Yeni rekor!' : 'Virüsler pembe robotu yakaladı.', stats: [['SKOR', score], ['BÖLÜM', level + 1], ['REKOR', api.best('skor:' + diff) || 0]] }), 300);
        } else resetActors();
      }
      return;
    }
    if (state === 'clear') { stateT -= dt; if (stateT <= 0) { level++; loadLevel(); } return; }
    if (state !== 'play') return;
    if (empT > 0) empT = Math.max(0, empT - dt);
    stepPlayer(dt);
    for (const v of vs) {
      if (v.dead) {
        v.respawnT -= dt;
        if (v.respawnT <= 0) { v.dead = false; v.tx = v.home[0]; v.ty = v.home[1]; v.dx = 0; v.dy = 1; v.prog = 0; v.active = true; }
        continue;
      }
      if (!v.active) { v.release -= dt; if (v.release <= 0) v.active = true; }
      stepVirus(v, dt);
    }
    for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.t -= dt; f.y -= 14 * dt; if (f.t <= 0) floaters.splice(i, 1); }
    const [px, py] = pos(player);
    for (const v of vs) {
      if (!v.active || v.dead) continue;
      const [vx, vy] = pos(v);
      if (Math.abs(vx - px) + Math.abs(vy - py) >= 0.62) continue;
      if (empT > 0) {
        combo++;
        const pts = 200 * combo;
        score += pts;
        v.dead = true; v.respawnT = 4;
        api.sfx('bonus');
        fx.burst(vx * T + 8, vy * T + 8 + oy(), VCOLORS[v.kind], 24, 90, 0.8);
        floaters.push({ x: vx * T + 8, y: vy * T + oy(), text: '+' + pts, t: 1 });
        status();
      } else { die(); return; }
    }
  }

  function buildBackground() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#070912'; g.fillRect(0, 0, W, H);
    const o = Math.floor((H - rows * T) / 2);
    const wall = (x, y) => x < 0 || y < 0 || x >= cols || y >= rows || maze[y][x] === '#';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = x * T, py = y * T + o;
      if (!wall(x, y)) { g.fillStyle = '#0b0e1e'; g.fillRect(px, py, T, T); continue; }
      const inner = wall(x - 1, y) && wall(x + 1, y) && wall(x, y - 1) && wall(x, y + 1) && wall(x - 1, y - 1) && wall(x + 1, y + 1) && wall(x - 1, y + 1) && wall(x + 1, y - 1);
      g.fillStyle = inner ? '#1e1248' : '#2b1a5e'; g.fillRect(px, py, T, T);
      if (inner) { g.fillStyle = '#2a1a62'; if ((x * 7 + y * 3) % 5 === 0) g.fillRect(px + 6, py + 6, 4, 4); if ((x + y * 5) % 7 === 0) { g.fillRect(px, py + 7, T, 2); } }
      g.fillStyle = '#9b6bff';
      if (!wall(x - 1, y)) g.fillRect(px, py, 2, T);
      if (!wall(x + 1, y)) g.fillRect(px + T - 2, py, 2, T);
      if (!wall(x, y - 1)) g.fillRect(px, py, T, 2);
      if (!wall(x, y + 1)) g.fillRect(px, py + T - 2, T, 2);
      if (!wall(x - 1, y) && !wall(x, y - 1)) { g.fillStyle = '#d9d4f0'; g.fillRect(px + 3, py + 3, 2, 2); }
      if (!wall(x + 1, y) && !wall(x, y + 1)) { g.fillStyle = '#d9d4f0'; g.fillRect(px + T - 5, py + T - 5, 2, 2); }
    }
    for (const [x, y] of spawns) { g.fillStyle = '#2a0f22'; g.fillRect(x * T + 2, y * T + o + 2, T - 4, T - 4); g.strokeStyle = '#ff4f6a'; g.lineWidth = 1; g.strokeRect(x * T + 2.5, y * T + o + 2.5, T - 5, T - 5); }
    return c;
  }

  function render() {
    const o = oy();
    ctx.drawImage(bg, 0, 0);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const b = bits[y * cols + x];
      if (!b) continue;
      const px = x * T, py = y * T + o;
      if (b === 1) { ctx.fillStyle = 'rgba(255,200,69,.35)'; ctx.fillRect(px + 6, py + 6, 4, 4); ctx.fillStyle = '#fff1b8'; ctx.fillRect(px + 7, py + 7, 2, 2); }
      else {
        ctx.fillStyle = '#d9d4f0';
        for (let k = 0; k < 3; k++) { ctx.fillRect(px + 4 + k * 3, py + 3, 1, 2); ctx.fillRect(px + 4 + k * 3, py + 11, 1, 2); }
        ctx.fillStyle = '#1a1730'; ctx.fillRect(px + 3, py + 5, 10, 6);
        ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff4f6a' : '#5a1d3c'; ctx.fillRect(px + 5, py + 7, 2, 2);
        ctx.fillStyle = '#3ee0ff'; ctx.fillRect(px + 9, py + 7, 2, 2);
      }
    }
    for (const [x, y] of tele) {
      const px = x * T, py = y * T + o, f = Math.floor(t * 8) % 4;
      ctx.fillStyle = '#2a1350'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
      ctx.fillStyle = '#b18cff';
      const pts = [[2, 2], [T - 4, 2], [T - 4, T - 4], [2, T - 4]];
      for (let k = 0; k < 4; k++) if (k !== f) ctx.fillRect(px + pts[k][0], py + pts[k][1], 2, 2);
      ctx.fillStyle = '#ff4fa3'; ctx.fillRect(px + 6, py + 6, 4, 4);
    }
    if (bonus && (bonus.ttl > 2.5 || Math.floor(t * 8) % 2)) ctx.drawImage(disk, bonus.x * T + 2, bonus.y * T + o + 3);
    for (const v of vs) {
      if (v.dead) continue;
      if (!v.active && Math.floor(t * 6) % 2) continue;
      const [x, y] = pos(v);
      const f = Math.floor(t * 5 + v.kind) % 2;
      const img = empT > 0 && !(empT < 1.5 && Math.floor(t * 8) % 2) ? frozen[f] : viruses[v.kind][f];
      const px = Math.round(x * T) + 2, py = Math.round(y * T) + o + 2;
      ctx.drawImage(img, px, py);
      const ey = f === 0 ? 5 : 5;
      if (empT <= 0) { ctx.fillStyle = '#140f2a'; ctx.fillRect(px + 3 + (v.dx > 0 ? 1 : 0), py + ey + (v.dy > 0 ? 1 : 0), 1, 1); ctx.fillRect(px + 7 + (v.dx > 0 ? 1 : 0), py + ey + (v.dy > 0 ? 1 : 0), 1, 1); }
    }
    if (state !== 'dead' && state !== 'over') {
      const [x, y] = pos(player);
      const f = player.moving ? Math.floor(player.anim * 10) % 2 : 0;
      const px = Math.round(x * T) + 2, py = Math.round(y * T) + o + 2;
      if (player.face < 0) { ctx.save(); ctx.translate(px + 12, py); ctx.scale(-1, 1); ctx.drawImage(robot[f], 0, 0); ctx.restore(); }
      else ctx.drawImage(robot[f], px, py);
    } else if (state === 'dead') {
      const [x, y] = pos(player);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ff7fc8' : '#ff3048'; ctx.fillRect(Math.round(x * T) + rand(14), Math.round(y * T) + o + rand(14), 2 + rand(4), 1); }
    }
    fx.draw(ctx);
    for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.t * 2); text(ctx, f.text, f.x, f.y, { size: 12, color: '#ffc845', align: 'center', bold: true, shadow: '#140f2a' }); ctx.globalAlpha = 1; }
    if (flash > 0) { ctx.fillStyle = 'rgba(62,224,255,' + (flash * 1.2).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (empT > 0) { ctx.fillStyle = '#3ee0ff'; ctx.fillRect(0, 0, Math.round(W * empT / EMP[diff]), 3); }
    if (state === 'ready') text(ctx, 'HAZIR!', W / 2, start[1] * T + o - 22, { size: 24, color: '#ffc845', align: 'center', bold: true, shadow: '#5a1d3c' });
    if (state === 'clear') text(ctx, 'BÖLÜM TAMAM!', W / 2, H / 2, { size: 24, color: '#7dff6a', align: 'center', bold: true, shadow: '#1d5a2a' });
  }

  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
  const onKey = (e) => {
    if (api.blocked) return;
    if (e.code === 'KeyP') { api.pause(); return; }
    const d = KEYS[e.code];
    if (!d) return;
    e.preventDefault();
    player.want = d;
  };
  window.addEventListener('keydown', onKey);
  const unswipe = swipe(stage, (dir) => { if (!api.blocked) player.want = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[dir]; });
  let pad = null;
  if (isTouch()) {
    const b = (cls, d, label) => {
      const el = h('button', { class: cls, 'aria-label': label }, { u: '▲', d: '▼', l: '◀', r: '▶' }[cls]);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!api.blocked) player.want = d; });
      return el;
    };
    pad = h('div', { class: 'dpad' }, b('u', [0, -1], 'Yukarı'), b('l', [-1, 0], 'Sol'), b('r', [1, 0], 'Sağ'), b('d', [0, 1], 'Aşağı'));
    stage.append(pad);
    stage.style.paddingBottom = '184px';
  }

  if (window.__retroDebug) window.__robo = {
    leave(n) { let k = 0; for (let i = 0; i < bits.length; i++) if (bits[i]) { if (k >= n) { bits[i] = 0; bitsLeft--; } k++; } },
    info: () => ({ state, level, lives, bitsLeft, empT, score, combo, player: { ...player }, viruses: vs.map((v) => ({ tx: v.tx, ty: v.ty, dx: v.dx, dy: v.dy, prog: v.prog, active: v.active, dead: v.dead })) }),
    bitAt: () => { for (let i = 0; i < bits.length; i++) if (bits[i]) return [i % cols, (i / cols) | 0]; return null; },
    teleportTo(x, y) { player.tx = x; player.ty = y; player.prog = 0; player.moving = false; },
  };
  const lp = loop(update, render);
  loadLevel();
  lp.start();
  return {
    wantsAutoPause: true,
    pause() { lp.paused = true; },
    resume() { lp.paused = false; },
    destroy() { lp.stop(); clearTimeout(endT); window.removeEventListener('keydown', onKey); unswipe(); if (pad) { pad.remove(); stage.style.paddingBottom = ''; } pc.destroy(); },
  };
}
