import { initial, turns, applySingle, singleMoves, winner, pips, BAR, OFF, clone } from '../src/games/tavla/rules.js';
import { chooseTurn } from '../src/games/tavla/ai.js';
let ok = true;
const check = (c, msg) => { if (!c) { ok = false; console.log('FAIL', msg); } };
const s0 = initial();
const t31 = turns(s0, 0, [3, 1]);
check(t31.length > 10 && t31.every((t) => t.seq.length === 2), 'opening 3-1 uses both dice');
const sb = { pts: new Array(24).fill(0), bar: [1, 0], off: [0, 0] };
sb.pts[18] = -2; sb.pts[19] = -2; sb.pts[0] = 5;
const tb = turns(sb, 0, [6, 5]);
check(tb.length === 1 && tb[0].seq.length === 0, 'blocked entry = no move');
const tb2 = turns(sb, 0, [6, 4]);
check(tb2.every((t) => t.seq[0].from === BAR && t.seq[0].to === 20), 'enter with the open die first');
const so = { pts: new Array(24).fill(0), bar: [0, 0], off: [13, 0] };
so.pts[1] = 1; so.pts[2] = 1; so.pts[23] = -15;
const to = turns(so, 0, [6, 5]);
check(to.length >= 1 && to.every((t) => t.state.off[0] === 15), 'bear off both with high dice');
const sl = { pts: new Array(24).fill(0), bar: [0, 0], off: [0, 0] };
sl.pts[20] = 1; sl.pts[15] = -2; sl.pts[14] = -2; sl.pts[10] = -2; sl.pts[16] = -9;
for (const lv of [['kolay', 'orta'], ['orta', 'zor']]) {
  let s = initial(), side = 0, n = 0, maxMs = 0;
  while (!winner(s) && n < 600) {
    const dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const legal = turns(s, side, dice);
    const t0 = Date.now();
    const seq = chooseTurn(s, side, dice, lv[side]);
    maxMs = Math.max(maxMs, Date.now() - t0);
    const okSeq = legal.some((t) => t.seq.length === seq.length && t.seq.every((m, i) => m.from === seq[i].from && m.to === seq[i].to && m.die === seq[i].die));
    if (!okSeq) { console.log('ILLEGAL AI TURN', JSON.stringify(seq), dice); ok = false; break; }
    for (const m of seq) s = applySingle(s, side, m);
    const total = (sd) => s.pts.reduce((a, c) => a + (c * (sd === 0 ? 1 : -1) > 0 ? Math.abs(c) : 0), 0) + s.bar[sd] + s.off[sd];
    if (total(0) !== 15 || total(1) !== 15) { console.log('CHECKER COUNT BROKEN', total(0), total(1)); ok = false; break; }
    side = 1 - side; n++;
  }
  const w = winner(s);
  console.log(`tavla ${lv[0]} vs ${lv[1]}: turns=${n} winner=${w ? w.side : '-'} mars=${w ? w.mars : '-'} maxMs=${maxMs}`);
}
console.log(ok ? 'ALL OK' : 'FAILURES');
