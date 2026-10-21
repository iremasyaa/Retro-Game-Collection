import { pixelCanvas, text, loop, particles } from '../core/gfx.js';

const W = 480, H = 360, TOP = 10, SIDE = 6;
const BW = 36, BH = 12, GAP = 2, COLS = 12, BX = Math.round((W - (COLS * BW + (COLS - 1) * GAP)) / 2), BY = 44;
const COLORS = { 1: '#ff4f6a', 2: '#ff8a3d', 3: '#ffc845', 4: '#7dff6a', 5: '#3ee0ff', 6: '#ff4fa3' };
const LEVELS = [
  ['111111111111', '222222222222', '333333333333', '444444444444', '555555555555'],
  ['.....SS.....', '....1111....', '...222222...', '..33333333..', '.4444444444.', '555555555555', '6.6.6.6.6.6.'],
  ['1.1.1.1.1.1.', '.2.2.2.2.2.2', '3.3.3.3.3.3.', 'MMM......MMM', '444444444444', 'SSSSSSSSSSSS'],
  ['..66....66..', '.6666..6666.', '66666SS66666', '666666666666', '.6666666666.', '..66666666..', '...666666...', '....6666....'],
  ['MSSSSSSSSSSM', 'M1111111111M', 'M2222222222M', 'M33..MM..33M', 'M4444444444M', 'MMMMM..MMMMM', '555555555555'],
];
const BASE = { kolay: 200, orta: 245, zor: 295 };
const POWERS = [['G', '#3ee0ff', 30], ['Ç', '#ff4fa3', 28], ['Y', '#7dff6a', 25], ['+', '#ffc845', 12]];

