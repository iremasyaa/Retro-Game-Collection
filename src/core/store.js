const NS = 'retro-koleksiyon:';

export function load(key, fallback) {
  try {
    const v = window.localStorage.getItem(NS + key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}
export function save(key, value) {
  try { window.localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { }
}
export function remove(key) {
  try { window.localStorage.removeItem(NS + key); } catch (e) { }
}

const DEFAULTS = { sfx: true, music: true, volume: 0.6, crt: true, pixel3d: true, flip: false };
export const settings = Object.assign({}, DEFAULTS, load('settings', {}));
const listeners = new Set();
export function setSetting(k, v) {
  settings[k] = v;
  save('settings', settings);
  listeners.forEach((fn) => { try { fn(k, v); } catch (e) { console.error(e); } });
}
export function onSetting(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const bests = load('bests', {});
export function getBest(key) { return bests[key]; }
export function submitBest(key, value, lowerIsBetter = false) {
  const cur = bests[key];
  const better = cur == null || (lowerIsBetter ? value < cur : value > cur);
  if (better) { bests[key] = value; save('bests', bests); }
  return better;
}
export function resetBests() { for (const k in bests) delete bests[k]; save('bests', bests); }
