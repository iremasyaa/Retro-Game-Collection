import { chooseMove as damaMove } from '../games/dama/ai.js';
import { bestMoveFrom } from '../games/satranc/engine.js';
import { chooseTurn } from '../games/tavla/ai.js';

const HANDLERS = {
  dama: (args) => damaMove(...args),
  satranc: (args) => bestMoveFrom(args[0], args[1]),
  tavla: (args) => chooseTurn(...args),
};

self.onmessage = (e) => {
  const { id, kind, args } = e.data;
  try {
    const result = HANDLERS[kind](args);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
