export const BAR = 24, OFF = 25;

export function initial() {
  const pts = new Array(24).fill(0);
  pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5;
  pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5;
  return { pts, bar: [0, 0], off: [0, 0] };
}
export const clone = (s) => ({ pts: s.pts.slice(), bar: s.bar.slice(), off: s.off.slice() });
export const sign = (side) => (side === 0 ? 1 : -1);
export const stateKey = (s) => s.pts.join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',');

export function allHome(s, side) {
  if (s.bar[side]) return false;
  const sg = sign(side);
  if (side === 0) { for (let i = 6; i < 24; i++) if (s.pts[i] * sg > 0) return false; }
  else { for (let i = 0; i < 18; i++) if (s.pts[i] * sg > 0) return false; }
  return true;
}

export function singleMoves(s, side, die) {
  const sg = sign(side), out = [];
  const canLand = (t) => s.pts[t] * sg >= -1;
  if (s.bar[side] > 0) {
    const t = side === 0 ? 24 - die : die - 1;
    if (canLand(t)) out.push({ from: BAR, to: t, die, hit: s.pts[t] * sg === -1 });
    return out;
  }
  const home = allHome(s, side);
  for (let i = 0; i < 24; i++) {
    if (s.pts[i] * sg <= 0) continue;
    const t = side === 0 ? i - die : i + die;
    if (t >= 0 && t <= 23) {
      if (canLand(t)) out.push({ from: i, to: t, die, hit: s.pts[t] * sg === -1 });
    } else if (home) {
      const exact = side === 0 ? t === -1 : t === 24;
      let ok = exact;
      if (!exact) {
        ok = true;
        if (side === 0) { for (let j = i + 1; j <= 5; j++) if (s.pts[j] > 0) { ok = false; break; } }
        else { for (let j = 18; j < i; j++) if (s.pts[j] < 0) { ok = false; break; } }
      }
      if (ok) out.push({ from: i, to: OFF, die, hit: false });
    }
  }
  return out;
}

export function applySingle(s, side, m) {
  const n = clone(s), sg = sign(side);
  if (m.from === BAR) n.bar[side]--; else n.pts[m.from] -= sg;
  if (m.to === OFF) n.off[side]++;
  else {
    if (n.pts[m.to] * sg === -1) { n.pts[m.to] = 0; n.bar[1 - side]++; }
    n.pts[m.to] += sg;
  }
  return n;
}

export function turns(s, side, dice) {
  const dl = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
  const res = [];
  let maxLen = 0;
  const rec = (st, rem, seq) => {
    let moved = false;
    const tried = new Set();
    for (let k = 0; k < rem.length; k++) {
      const d = rem[k];
      if (tried.has(d)) continue;
      tried.add(d);
      const singles = singleMoves(st, side, d);
      if (!singles.length) continue;
      const rest = rem.slice(0, k).concat(rem.slice(k + 1));
      for (const m of singles) { moved = true; rec(applySingle(st, side, m), rest, seq.concat([m])); }
    }
    if (!moved) { res.push({ seq, state: st }); if (seq.length > maxLen) maxLen = seq.length; }
  };
  rec(s, dl, []);
  let valid = res.filter((r) => r.seq.length === maxLen);
  if (maxLen === 1 && dice[0] !== dice[1]) {
    const hi = Math.max(dice[0], dice[1]);
    if (valid.some((r) => r.seq[0].die === hi)) valid = valid.filter((r) => r.seq[0].die === hi);
  }
  return valid;
}

export const sameMove = (a, b) => a.from === b.from && a.to === b.to && a.die === b.die;

export function pips(s, side) {
  let p = s.bar[side] * 25;
  for (let i = 0; i < 24; i++) {
    const c = s.pts[i] * sign(side);
    if (c > 0) p += c * (side === 0 ? i + 1 : 24 - i);
  }
  return p;
}

export function winner(s) {
  if (s.off[0] === 15) return { side: 0, mars: s.off[1] === 0 };
  if (s.off[1] === 15) return { side: 1, mars: s.off[0] === 0 };
  return null;
}
