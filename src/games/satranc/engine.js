export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
export const WHITE = 1, BLACK = -1;
const KN = [-33, -31, -18, -14, 14, 18, 31, 33];
const BD = [-17, -15, 15, 17], RD = [-16, -1, 1, 16], QD = [-17, -16, -15, -1, 1, 15, 16, 17];
const VAL = [0, 100, 320, 330, 500, 900, 0];
export const LETTER = ['', '', 'A', 'F', 'K', 'V', 'Ş'];
const FILES = 'abcdefgh';
export const sqName = (s) => FILES[s & 7] + (8 - (s >> 4));
export const to64 = (s) => (s >> 4) * 8 + (s & 7);
export const from64 = (i) => ((i >> 3) << 4) | (i & 7);

const CASTLE_MASK = new Uint8Array(128).fill(15);
CASTLE_MASK[0x74] = 12; CASTLE_MASK[0x77] = 14; CASTLE_MASK[0x70] = 13;
CASTLE_MASK[0x04] = 3; CASTLE_MASK[0x07] = 11; CASTLE_MASK[0x00] = 7;

export function newGame(fen) {
  const st = { b: new Int8Array(128), side: WHITE, castle: 15, ep: -1, half: 0, full: 1, kw: 0x74, kb: 0x04, hist: [], keys: [] };
  if (fen) loadFen(st, fen);
  else {
    const back = [R, N, B, Q, K, B, N, R];
    for (let c = 0; c < 8; c++) {
      st.b[c] = -back[c]; st.b[16 + c] = -P;
      st.b[0x60 + c] = P; st.b[0x70 + c] = back[c];
    }
  }
  st.keys.push(posKey(st));
  return st;
}

export function loadFen(st, fen) {
  const [pos, side, cas, ep, half, full] = fen.split(' ');
  st.b.fill(0);
  const map = { p: P, n: N, b: B, r: R, q: Q, k: K };
  let r = 0, c = 0;
  for (const ch of pos) {
    if (ch === '/') { r++; c = 0; continue; }
    if (/\d/.test(ch)) { c += +ch; continue; }
    const v = map[ch.toLowerCase()];
    const s = r * 16 + c;
    st.b[s] = ch === ch.toUpperCase() ? v : -v;
    if (v === K) { if (ch === 'K') st.kw = s; else st.kb = s; }
    c++;
  }
  st.side = side === 'b' ? BLACK : WHITE;
  st.castle = (cas.includes('K') ? 1 : 0) | (cas.includes('Q') ? 2 : 0) | (cas.includes('k') ? 4 : 0) | (cas.includes('q') ? 8 : 0);
  st.ep = ep && ep !== '-' ? (8 - +ep[1]) * 16 + FILES.indexOf(ep[0]) : -1;
  st.half = +(half || 0); st.full = +(full || 1);
}

export function posKey(st) {
  let s = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) s += String.fromCharCode(72 + st.b[r * 16 + c]);
  return s + st.side + st.castle + st.ep;
}

export function attacked(st, sq, by) {
  const b = st.b;
  if (by > 0) {
    if (!((sq + 15) & 0x88) && b[sq + 15] === P) return true;
    if (!((sq + 17) & 0x88) && b[sq + 17] === P) return true;
  } else {
    if (!((sq - 15) & 0x88) && b[sq - 15] === -P) return true;
    if (!((sq - 17) & 0x88) && b[sq - 17] === -P) return true;
  }
  for (const o of KN) { const t = sq + o; if (!(t & 0x88) && b[t] === N * by) return true; }
  for (const o of QD) { const t = sq + o; if (!(t & 0x88) && b[t] === K * by) return true; }
  for (const o of BD) {
    let t = sq + o;
    while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === B * by || p === Q * by) return true; break; } t += o; }
  }
  for (const o of RD) {
    let t = sq + o;
    while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === R * by || p === Q * by) return true; break; } t += o; }
  }
  return false;
}

