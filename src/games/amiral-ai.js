import { rand, shuffle } from '../core/dom.js';

export const N = 10;
export const SHIPS = [['UÇAK GEMİSİ', 5], ['KRUVAZÖR', 4], ['MUHRİP', 3], ['DENİZALTI', 3], ['HÜCUMBOT', 2]];

export function newPlayer() {
  return { ships: [], grid: new Int8Array(N * N).fill(-1), shots: new Int8Array(N * N) };
}
export const cellsFor = (x, y, len, horiz) => {
  const out = [];
  for (let k = 0; k < len; k++) {
    const cx = x + (horiz ? k : 0), cy = y + (horiz ? 0 : k);
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return null;
    out.push(cy * N + cx);
  }
  return out;
};
export function canPlace(p, cells, ignore = -1, noTouch = false) {
  if (!cells) return false;
  for (const i of cells) {
    if (p.grid[i] >= 0 && p.grid[i] !== ignore) return false;
    if (noTouch) {
      const x = i % N, y = (i / N) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const g = p.grid[ny * N + nx];
        if (g >= 0 && g !== ignore) return false;
      }
    }
  }
  return true;
}
export function placeShip(p, si, cells, horiz) {
  const s = p.ships[si];
  if (s && s.cells) for (const i of s.cells) p.grid[i] = -1;
  p.ships[si] = { name: SHIPS[si][0], len: SHIPS[si][1], cells, horiz, hits: 0, sunk: false };
  for (const i of cells) p.grid[i] = si;
}
export function removeShip(p, si) {
  const s = p.ships[si];
  if (!s) return;
  for (const i of s.cells) p.grid[i] = -1;
  p.ships[si] = null;
}
export function randomFleet(p) {
  for (let attempt = 0; attempt < 200; attempt++) {
    p.grid.fill(-1); p.ships = [];
    let ok = true;
    for (let si = 0; si < SHIPS.length && ok; si++) {
      ok = false;
      for (let tries = 0; tries < 300; tries++) {
        const horiz = Math.random() < 0.5;
        const cells = cellsFor(rand(N), rand(N), SHIPS[si][1], horiz);
        if (canPlace(p, cells, -1, true)) { placeShip(p, si, cells, horiz); ok = true; break; }
      }
    }
    if (ok) return;
  }
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function lineShot(target, openHits, free, sunkCell) {
  for (const hc of shuffle(openHits.slice())) {
    const x = hc % N, y = (hc / N) | 0;
    for (const [dx, dy] of shuffle(STEPS.slice())) {
      const bx = x - dx, by = y - dy;
      if (bx >= 0 && by >= 0 && bx < N && by < N && target.shots[by * N + bx] === 2 && !sunkCell(by * N + bx)) {
        let cx = x + dx, cy = y + dy;
        while (cx >= 0 && cy >= 0 && cx < N && cy < N && target.shots[cy * N + cx] === 2) { cx += dx; cy += dy; }
        if (free(cx, cy)) return cy * N + cx;
      }
    }
  }
  for (const hc of shuffle(openHits.slice())) {
    const x = hc % N, y = (hc / N) | 0;
    for (const [dx, dy] of shuffle(STEPS.slice())) if (free(x + dx, y + dy)) return (y + dy) * N + x + dx;
  }
  return -1;
}

function densityShot(target, avail, openHits, sunkCell) {
  const score = new Float32Array(N * N);
  const remaining = target.ships.filter((s) => !s.sunk).map((s) => s.len);
  for (const len of remaining) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const horiz of [true, false]) {
      const cells = cellsFor(x, y, len, horiz);
      if (!cells) continue;
      let ok = true, covers = 0;
      for (const i of cells) {
        if (target.shots[i] === 1 || (target.shots[i] === 2 && sunkCell(i))) { ok = false; break; }
        if (target.shots[i] === 2) covers++;
      }
      if (!ok) continue;
      if (openHits.length && !covers) continue;
      const w = 1 + covers * 30;
      for (const i of cells) if (!target.shots[i]) score[i] += w;
    }
  }
  let best = -1, bestV = -1;
  for (const i of shuffle(avail.slice())) if (score[i] > bestV) { bestV = score[i]; best = i; }
  return best >= 0 ? best : avail[rand(avail.length)];
}

export function aiPick(target, level) {
  const avail = [], openHits = [];
  const sunkCell = (i) => target.grid[i] >= 0 && target.ships[target.grid[i]].sunk;
  for (let i = 0; i < N * N; i++) {
    if (!target.shots[i]) avail.push(i);
    else if (target.shots[i] === 2 && !sunkCell(i)) openHits.push(i);
  }
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !target.shots[y * N + x];
  if (level === 'kolay') {
    if (openHits.length && Math.random() < 0.5) {
      const hcell = openHits[rand(openHits.length)];
      const x = hcell % N, y = (hcell / N) | 0;
      const nb = shuffle(STEPS.slice()).map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => free(a, b));
      if (nb.length) return nb[0][1] * N + nb[0][0];
    }
    return avail[rand(avail.length)];
  }
  if (level === 'zor' && Math.random() < 0.5) return densityShot(target, avail, openHits, sunkCell);
  if (openHits.length) {
    const shot = lineShot(target, openHits, free, sunkCell);
    if (shot >= 0) return shot;
  }
  const pool = level === 'zor' ? avail.filter((i) => ((i % N) + ((i / N) | 0)) % 2 === 0) : [];
  return pool.length ? pool[rand(pool.length)] : avail[rand(avail.length)];
}
