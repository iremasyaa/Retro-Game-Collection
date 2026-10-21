import { turns, pips, sign, stateKey } from './rules.js';

const SHOT = [0, 11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1];

function sideScore(s, side) {
  const sg = sign(side), opp = 1 - side;
  let score = 0;
  let run = 0, homePts = 0;
  for (let k = 0; k < 24; k++) {
    const i = side === 0 ? k : 23 - k;
    const c = s.pts[i] * sg;
    if (c >= 2) {
      score += k < 6 ? 6 : 3;
      if (k === 4 || k === 6) score += 3;
      if (k < 6) homePts++;
      run++;
      if (run >= 2) score += run * 1.4;
    } else run = 0;
    if (c > 3) score -= (c - 3) * 1.6;
  }
  for (let i = 0; i < 24; i++) {
    if (s.pts[i] * sg !== 1) continue;
    let miss = 1;
    for (let j = 0; j < 24; j++) {
      if (s.pts[j] * sg >= 0) continue;
      const d = side === 0 ? i - j : j - i;
      if (d > 0 && d <= 24 && SHOT[d]) miss *= 1 - SHOT[d] / 36;
    }
    if (s.bar[opp]) { const d = side === 0 ? i + 1 : 24 - i; if (SHOT[d]) miss *= 1 - SHOT[d] / 36; }
    const p = 1 - miss;
    if (p > 0) {
      const travelled = side === 0 ? 24 - i : i + 1;
      score -= p * (travelled * 0.9 + 8);
    }
  }
  score += s.bar[opp] * homePts * 3.5;
  score -= s.bar[side] * 6;
  return score;
}

function contact(s) {
  if (s.bar[0] || s.bar[1]) return true;
  let maxWhite = -1, minBlack = 99;
  for (let i = 0; i < 24; i++) { if (s.pts[i] > 0) maxWhite = i; if (s.pts[i] < 0 && minBlack === 99) minBlack = i; }
  return maxWhite > minBlack;
}

export function evaluate(s, side) {
  const opp = 1 - side;
  const race = pips(s, opp) - pips(s, side);
  if (!contact(s)) return race * 1.6 + (s.off[side] - s.off[opp]) * 4;
  return race + sideScore(s, side) - sideScore(s, opp) + (s.off[side] - s.off[opp]) * 3;
}

const ROLLS = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([[a, b], a === b ? 1 / 36 : 2 / 36]);

function unique(list) {
  const seen = new Map();
  for (const t of list) { const k = stateKey(t.state); if (!seen.has(k)) seen.set(k, t); }
  return [...seen.values()];
}

const TEMP = { kolay: 7, orta: 4 };

function softPick(scored, temp) {
  const top = scored[0].v;
  const w = scored.map((x) => Math.exp((x.v - top) / temp));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < scored.length; i++) { r -= w[i]; if (r <= 0) return scored[i]; }
  return scored[0];
}

export function chooseTurn(s, side, dice, level = 'orta') {
  const all = unique(turns(s, side, dice));
  if (!all.length || !all[0].seq.length) return [];
  const scored = all.map((t) => ({ t, v: evaluate(t.state, side) })).sort((a, b) => b.v - a.v);
  if (level === 'zor') {
    if (scored.length === 1) return scored[0].t.seq;
    let best = null, bestV = -Infinity;
    for (const c of scored.slice(0, 6)) {
      let ev = 0;
      for (const [r, p] of ROLLS) {
        const replies = unique(turns(c.t.state, 1 - side, r));
        let worst = Infinity;
        for (const rp of replies) { const v = evaluate(rp.state, side); if (v < worst) worst = v; }
        if (worst === Infinity) worst = evaluate(c.t.state, side);
        ev += p * worst;
      }
      if (ev > bestV) { bestV = ev; best = c; }
    }
    return best.t.seq;
  }
  return softPick(scored, TEMP[level] || TEMP.orta).t.seq;
}