export const inCheck = (st, side = st.side) => attacked(st, side > 0 ? st.kw : st.kb, -side);

function add(list, from, to, piece, cap, promo, flag) { list.push({ from, to, piece, cap, promo, flag }); }

export function genPseudo(st, capturesOnly = false) {
  const b = st.b, s = st.side, out = [];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p || (p > 0) !== (s > 0)) continue;
    const t0 = p * s;
    if (t0 === P) {
      const dir = s > 0 ? -16 : 16, promoR = s > 0 ? 0 : 7, startR = s > 0 ? 6 : 1;
      const one = sq + dir;
      if (!(one & 0x88) && !b[one]) {
        if ((one >> 4) === promoR) for (const pr of [Q, R, B, N]) add(out, sq, one, p, 0, pr * s, 0);
        else if (!capturesOnly) {
          add(out, sq, one, p, 0, 0, 0);
          const two = one + dir;
          if ((sq >> 4) === startR && !b[two]) add(out, sq, two, p, 0, 0, 4);
        }
      }
      for (const d of [dir - 1, dir + 1]) {
        const t = sq + d;
        if (t & 0x88) continue;
        if (b[t] && (b[t] > 0) !== (s > 0)) {
          if ((t >> 4) === promoR) for (const pr of [Q, R, B, N]) add(out, sq, t, p, b[t], pr * s, 0);
          else add(out, sq, t, p, b[t], 0, 0);
        } else if (t === st.ep) add(out, sq, t, p, -P * s, 0, 1);
      }
    } else if (t0 === N || t0 === K) {
      for (const o of t0 === N ? KN : QD) {
        const t = sq + o;
        if (t & 0x88) continue;
        const q = b[t];
        if (!q) { if (!capturesOnly) add(out, sq, t, p, 0, 0, 0); }
        else if ((q > 0) !== (s > 0)) add(out, sq, t, p, q, 0, 0);
      }
      if (t0 === K && !capturesOnly) {
        if (s > 0 && sq === 0x74) {
          if ((st.castle & 1) && !b[0x75] && !b[0x76] && b[0x77] === R && !attacked(st, 0x74, -1) && !attacked(st, 0x75, -1) && !attacked(st, 0x76, -1)) add(out, sq, 0x76, p, 0, 0, 2);
          if ((st.castle & 2) && !b[0x73] && !b[0x72] && !b[0x71] && b[0x70] === R && !attacked(st, 0x74, -1) && !attacked(st, 0x73, -1) && !attacked(st, 0x72, -1)) add(out, sq, 0x72, p, 0, 0, 3);
        } else if (s < 0 && sq === 0x04) {
          if ((st.castle & 4) && !b[0x05] && !b[0x06] && b[0x07] === -R && !attacked(st, 0x04, 1) && !attacked(st, 0x05, 1) && !attacked(st, 0x06, 1)) add(out, sq, 0x06, p, 0, 0, 2);
          if ((st.castle & 8) && !b[0x03] && !b[0x02] && !b[0x01] && b[0x00] === -R && !attacked(st, 0x04, 1) && !attacked(st, 0x03, 1) && !attacked(st, 0x02, 1)) add(out, sq, 0x02, p, 0, 0, 3);
        }
      }
    } else {
      const dirs = t0 === B ? BD : t0 === R ? RD : QD;
      for (const o of dirs) {
        let t = sq + o;
        while (!(t & 0x88)) {
          const q = b[t];
          if (!q) { if (!capturesOnly) add(out, sq, t, p, 0, 0, 0); }
          else { if ((q > 0) !== (s > 0)) add(out, sq, t, p, q, 0, 0); break; }
          t += o;
        }
      }
    }
  }
  return out;
}

