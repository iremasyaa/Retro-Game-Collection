import { newGame, perft, legalMoves, san, play, result, bestMove, evaluate } from '../src/games/satranc/engine.js';
const cases = [
  [null, [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
let ok = true;
for (const [fen, exp] of cases) {
  const st = newGame(fen || undefined);
  exp.forEach((e, i) => {
    const t0 = Date.now();
    const n = perft(st, i + 1);
    const good = n === e;
    if (!good) ok = false;
    console.log((good ? 'OK ' : 'BAD') + ' depth ' + (i + 1) + ': ' + n + ' (exp ' + e + ') ' + (Date.now() - t0) + 'ms  ' + (fen || 'startpos').slice(0, 30));
  });
}
const st = newGame();
const names = legalMoves(st).map((m) => san(st, m)).sort();
console.log('start SAN:', names.join(' '));
const g = newGame();
for (const want of ['f3', 'e5', 'g4', 'Vh4#']) {
  const ms = legalMoves(g);
  const m = ms.find((x) => san(g, x, ms) === want);
  if (!m) { console.log('missing move', want, ms.map((x) => san(g, x, ms)).join(',')); ok = false; break; }
  play(g, m);
}
console.log('fools mate result:', JSON.stringify(result(g)).slice(0, 80));
for (const lvl of ['kolay', 'orta', 'zor']) {
  const s = newGame('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
  const t0 = Date.now();
  const m = bestMove(s, lvl);
  console.log('AI', lvl, san(s, m), (Date.now() - t0) + 'ms');
}
const s2 = newGame('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
const mm = bestMove(s2, 'orta');
console.log('mate-in-1 found:', san(s2, mm));
console.log(ok ? 'ALL OK' : 'FAILURES');
