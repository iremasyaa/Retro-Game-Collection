import * as C from '../src/games/satranc/engine.js';
import { initialBoard, genMoves, applyMove, key } from '../src/games/dama/rules.js';
import { chooseMove } from '../src/games/dama/ai.js';
for (const [lw, lb] of [['orta', 'kolay'], ['zor', 'orta']]) {
  const st = C.newGame();
  let res, plies = 0, tmax = 0, ttot = 0;
  const line = [];
  while (true) {
    res = C.result(st);
    if (res.over || plies >= (lw === 'zor' ? 50 : 160)) break;
    const t0 = Date.now();
    const m = C.bestMove(st, st.side > 0 ? lw : lb);
    const dt = Date.now() - t0; tmax = Math.max(tmax, dt); ttot += dt;
    if (plies < 16) line.push(C.san(st, m));
    C.play(st, m); plies++;
  }
  console.log(`chess ${lw} vs ${lb}: plies=${plies} result=${res.kind || 'limit'} winner=${res.winner || '-'} maxMs=${tmax} avgMs=${Math.round(ttot / plies)} opening: ${line.join(' ')}`);
}
for (const [lr, lw] of [['orta', 'kolay'], ['zor', 'orta']]) {
  let b = initialBoard(), side = 1, plies = 0, quiet = 0, tmax = 0, winner = 0;
  const reps = new Map();
  while (plies < 300) {
    const ms = genMoves(b, side);
    if (!ms.length) { winner = -side; break; }
    const t0 = Date.now();
    const m = chooseMove(b, side, side > 0 ? lr : lw);
    tmax = Math.max(tmax, Date.now() - t0);
    if (!ms.some((x) => x.from === m.from && x.path.join() === m.path.join())) { console.log('ILLEGAL AI MOVE'); break; }
    const man = Math.abs(b[m.from]) === 1;
    b = applyMove(b, m); side = -side; plies++;
    quiet = m.caps.length || man ? 0 : quiet + 1;
    const k = key(b, side); reps.set(k, (reps.get(k) || 0) + 1);
    if (quiet >= 80 || reps.get(k) >= 3) { winner = 0; break; }
  }
  console.log(`checkers ${lr} vs ${lw}: plies=${plies} winner=${winner} maxMs=${tmax} red=${b.filter((p) => p > 0).length} white=${b.filter((p) => p < 0).length}`);
}