export function make(st, m) {
  const b = st.b, s = st.side;
  const u = { castle: st.castle, ep: st.ep, half: st.half, kw: st.kw, kb: st.kb };
  b[m.to] = m.promo || m.piece;
  b[m.from] = 0;
  if (m.flag === 1) b[m.to + (s > 0 ? 16 : -16)] = 0;
  else if (m.flag === 2) { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = 0; }
  else if (m.flag === 3) { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = 0; }
  if (m.piece === K) st.kw = m.to; else if (m.piece === -K) st.kb = m.to;
  st.castle &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
  st.ep = m.flag === 4 ? (m.from + m.to) >> 1 : -1;
  st.half = m.cap || Math.abs(m.piece) === P ? 0 : st.half + 1;
  if (s < 0) st.full++;
  st.side = -s;
  return u;
}

export function unmake(st, m, u) {
  const b = st.b;
  st.side = -st.side;
  const s = st.side;
  if (s < 0) st.full--;
  b[m.from] = m.piece;
  if (m.flag === 1) { b[m.to] = 0; b[m.to + (s > 0 ? 16 : -16)] = m.cap; }
  else b[m.to] = m.cap;
  if (m.flag === 2) { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = 0; }
  else if (m.flag === 3) { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = 0; }
  st.castle = u.castle; st.ep = u.ep; st.half = u.half; st.kw = u.kw; st.kb = u.kb;
}

export function legalMoves(st) {
  const out = [];
  for (const m of genPseudo(st)) {
    const u = make(st, m);
    if (!inCheck(st, -st.side)) out.push(m);
    unmake(st, m, u);
  }
  return out;
}

export function play(st, m) {
  const u = make(st, m);
  st.hist.push({ m, u });
  st.keys.push(posKey(st));
}
export function takeBack(st) {
  const hst = st.hist.pop();
  if (!hst) return null;
  st.keys.pop();
  unmake(st, hst.m, hst.u);
  return hst.m;
}

export function insufficient(st) {
  const pieces = [];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = st.b[sq];
    if (!p || Math.abs(p) === K) continue;
    if (Math.abs(p) === P || Math.abs(p) === R || Math.abs(p) === Q) return false;
    pieces.push({ p, color: ((sq >> 4) + (sq & 7)) % 2 });
  }
  if (pieces.length <= 1) return true;
  if (pieces.every((x) => Math.abs(x.p) === B) && pieces.every((x) => x.color === pieces[0].color)) return true;
  return false;
}

export function result(st) {
  const moves = legalMoves(st);
  if (!moves.length) return inCheck(st) ? { over: true, kind: 'mat', winner: -st.side } : { over: true, kind: 'pat' };
  if (st.half >= 100) return { over: true, kind: '50' };
  const k = st.keys[st.keys.length - 1];
  if (st.keys.filter((x) => x === k).length >= 3) return { over: true, kind: 'tekrar' };
  if (insufficient(st)) return { over: true, kind: 'malzeme' };
  return { over: false, moves };
}

export function san(st, m, legal) {
  let s;
  if (m.flag === 2) s = 'O-O';
  else if (m.flag === 3) s = 'O-O-O';
  else {
    const t = Math.abs(m.piece);
    s = '';
    if (t !== P) {
      s += LETTER[t];
      const others = (legal || legalMoves(st)).filter((x) => x.to === m.to && x.piece === m.piece && x.from !== m.from);
      if (others.length) {
        const sameFile = others.some((x) => (x.from & 7) === (m.from & 7));
        const sameRank = others.some((x) => (x.from >> 4) === (m.from >> 4));
        if (!sameFile) s += FILES[m.from & 7];
        else if (!sameRank) s += 8 - (m.from >> 4);
        else s += sqName(m.from);
      }
    } else if (m.cap) s += FILES[m.from & 7];
    if (m.cap) s += 'x';
    s += sqName(m.to);
    if (m.promo) s += '=' + LETTER[Math.abs(m.promo)];
  }
  const u = make(st, m);
  const chk = inCheck(st);
  let mate = false;
  if (chk) mate = legalMoves(st).length === 0;
  unmake(st, m, u);
  return s + (mate ? '#' : chk ? '+' : '');
}

