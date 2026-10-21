export const MINDS = {
  kolay: { cap: 4, enc: 0.75, rec: 0.85 },
  orta: { cap: 5, enc: 0.85, rec: 0.9 },
  zor: { cap: 6, enc: 0.95, rec: 0.97 },
};

export function createMind(level, random = Math.random) {
  const { cap, enc, rec } = MINDS[level] || MINDS.orta;
  const mem = new Map();
  return {
    see(i, name) {
      if (random() >= enc) return;
      mem.delete(i);
      mem.set(i, name);
      if (mem.size > cap) mem.delete(mem.keys().next().value);
    },
    forget(i) { mem.delete(i); },
    recall() {
      const out = new Map();
      for (const [i, name] of mem) if (random() < rec) out.set(i, name);
      return out;
    },
  };
}

const pickFrom = (list, random) => list[Math.floor(random() * list.length)];

export function knownPair(known, closed) {
  const seen = new Map();
  for (const [i, name] of known) {
    if (!closed.includes(i)) continue;
    if (seen.has(name)) return [seen.get(name), i];
    seen.set(name, i);
  }
  return null;
}

export function pickFirst(known, closed, random = Math.random) {
  const unknown = closed.filter((i) => !known.has(i));
  return pickFrom(unknown.length ? unknown : closed, random);
}

export function pickSecond(known, closed, first, name, random = Math.random) {
  for (const [i, n] of known) if (n === name && i !== first && closed.includes(i)) return i;
  const rest = closed.filter((i) => i !== first);
  const unknown = rest.filter((i) => !known.has(i));
  return pickFrom(unknown.length ? unknown : rest, random);
}
