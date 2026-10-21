import { genMoves, applyMove } from './rules.js';

function evaluate(b, side) {
  let s = 0, red = 0, white = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const r = sq >> 3, c = sq & 7;
    let v;
    if (Math.abs(p) === 2) {
      v = 175 + (3.5 - Math.abs(3.5 - c)) * 2 + (3.5 - Math.abs(3.5 - r)) * 2;
    } else {
      const adv = p > 0 ? 7 - r : r;
      v = 100 + adv * 4;
      if ((p > 0 && r === 7) || (p < 0 && r === 0)) v += 12;
      if (c === 0 || c === 7) v -= 4;
    }
    if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 3;
    if (p > 0) { s += v; red++; } else { s -= v; white++; }
  }
  if (red !== white) s += (red > white ? 1 : -1) * (24 - red - white) * 3;
  return s * side;
}

const WIN = 100000;

const LEVELS = {
  kolay: { depth: 1, random: 0.12 },
  orta: { depth: 3 },
  zor: { depth: 8 },
};

export function chooseMove(board, side, level = 'orta', budgetMs = 2000) {
  const moves = genMoves(board, side);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const cfg = LEVELS[level] || LEVELS.orta;
  if (cfg.random && Math.random() < cfg.random) return moves[Math.floor(Math.random() * moves.length)];
  const deadline = Date.now() + budgetMs;
  let nodes = 0, stop = false;

  function search(b, s, depth, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    const ms = genMoves(b, s);
    if (!ms.length) return -WIN + ply;
    const forced = ms[0].caps.length > 0;
    if (depth <= 0 && !forced) return evaluate(b, s);
    if (depth <= -6) return evaluate(b, s);
    ms.sort((x, y) => y.caps.length - x.caps.length + (y.promote ? 1 : 0) - (x.promote ? 1 : 0));
    let best = -Infinity;
    for (const m of ms) {
      const v = -search(applyMove(b, m), -s, depth - 1, -beta, -alpha, ply + 1);
      if (stop) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  let bestMoves = moves.map((m) => ({ m, v: 0 }));
  for (let d = 1; d <= cfg.depth; d++) {
    const scored = [];
    let best = -Infinity;
    for (const { m } of bestMoves) {
      const alpha = best - 1;
      let v = -search(applyMove(board, m), -side, d - 1, -Infinity, -alpha, 1);
      if (stop) break;
      if (best !== -Infinity && v <= alpha) v = alpha - 1;
      if (v > best) best = v;
      scored.push({ m, v });
    }
    if (stop) break;
    scored.sort((a, b) => b.v - a.v);
    bestMoves = scored;
    if (Math.abs(scored[0].v) > WIN - 100) break;
  }
  const top = bestMoves[0].v;
  const pool = bestMoves.filter((x) => x.v >= top - 1);
  return pool[Math.floor(Math.random() * pool.length)].m;
}