export function perft(st, depth) {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of genPseudo(st)) {
    const u = make(st, m);
    if (!inCheck(st, -st.side)) n += perft(st, depth - 1);
    unmake(st, m, u);
  }
  return n;
}

const T = (rows) => Int16Array.from(rows);
const PST = {
  [P]: T([0, 0, 0, 0, 0, 0, 0, 0, 60, 60, 60, 60, 60, 60, 60, 60, 20, 22, 26, 34, 34, 26, 22, 20, 8, 10, 14, 26, 26, 14, 10, 8, 2, 4, 8, 22, 22, 8, 4, 2, 4, 0, -2, 6, 6, -2, 0, 4, 4, 8, 8, -18, -18, 8, 8, 4, 0, 0, 0, 0, 0, 0, 0, 0]),
  [N]: T([-50, -38, -30, -30, -30, -30, -38, -50, -38, -18, 0, 2, 2, 0, -18, -38, -30, 2, 12, 16, 16, 12, 2, -30, -30, 6, 16, 22, 22, 16, 6, -30, -30, 2, 16, 22, 22, 16, 2, -30, -30, 6, 12, 14, 14, 12, 6, -30, -38, -18, 2, 6, 6, 2, -18, -38, -50, -36, -30, -30, -30, -30, -36, -50]),
  [B]: T([-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 6, 10, 10, 6, 0, -10, -10, 6, 6, 10, 10, 6, 6, -10, -10, 0, 10, 12, 12, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 6, 0, 0, 0, 0, 6, -10, -20, -10, -12, -10, -10, -12, -10, -20]),
  [R]: T([0, 0, 0, 4, 4, 0, 0, 0, 8, 12, 12, 12, 12, 12, 12, 8, -4, 0, 0, 0, 0, 0, 0, -4, -4, 0, 0, 0, 0, 0, 0, -4, -4, 0, 0, 0, 0, 0, 0, -4, -4, 0, 0, 0, 0, 0, 0, -4, -4, 0, 0, 0, 0, 0, 0, -4, 0, 0, 2, 6, 6, 4, 0, 0]),
  [Q]: T([-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20]),
  [K]: T([-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 16, 16, 0, 0, 0, 0, 16, 16, 20, 30, 12, 0, 0, 10, 30, 20]),
};
const KEND = T([-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]);

export function evaluate(st) {
  const b = st.b;
  let score = 0, npm = 0, wb = 0, bb = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p) continue;
    const t = Math.abs(p);
    if (t !== P && t !== K) npm += VAL[t];
    if (t === B) { if (p > 0) wb++; else bb++; }
  }
  const endgame = npm <= 1600;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p) continue;
    const t = Math.abs(p);
    const i64 = (sq >> 4) * 8 + (sq & 7);
    const idx = p > 0 ? i64 : (7 - (sq >> 4)) * 8 + (sq & 7);
    const pst = t === K && endgame ? KEND[idx] : PST[t][idx];
    const v = VAL[t] + pst;
    score += p > 0 ? v : -v;
  }
  if (wb >= 2) score += 30;
  if (bb >= 2) score -= 30;
  return score * st.side;
}

const MATE = 100000;
const LEVELS = {
  kolay: { depth: 1, temp: 10 },
  orta: { depth: 2, margin: 8 },
  zor: { depth: 3, margin: 0 },
};

function softPick(pool, top, temp) {
  const w = pool.map((x) => Math.exp((x.v - top) / temp));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[0];
}