export function mount(stage, opts, api) {
  const pc = pixelCanvas(stage, W, H);
  const { ctx, canvas } = pc;
  canvas.style.cursor = 'none';
  const fx = particles();
  const base = BASE[opts.zorluk] || BASE.orta;
  let level, lives, score, bricks, balls, caps, paddle, speedMul, wideT, slowT, t, state, shake, msg, msgT, endT = 0;
  const keys = { L: false, R: false };
  let pointerX = null;

  function startGame() {
    level = 0; lives = 3; score = 0; t = 0;
    loadLevel();
  }
  function loadLevel() {
    bricks = [];
    LEVELS[level].forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const b = { x: BX + c * (BW + GAP), y: BY + r * (BH + GAP), w: BW, h: BH, hp: 1, type: 'n', color: COLORS[ch] || '#f3ead7' };
        if (ch === 'S') { b.hp = 2; b.type = 's'; b.color = '#9b6bff'; }
        if (ch === 'M') { b.hp = Infinity; b.type = 'm'; b.color = '#8a86a8'; }
        bricks.push(b);
      });
    });
    caps = []; wideT = 0; slowT = 0; speedMul = 1 + level * 0.06;
    paddle = { x: W / 2, y: H - 22, w: 64, h: 8 };
    resetBall();
    msg = 'BÖLÜM ' + (level + 1); msgT = 1.6;
    status();
  }
  function resetBall() {
    balls = [{ x: paddle.x, y: paddle.y - 4, vx: 0, vy: 0, stuck: true, off: 0, trail: [] }];
    state = 'ready';
  }
  function status() {
    const best = api.best('skor:' + opts.zorluk) || 0;
    api.status([['SKOR', score, '#ffc845'], ['CAN', '♥'.repeat(lives) || '-', '#ff4f6a'], ['BÖLÜM', (level + 1) + '/5'], ['REKOR', Math.max(best, score)]]);
  }
  const speed = () => base * speedMul * (slowT > 0 ? 0.7 : 1);

  function launch() {
    if (api.blocked) return;
    for (const b of balls) if (b.stuck) {
      b.stuck = false;
      const a = (b.off / (paddle.w / 2)) * 0.6 + (Math.random() - 0.5) * 0.2;
      b.vx = Math.sin(a) * speed(); b.vy = -Math.cos(a) * speed();
      state = 'play';
      api.sfx('bounce');
    }
  }

  function setVel(b, ang) { const s = speed(); b.vx = Math.sin(ang) * s; b.vy = -Math.cos(ang) * s; }

  function hitBrick(b, br) {
    if (br.type === 'm') { api.sfx('metal'); return; }
    br.hp--;
    if (br.hp > 0) { api.sfx('metal'); fx.burst(br.x + br.w / 2, br.y + br.h / 2, '#c9b6ff', 5, 40); return; }
    bricks.splice(bricks.indexOf(br), 1);
    score += br.type === 's' ? 25 : 10;
    speedMul = Math.min(1.55 + level * 0.06, speedMul + 0.006);
    api.sfx('brick');
    fx.burst(br.x + br.w / 2, br.y + br.h / 2, br.color, 14, 80);
    if (Math.random() < 0.14) {
      let r = Math.random() * 95;
      const p = POWERS.find((q) => (r -= q[2]) < 0) || POWERS[0];
      caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, k: p[0], c: p[1] });
    }
    status();
    if (!bricks.some((x) => x.type !== 'm')) levelClear();
  }

  function levelClear() {
    state = 'clear';
    api.sfx('level');
    if (level === LEVELS.length - 1) {
      const rec = api.submitBest('skor:' + opts.zorluk, score);
      endT = setTimeout(() => api.gameOver({ title: 'ŞAMPİYON!', cls: 'win', text: rec ? 'Bütün bölümler bitti. Yeni rekor!' : 'Bütün bölümler bitti.', stats: [['SKOR', score], ['CAN', lives]] }), 900);
      return;
    }
    endT = setTimeout(() => { level++; loadLevel(); }, 1300);
  }

  function loseLife() {
    lives--;
    shake = 0.35;
    api.sfx('die');
    status();
    if (lives <= 0) {
      state = 'over';
      const rec = score > 0 && api.submitBest('skor:' + opts.zorluk, score);
      endT = setTimeout(() => api.gameOver({ title: 'OYUN BİTTİ', cls: 'lose', text: rec ? 'Yeni rekor!' : null, stats: [['SKOR', score], ['BÖLÜM', level + 1], ['REKOR', api.best('skor:' + opts.zorluk) || 0]] }), 900);
      return;
    }
    caps = []; wideT = 0; slowT = 0; paddle.w = 64;
    resetBall();
  }

  function update(dt) {
    t += dt;
    fx.update(dt, 120);
    if (shake > 0) shake -= dt;
    if (msgT > 0) msgT -= dt;
    if (state === 'over' || state === 'clear') return;
    const pv = 430;
    if (keys.L) paddle.x -= pv * dt;
    if (keys.R) paddle.x += pv * dt;
    if (pointerX != null && !keys.L && !keys.R) paddle.x += (pointerX - paddle.x) * Math.min(1, dt * 22);
    if (wideT > 0) { wideT -= dt; paddle.w += (100 - paddle.w) * Math.min(1, dt * 10); if (wideT <= 0) wideT = 0; }
    else paddle.w += (64 - paddle.w) * Math.min(1, dt * 10);
    if (slowT > 0) slowT -= dt;
    paddle.x = Math.max(SIDE + paddle.w / 2, Math.min(W - SIDE - paddle.w / 2, paddle.x));
    for (let i = caps.length - 1; i >= 0; i--) {
      const c = caps[i];
      c.y += 85 * dt;
      if (c.y + 5 >= paddle.y && c.y - 5 <= paddle.y + paddle.h && Math.abs(c.x - paddle.x) <= paddle.w / 2 + 9) {
        caps.splice(i, 1); power(c.k); continue;
      }
      if (c.y > H + 10) caps.splice(i, 1);
    }
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const b = balls[bi];
      if (b.stuck) { b.x = paddle.x + b.off; b.y = paddle.y - 4; continue; }
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const target = speed();
      b.vx *= target / sp; b.vy *= target / sp;
      const steps = Math.ceil((target * dt) / 3);
      for (let s = 0; s < steps; s++) {
        b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
        if (b.x - 3 < SIDE) { b.x = SIDE + 3; b.vx = Math.abs(b.vx); api.sfx('wall'); }
        if (b.x + 3 > W - SIDE) { b.x = W - SIDE - 3; b.vx = -Math.abs(b.vx); api.sfx('wall'); }
        if (b.y - 3 < TOP) { b.y = TOP + 3; b.vy = Math.abs(b.vy); api.sfx('wall'); }
        if (b.vy > 0 && b.y + 3 >= paddle.y && b.y + 3 <= paddle.y + paddle.h + 4 && Math.abs(b.x - paddle.x) <= paddle.w / 2 + 3) {
          const hit = Math.max(-1, Math.min(1, (b.x - paddle.x) / (paddle.w / 2)));
          setVel(b, hit * 1.05);
          b.y = paddle.y - 3;
          api.sfx('bounce');
        }
        for (const br of bricks) {
          if (b.x + 3 < br.x || b.x - 3 > br.x + br.w || b.y + 3 < br.y || b.y - 3 > br.y + br.h) continue;
          const ox = Math.min(b.x + 3 - br.x, br.x + br.w - (b.x - 3));
          const oy = Math.min(b.y + 3 - br.y, br.y + br.h - (b.y - 3));
          if (ox < oy) { b.vx = b.x < br.x + br.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); b.x += b.vx > 0 ? ox : -ox; }
          else { b.vy = b.y < br.y + br.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); b.y += b.vy > 0 ? oy : -oy; }
          if (Math.abs(b.vy) < target * 0.25) b.vy = (b.vy < 0 ? -1 : 1) * target * 0.25;
          hitBrick(b, br);
          break;
        }
        if (state === 'clear') return;
      }
      b.trail.push([b.x, b.y]); if (b.trail.length > 5) b.trail.shift();
      if (b.y - 3 > H) balls.splice(bi, 1);
    }
    if (!balls.length) loseLife();
  }

  function power(k) {
    api.sfx('power');
    score += 5;
    if (k === 'G') { wideT = 15; msg = 'GENİŞ RAKET'; }
    if (k === 'Y') { slowT = 10; msg = 'YAVAŞ TOP'; }
    if (k === '+') { lives = Math.min(5, lives + 1); msg = '+1 CAN'; }
    if (k === 'Ç') {
      msg = 'ÜÇ TOP';
      const add = [];
      for (const b of balls) {
        if (b.stuck || balls.length + add.length >= 7) continue;
        const a = Math.atan2(b.vx, -b.vy);
        for (const d of [-0.45, 0.45]) { const nb = { x: b.x, y: b.y, vx: 0, vy: 0, trail: [] }; setVel(nb, a + d); add.push(nb); }
      }
      balls.push(...add);
    }
    msgT = 1.2;
    status();
  }

  function render() {
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 8 * shake) : 0;
    ctx.setTransform(1, 0, 0, 1, sx, 0);
    ctx.fillStyle = '#0d0a22'; ctx.fillRect(-10, 0, W + 20, H);
    ctx.fillStyle = '#141032';
    for (let y = TOP; y < H; y += 16) ctx.fillRect(SIDE, y, W - SIDE * 2, 1);
    for (let x = SIDE; x < W; x += 16) ctx.fillRect(x, TOP, 1, H - TOP);
    ctx.fillStyle = '#43397d'; ctx.fillRect(0, 0, SIDE, H); ctx.fillRect(W - SIDE, 0, SIDE, H); ctx.fillRect(0, 0, W, TOP);
    ctx.fillStyle = '#6a5fc0'; ctx.fillRect(SIDE - 2, TOP, 2, H); ctx.fillRect(W - SIDE, TOP, 2, H); ctx.fillRect(SIDE, TOP - 2, W - SIDE * 2, 2);
    for (const b of bricks) {
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x, b.y, b.w, 2);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(b.x, b.y + b.h - 2, b.w, 2);
      if (b.type === 's') {
        ctx.fillStyle = 'rgba(20,15,42,.55)'; ctx.fillRect(b.x + 3, b.y + 4, b.w - 6, 1); ctx.fillRect(b.x + 3, b.y + 7, b.w - 6, 1);
        if (b.hp === 1) { ctx.fillStyle = '#140f2a'; ctx.fillRect(b.x + 12, b.y + 2, 2, 4); ctx.fillRect(b.x + 14, b.y + 6, 2, 4); ctx.fillRect(b.x + 22, b.y + 3, 2, 5); }
      }
      if (b.type === 'm') { ctx.fillStyle = '#d9d4f0'; ctx.fillRect(b.x + 3, b.y + 4, 2, 2); ctx.fillRect(b.x + b.w - 5, b.y + 4, 2, 2); }
    }
    for (const c of caps) {
      ctx.fillStyle = c.c; ctx.fillRect(c.x - 9, c.y - 5, 18, 10);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(c.x - 9, c.y - 5, 18, 2);
      text(ctx, c.k, c.x, c.y + 4, { size: 12, color: '#140f2a', align: 'center', bold: true });
    }
    const px = Math.round(paddle.x - paddle.w / 2), pw = Math.round(paddle.w);
    ctx.fillStyle = '#f3ead7'; ctx.fillRect(px, paddle.y, pw, paddle.h);
    ctx.fillStyle = '#3ee0ff'; ctx.fillRect(px, paddle.y, 6, paddle.h); ctx.fillRect(px + pw - 6, paddle.y, 6, paddle.h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px, paddle.y + paddle.h - 2, pw, 2);
    for (const b of balls) {
      b.trail.forEach(([x, y], i) => { ctx.fillStyle = 'rgba(62,224,255,' + (0.08 + i * 0.06).toFixed(2) + ')'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6); });
      ctx.fillStyle = slowT > 0 ? '#7dff6a' : '#ffffff';
      ctx.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 3, 6, 6);
    }
    fx.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (msgT > 0) text(ctx, msg, W / 2, H / 2 + 30, { size: 24, color: '#ffc845', align: 'center', bold: true, shadow: '#5a1d3c' });
    if (state === 'ready' && Math.floor(t * 2) % 2 === 0) text(ctx, 'TIKLA YA DA BOŞLUK', W / 2, H - 46, { size: 12, color: '#f3ead7', align: 'center' });
  }

  const onKey = (e, down) => {
    if (api.blocked) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.L = down; e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.R = down; e.preventDefault(); }
    else if (down && (e.code === 'Space' || e.code === 'ArrowUp')) { e.preventDefault(); launch(); }
    else if (down && e.code === 'KeyP') api.pause();
  };
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const pm = (e) => { if (api.blocked) return; pointerX = pc.toLocal(e).x; };
  const pu = () => launch();
  stage.addEventListener('pointermove', pm);
  stage.addEventListener('pointerdown', pm);
  stage.addEventListener('pointerup', pu);
  stage.style.touchAction = 'none';

  if (window.__retroDebug) window.__tugla = { leave(n) { let k = 0; bricks = bricks.filter((b) => b.type === 'm' || k++ < n); }, info: () => ({ level, lives, state, bricks: bricks.length }), lose() { lives = 1; balls = []; } };
  const lp = loop(update, render);
  startGame();
  lp.start();
  return {
    wantsAutoPause: true,
    pause() { lp.paused = true; keys.L = keys.R = false; },
    resume() { lp.paused = false; },
    destroy() {
      lp.stop(); clearTimeout(endT);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      stage.removeEventListener('pointermove', pm); stage.removeEventListener('pointerdown', pm); stage.removeEventListener('pointerup', pu);
      stage.style.touchAction = '';
      pc.destroy();
    },
  };
}
