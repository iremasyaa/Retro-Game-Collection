import { boot, currentRoute } from './core/shell.js';

function start(data) {
  let root = document.getElementById('app');
  if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
  boot(root, data || {});
}
const hot = (typeof window !== 'undefined' && window.claude && window.claude.hot) || null;
if (hot && hot.snapshot) { try { hot.snapshot(() => ({ route: currentRoute() })); } catch (e) { } }
const fontsReady = (document.fonts && document.fonts.load)
  ? Promise.all([document.fonts.load('400 24px RetroPix'), document.fonts.load('700 24px RetroPix')]).catch(() => {})
  : Promise.resolve();
let started = false;
const go = (data) => { if (!started) { started = true; start(data); } };
const begin = (data) => { fontsReady.then(() => go(data)); setTimeout(() => go(data), 1500); };
if (hot && hot.ready) hot.ready(begin); else begin((hot && hot.data) || {});
