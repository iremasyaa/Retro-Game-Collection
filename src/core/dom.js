const PROPS = new Set(['disabled', 'hidden', 'value', 'checked', 'tabIndex', 'title', 'type', 'id', 'width', 'height']);

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else for (const s in v) { if (s.startsWith('--')) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'html') el.innerHTML = v;
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const kid of [kids].flat(Infinity)) {
    if (kid == null || kid === false || kid === true) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rand = (n) => Math.floor(Math.random() * n);
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
export const pad = (n, w = 2) => String(n).padStart(w, '0');
export function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }

export function css(id, text) {
  if (document.getElementById('css-' + id)) return;
  const s = document.createElement('style');
  s.id = 'css-' + id;
  s.textContent = text;
  document.head.appendChild(s);
}
