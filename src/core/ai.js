import WORKER_SRC from 'virtual:ai-worker';

let worker = null, failed = false, seq = 0;
const pending = new Map();

function getWorker() {
  if (worker || failed) return worker;
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.fallback(); else p.resolve(e.data.result);
    };
    worker.onerror = () => {
      failed = true; worker = null;
      const list = [...pending.values()]; pending.clear();
      list.forEach((p) => p.fallback());
    };
  } catch (e) { failed = true; worker = null; }
  return worker;
}

export function runAI(kind, args, fallbackFn) {
  if (typeof window !== 'undefined' && window.__retroDebug) window.__aiWorker = !!getWorker();
  return new Promise((resolve) => {
    const fallback = () => setTimeout(() => { try { resolve(fallbackFn()); } catch (err) { console.error(err); resolve(null); } }, 20);
    const w = getWorker();
    if (!w) { fallback(); return; }
    const id = ++seq;
    pending.set(id, { resolve, fallback });
    try { w.postMessage({ id, kind, args }); } catch (e) { pending.delete(id); fallback(); }
  });
}
