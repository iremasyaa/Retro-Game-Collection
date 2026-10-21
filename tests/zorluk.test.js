import { createMind, knownPair, pickFirst, pickSecond } from '../src/games/hafiza-ai.js';
import { newPlayer, randomFleet, aiPick } from '../src/games/amiral-ai.js';
import * as chess from '../src/games/satranc/engine.js';
import { initialBoard, genMoves, applyMove, key } from '../src/games/dama/rules.js';
import { chooseMove } from '../src/games/dama/ai.js';
import { initial, applySingle, winner } from '../src/games/tavla/rules.js';
import { chooseTurn } from '../src/games/tavla/ai.js';

const LEVELS = ['kolay', 'orta', 'zor'];
let ok = true;
const check = (cond, msg) => { if (!cond) { ok = false; console.log('FAIL', msg); } };
const pct = (x) => Math.round(100 * x);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function memoryGame(pairs, level) {
  const deck = shuffle([...Array(pairs).keys(), ...Array(pairs).keys()]);
  const matched = new Array(deck.length).fill(false);
  const minds = [createMind('orta'), createMind(level)];
  const scores = [0, 0];
  let turn = 0, left = pairs;
  const closed = (except = -1) => deck.map((_, i) => i).filter((i) => !matched[i] && i !== except);
  const reveal = (i) => minds.forEach((m) => m.see(i, deck[i]));
  while (left) {
    const mind = minds[turn];
    const known = mind.recall();
    let [a, b] = knownPair(known, closed()) || [-1, -1];
    if (a < 0) {
      a = pickFirst(known, closed());
      reveal(a);
      b = pickSecond(mind.recall(), closed(a), a, deck[a]);
      reveal(b);
    } else { reveal(a); reveal(b); }
    if (deck[a] === deck[b]) {
      matched[a] = matched[b] = true; left--; scores[turn]++;
      minds.forEach((m) => { m.forget(a); m.forget(b); });
    } else turn = 1 - turn;
  }
  return scores[1] / pairs;
}

function battleship(level) {
  const fire = (t, i) => {
    const si = t.grid[i];
    if (si < 0) { t.shots[i] = 1; return; }
    t.shots[i] = 2;
    const s = t.ships[si];
    if (++s.hits === s.len) s.sunk = true;
  };
  const boards = [newPlayer(), newPlayer()];
  boards.forEach(randomFleet);
  for (;;) {
    fire(boards[1], aiPick(boards[1], 'orta'));
    if (boards[1].ships.every((s) => s.sunk)) return 0;
    fire(boards[0], aiPick(boards[0], level));
    if (boards[0].ships.every((s) => s.sunk)) return 1;
  }
}

const OPENINGS = ['e2e4 e7e5', 'd2d4 d7d5', 'e2e4 c7c5', 'c2c4 e7e5', 'g1f3 d7d5', 'e2e4 e7e6'];
const sq = (s) => (8 - +s[1]) * 16 + 'abcdefgh'.indexOf(s[0]);
function chessGame(white, black, opening) {
  const st = chess.newGame();
  for (const u of opening.split(' ')) chess.play(st, chess.legalMoves(st).find((m) => m.from === sq(u) && m.to === sq(u.slice(2))));
  for (let ply = 0; ply < 300; ply++) {
    const r = chess.result(st);
    if (r.over) return r.winner === 1 ? 1 : r.winner === -1 ? 0 : 0.5;
    chess.play(st, chess.bestMove(st, st.side > 0 ? white : black));
  }
  return 0.5;
}

function damaGame(red, white) {
  let b = initialBoard(), side = 1, quiet = 0;
  const reps = new Map();
  for (let i = 0; i < 2; i++) { const ms = genMoves(b, side); b = applyMove(b, ms[Math.floor(Math.random() * ms.length)]); side = -side; }
  for (let ply = 0; ply < 400; ply++) {
    if (!genMoves(b, side).length) return side < 0 ? 1 : 0;
    const m = chooseMove(b, side, side > 0 ? red : white);
    const man = Math.abs(b[m.from]) === 1;
    b = applyMove(b, m); side = -side;
    quiet = m.caps.length || m.promote || man ? 0 : quiet + 1;
    const k = key(b, side);
    reps.set(k, (reps.get(k) || 0) + 1);
    if (quiet >= 80 || reps.get(k) >= 3) return 0.5;
  }
  return 0.5;
}

function tavlaGame(first, second) {
  let s = initial(), side = 0;
  const lv = [first, second];
  for (;;) {
    const dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    for (const m of chooseTurn(s, side, dice, lv[side])) s = applySingle(s, side, m);
    const w = winner(s);
    if (w) return w.side === 0 ? 1 : 0;
    side = 1 - side;
  }
}

function match(play, weak, strong, games) {
  let score = 0;
  for (let g = 0; g < games; g++) score += g % 2 ? 1 - play(weak, strong, g) : play(strong, weak, g);
  return score / games;
}

console.log('KART EŞLEŞTİRME (24 kart, ortalama oyuncuya karşı bilgisayarın bulduğu çift oranı)');
const memo = LEVELS.map((lv) => { let s = 0; for (let g = 0; g < 3000; g++) s += memoryGame(12, lv); return s / 3000; });
LEVELS.forEach((lv, i) => console.log('  ' + lv.padEnd(6) + '%' + pct(memo[i])));
check(memo[0] < 0.44 && memo[1] > 0.44 && memo[1] < 0.56 && memo[2] > 0.56, 'kart eşleştirme seviyeleri');
check(Math.abs((memo[1] - memo[0]) - (memo[2] - memo[1])) < 0.06, 'kart eşleştirme adımları eşit');

console.log('AMİRAL BATTI (ilk atışı yapan ortalama oyuncuya karşı bilgisayarın kazanma oranı)');
const ship = LEVELS.map((lv) => { let w = 0; for (let g = 0; g < 2000; g++) w += battleship(lv); return w / 2000; });
LEVELS.forEach((lv, i) => console.log('  ' + lv.padEnd(6) + '%' + pct(ship[i])));
check(ship[0] < 0.36 && ship[1] > 0.4 && ship[1] < 0.6 && ship[2] > 0.64, 'amiral battı seviyeleri');
check(Math.abs((ship[1] - ship[0]) - (ship[2] - ship[1])) < 0.1, 'amiral battı adımları eşit');

const pairs = [['kolay', 'orta'], ['orta', 'zor']];
console.log('SATRANÇ (üst seviyenin bir alttakine karşı puanı)');
for (const [a, b] of pairs) {
  const s = match((w, bl, g) => chessGame(w, bl, OPENINGS[(g >> 1) % OPENINGS.length]), a, b, 24);
  console.log('  ' + b.padEnd(5) + ' > ' + a.padEnd(6) + '%' + pct(s));
  check(s >= 0.75, 'satranç ' + b + ' > ' + a);
}

console.log('DAMA (üst seviyenin bir alttakine karşı puanı)');
for (const [a, b] of pairs) {
  const s = match((r, w) => damaGame(r, w), a, b, b === 'zor' ? 12 : 24);
  console.log('  ' + b.padEnd(5) + ' > ' + a.padEnd(6) + '%' + pct(s));
  check(s >= 0.75, 'dama ' + b + ' > ' + a);
}

console.log('TAVLA (orta seviyenin kolaya karşı el kazanma oranı)');
const tv = match((x, y) => tavlaGame(x, y), 'kolay', 'orta', 1000);
console.log('  orta  > kolay %' + pct(tv));
check(tv > 0.55 && tv < 0.75, 'tavla orta > kolay');

console.log(ok ? 'ALL OK' : 'FAILURES');