export function bestMove(st, level = 'orta', timeMs = 2500) {
  const cfg = LEVELS[level] || LEVELS.orta;
  const deadline = Date.now() + timeMs;
  const root = legalMoves(st);
  if (!root.length) return null;
  if (root.length === 1) return root[0];
  let stop = false, nodes = 0;
  const killers = [];
  const histTab = new Int32Array(128 * 128);
  const path = st.keys.slice(-12);

  const orderScore = (m, ply) => {
    if (m.cap) return 100000 + VAL[Math.abs(m.cap)] * 10 - VAL[Math.abs(m.piece)] / 10;
    if (m.promo) return 90000 + VAL[Math.abs(m.promo)];
    const k = killers[ply];
    if (k && ((k[0] && k[0].from === m.from && k[0].to === m.to) || (k[1] && k[1].from === m.from && k[1].to === m.to))) return 80000;
    return histTab[m.from * 128 + m.to];
  };

  function quiesce(alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    const stand = evaluate(st);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 30) return alpha;
    const ms = genPseudo(st, true);
    ms.sort((a, b) => orderScore(b, ply) - orderScore(a, ply));
    for (const m of ms) {
      const u = make(st, m);
      if (inCheck(st, -st.side)) { unmake(st, m, u); continue; }
      const v = -quiesce(-beta, -alpha, ply + 1);
      unmake(st, m, u);
      if (stop) return 0;
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function search(depth, alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    if (ply > 0) {
      if (st.half >= 100) return 0;
      const key = posKey(st);
      if (path.includes(key)) return 0;
      path.push(key);
    }
    const chk = inCheck(st);
    if (chk && ply < 12) depth++;
    if (depth <= 0) { if (ply > 0) path.pop(); return quiesce(alpha, beta, ply); }
    const ms = genPseudo(st);
    ms.sort((a, b) => orderScore(b, ply) - orderScore(a, ply));
    let legal = 0, best = -Infinity;
    for (const m of ms) {
      const u = make(st, m);
      if (inCheck(st, -st.side)) { unmake(st, m, u); continue; }
      legal++;
      const v = -search(depth - 1, -beta, -alpha, ply + 1);
      unmake(st, m, u);
      if (stop) { if (ply > 0) path.pop(); return 0; }
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!m.cap) {
          const k = killers[ply] || (killers[ply] = [null, null]);
          if (!(k[0] && k[0].from === m.from && k[0].to === m.to)) { k[1] = k[0]; k[0] = m; }
          histTab[m.from * 128 + m.to] += depth * depth;
        }
        break;
      }
    }
    if (ply > 0) path.pop();
    if (!legal) return chk ? -MATE + ply : 0;
    return best;
  }

  const early = st.hist.length < 8 && level !== 'zor';
  const margin = cfg.temp ? cfg.temp * 3 : early ? Math.max(cfg.margin, 25) : cfg.margin;
  let scored = root.map((m) => ({ m, v: 0 }));
  scored.sort((a, b) => orderScore(b.m, 0) - orderScore(a.m, 0));
  for (let d = 1; d <= cfg.depth; d++) {
    const next = [];
    let best = -Infinity;
    for (const { m } of scored) {
      const a = best - margin;
      const u = make(st, m);
      let v = -search(d - 1, -Infinity, -a, 1);
      unmake(st, m, u);
      if (stop) break;
      if (best !== -Infinity && v <= a) v = a - 1;
      if (v > best) best = v;
      next.push({ m, v });
    }
    if (stop) break;
    next.sort((a, b) => b.v - a.v);
    scored = next;
    if (scored[0].v > MATE - 200) break;
  }
  const top = scored[0].v;
  const pool = scored.filter((x) => x.v >= top - margin);
  if (cfg.temp) return softPick(pool, top, cfg.temp).m;
  return pool[Math.floor(Math.random() * pool.length)].m;
}

export function serialize(st) {
  return { b: Array.from(st.b), side: st.side, castle: st.castle, ep: st.ep, half: st.half, full: st.full, kw: st.kw, kb: st.kb, keys: st.keys.slice(-16), histLen: st.hist.length };
}
export function deserialize(o) {
  const st = { b: Int8Array.from(o.b), side: o.side, castle: o.castle, ep: o.ep, half: o.half, full: o.full, kw: o.kw, kb: o.kb, hist: new Array(o.histLen || 0), keys: o.keys };
  return st;
}
export function bestMoveFrom(o, level) { return bestMove(deserialize(o), level); }
