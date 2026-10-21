export const RED = 1, WHITE = -1;

export function initialBoard() {
  const b = new Array(64).fill(0);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 !== 1) continue;
    if (r < 3) b[r * 8 + c] = WHITE;
    else if (r > 4) b[r * 8 + c] = RED;
  }
  return b;
}

const KDIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const dirsFor = (p) => (Math.abs(p) === 2 ? KDIRS : p > 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

function jumps(b, sq, piece, start, path, caps, out) {
  const r = sq >> 3, c = sq & 7, side = Math.sign(piece), king = Math.abs(piece) === 2;
  let found = false;
  for (const [dr, dc] of dirsFor(piece)) {
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
    const mid = (r + dr) * 8 + (c + dc), land = lr * 8 + lc;
    if (b[mid] * side >= 0 || caps.includes(mid)) continue;
    if (b[land] !== 0 && land !== start) continue;
    found = true;
    const np = path.concat(land), nc = caps.concat(mid);
    const promote = !king && ((side > 0 && lr === 0) || (side < 0 && lr === 7));
    if (promote) out.push({ from: start, path: np, caps: nc, promote: true });
    else jumps(b, land, piece, start, np, nc, out);
  }
  if (!found && path.length) out.push({ from: start, path, caps, promote: false });
}

export function genMoves(b, side) {
  const caps = [];
  for (let sq = 0; sq < 64; sq++) if (b[sq] * side > 0) jumps(b, sq, b[sq], sq, [], [], caps);
  if (caps.length) return caps;
  const out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (p * side <= 0) continue;
    const r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of dirsFor(p)) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const to = nr * 8 + nc;
      if (b[to] !== 0) continue;
      const promote = Math.abs(p) === 1 && ((p > 0 && nr === 0) || (p < 0 && nr === 7));
      out.push({ from: sq, path: [to], caps: [], promote });
    }
  }
  return out;
}

export function applyMove(b, m) {
  const nb = b.slice();
  const piece = nb[m.from];
  nb[m.from] = 0;
  for (const c of m.caps) nb[c] = 0;
  nb[m.path[m.path.length - 1]] = m.promote ? piece * 2 : piece;
  return nb;
}

export const key = (b, side) => b.join(',') + '|' + side;
export const sameMove = (a, b) => a.from === b.from && a.path.length === b.path.length && a.path.every((x, i) => x === b.path[i]);
