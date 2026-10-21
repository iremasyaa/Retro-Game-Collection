import { h, clear, clamp } from './dom.js';
import { settings, setSetting, onSetting, load, save, resetBests, getBest, submitBest } from './store.js';
import { sfx, music, audio } from './audio.js';
import { cartIcon, CART_COLORS, CART_ACCENTS, isTouch } from './gfx.js';
import { arcade } from './arcade.js';
import { GAMES, gameById, defaultOpts, normalizeOpts, describeOpts } from '../games/registry.js';

let screenEl, current = null, modal = null, introPlayed = false;

let route = { name: 'title', params: {} };
export const currentRoute = () => route;

export function boot(root, data = {}) {
  document.documentElement.lang = 'tr';
  screenEl = h('div', { id: 'screen' });
  root.append(screenEl, h('div', { id: 'crt' }));
  const applyCrt = () => document.body.classList.toggle('no-crt', !settings.crt);
  applyCrt();
  onSetting((k) => { if (k === 'crt') applyCrt(); });
  window.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current && current.autoPause) current.autoPause();
  });
  if (window.__retroDebug) window.__go = go;
  const r = data && data.route;
  if (r && SCREENS[r.name] && r.name !== 'game') go(r.name, r.params);
  else if (r && r.name === 'game' && r.params && gameById(r.params.id)) go('game', r.params);
  else go('title');
}

function go(name, params) {
  route = { name, params: params || {} };
  if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
  closeModal(true);
  clear(screenEl);
  current = SCREENS[name](params || {});
  current.name = name;
  screenEl.append(current.el);
  if (current.start) current.start();
  music.want(!!current.music);
  setTimeout(() => {
    const first = current.el.querySelector('[data-autofocus]') || current.el.querySelector('[data-nav]');
    if (first && first.isConnected && !isTouch()) first.focus({ preventScroll: true });
  }, 0);
}

function onKeyDown(e) {
  if (modal) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (modal.closable !== false) { sfx('back'); closeModal(); } return; }
    if (navKey(e, modal.el)) { e.stopPropagation(); return; }
    e.stopPropagation();
    return;
  }
  if (!current) return;
  if (current.onKey) {
    const r = current.onKey(e);
    if (r === true) { e.preventDefault(); e.stopPropagation(); return; }
    if (r === 'stop') { e.stopPropagation(); return; }
  }
  if (e.key === 'Escape' && current.back) { e.preventDefault(); e.stopPropagation(); sfx('back'); current.back(); return; }
  if (current.nav && navKey(e, current.el)) e.stopPropagation();
}

const DIRS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
function navKey(e, container) {
  const dir = DIRS[e.key];
  if (!dir) return false;
  e.preventDefault();
  const items = [...container.querySelectorAll('[data-nav]')].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!items.length) return true;
  const active = document.activeElement;
  if (!items.includes(active)) { items[0].focus(); sfx('nav'); return true; }
  const r0 = active.getBoundingClientRect();
  const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === active) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - c0.x, dy = r.top + r.height / 2 - c0.y;
    let p, s;
    if (dir === 'L') { p = -dx; s = Math.abs(dy); }
    else if (dir === 'R') { p = dx; s = Math.abs(dy); }
    else if (dir === 'U') { p = -dy; s = Math.abs(dx); }
    else { p = dy; s = Math.abs(dx); }
    if (p <= 4) continue;
    const score = p + s * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); sfx('nav'); }
  return true;
}

function openModal(el, { closable = true, onClose } = {}) {
  closeModal(true);
  const back = h('div', { class: 'modal-back' }, el);
  back.addEventListener('pointerdown', (e) => { if (e.target === back && closable) { sfx('back'); closeModal(); } });
  document.getElementById('app').append(back);
  modal = { el: back, closable, onClose };
  setTimeout(() => {
    const f = el.querySelector('[data-autofocus]') || el.querySelector('[data-nav]');
    if (f && f.isConnected) f.focus({ preventScroll: true });
  }, 0);
}
function closeModal(silent) {
  if (!modal) return;
  const m = modal;
  modal = null;
  m.el.remove();
  if (m.onClose && !silent) m.onClose();
}

function copyIcon(id, scale = 4) {
  const src = cartIcon(id, scale);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

const SCREENS = {
  title() {
    const bg = h('canvas', { class: 'title-bg', 'aria-hidden': 'true' });
    const item = (act, label, auto) => h('button', {
      class: 'tm-item', 'data-nav': '', 'data-autofocus': auto ? '' : null,
      onClick: () => { audio(); sfx('select'); act(); },
    }, h('span', { class: 'cur', 'aria-hidden': 'true' }, '▶'), h('b', null, label), h('span', { class: 'cur', 'aria-hidden': 'true' }, '◀'));
    const el = h('div', { class: 'title-screen' + (introPlayed ? '' : ' intro') }, bg,
      h('h1', { class: 'logo', 'aria-label': 'Retro Oyun Koleksiyonu' },
        h('span', { class: 'logo-top', 'aria-hidden': 'true' }, 'RETRO'),
        h('span', { class: 'logo-main', 'aria-hidden': 'true' }, 'OYUN KOLEKSİYONU')),
      h('nav', { class: 'title-menu', 'aria-label': 'Ana menü' },
        item(() => go('menu'), 'MENÜ', true),
        item(() => go('settings'), 'AYARLAR')),
      h('div', { class: 'title-foot' },
        h('button', { class: 'press blink', tabIndex: -1, onClick: () => { audio(); sfx('select'); go('menu'); } }, isTouch() ? '— DOKUN VE OYNA —' : "— ENTER'A BAS —"),
        isTouch() ? null : h('div', { class: 'keys-hint' }, '↑↓ SEÇ')));
    introPlayed = true;
    const stopScene = arcade(bg);
    const logoTop = el.querySelector('.logo-top');
    const sweep = () => { logoTop.classList.remove('shine'); void logoTop.offsetWidth; logoTop.classList.add('shine'); };
    logoTop.addEventListener('animationend', () => logoTop.classList.remove('shine'));
    const firstSweep = setTimeout(sweep, 1600), sweepTimer = setInterval(sweep, 7000);
    return {
      el, music: true, nav: true,
      destroy() { stopScene(); clearTimeout(firstSweep); clearInterval(sweepTimer); },
      onKey(e) {
        const a = document.activeElement;
        if (e.key === 'Enter' && !(a && a.classList && a.classList.contains('tm-item'))) { audio(); sfx('select'); go('menu'); return true; }
        return false;
      },
    };
  },

  menu(params) {
    const carts = GAMES.map((g) => h('button', {
      class: 'cart', 'data-nav': '', style: { '--c': CART_COLORS[g.id], '--a': CART_ACCENTS[g.id] || CART_COLORS[g.id] },
      'aria-label': g.name + ', ' + g.players.toLocaleLowerCase('tr-TR') + ', ' + g.tag,
      onClick: () => { sfx('select'); modePanel(g); },
    },
    h('span', { class: 'cart-label' }, copyIcon(g.id, 4),
      h('span', { class: 'cart-tag' }, g.tag),
      h('span', { class: 'cart-pl', 'aria-hidden': 'true' }, playerIcons(g))),
    h('span', { class: 'cart-name' }, g.name),
    h('span', { class: 'cart-meta' }, g.players)));
    const el = h('div', { class: 'screen' }, h('div', { class: 'screen-inner' },
      h('header', { class: 'screen-head' },
        h('button', { class: 'btn small', 'data-nav': '', onClick: () => { sfx('back'); go('title'); } }, '◀ GERİ'),
        h('h1', null, 'OYUN SEÇ')),
      h('div', { class: 'carts' }, carts)));
    const fi = Math.max(0, GAMES.findIndex((g) => g.id === params.focus));
    carts[fi].setAttribute('data-autofocus', '');
    return { el, music: true, nav: true, back: () => go('title') };
  },

  settings() {
    const tgl = (key, label) => {
      const b = h('button', { class: 'tgl', role: 'switch', 'data-nav': '', 'aria-label': label }, h('i'));
      const paint = () => b.setAttribute('aria-checked', String(!!settings[key]));
      b.onclick = () => { setSetting(key, !settings[key]); paint(); audio(); sfx(settings[key] ? 'select' : 'back'); };
      paint();
      return b;
    };
    const vol = () => {
      const out = h('output', null, '');
      const segs = [];
      const paint = () => {
        const n = Math.round(settings.volume * 10);
        segs.forEach((b, i) => b.classList.toggle('sel', i < n));
        out.textContent = n * 10 + '%';
      };
      const set = (v) => { setSetting('volume', Math.round(clamp(v, 0, 1) * 10) / 10); paint(); audio(); sfx('nav'); };
      for (let i = 0; i < 10; i++) {
        const b = h('button', { 'data-nav': '', 'aria-label': 'Ses seviyesi ' + (i + 1) * 10 + '%' });
        b.onclick = () => set((i + 1) / 10);
        segs.push(b);
      }
      const step = (d, label, txt) => h('button', { class: 'vol-step', 'data-nav': '', 'aria-label': label, onClick: () => set(settings.volume + d) }, txt);
      paint();
      return h('div', { class: 'vol' }, step(-0.1, 'Sesi azalt', '-'), h('div', { class: 'vol-bar' }, segs), step(0.1, 'Sesi artır', '+'), out);
    };
    const row = (label, ctrl, note, cls) => h('div', { class: 'set-row' + (cls ? ' ' + cls : '') },
      h('div', { class: 'lbl' }, h('b', null, label), note ? h('small', null, note) : null), ctrl);
    const group = (title, ...rows) => h('section', { class: 'set-group', 'aria-label': title }, title ? h('h2', null, title) : null, rows);

    const resetBox = h('div', { class: 'reset' });
    const paintReset = (state) => {
      clear(resetBox);
      if (state === 'ask') {
        resetBox.append(
          h('button', { class: 'btn small danger', 'data-nav': '', onClick: () => { resetBests(); sfx('back'); paintReset('done'); } }, 'EVET, SİL'),
          h('button', { class: 'btn small', 'data-nav': '', onClick: () => paintReset() }, 'VAZGEÇ'));
        resetBox.querySelector('button').focus();
      } else if (state === 'done') resetBox.append(h('span', { class: 'done' }, 'SİLİNDİ ✓'));
      else resetBox.append(h('button', { class: 'btn small', 'data-nav': '', onClick: () => paintReset('ask') }, 'SIFIRLA'));
    };
    paintReset();

    const fs = h('button', { class: 'tgl', role: 'switch', 'data-nav': '', 'aria-label': 'Tam ekran' }, h('i'));
    const paintFs = () => fs.setAttribute('aria-checked', String(!!document.fullscreenElement));
    fs.disabled = !document.documentElement.requestFullscreen;
    fs.onclick = () => { sfx('select'); toggleFullscreen(paintFs); };
    document.addEventListener('fullscreenchange', paintFs);
    paintFs();

    const el = h('div', { class: 'screen' }, h('div', { class: 'screen-inner narrow' },
      h('header', { class: 'screen-head' },
        h('button', { class: 'btn small', 'data-nav': '', onClick: () => { sfx('back'); go('title'); } }, '◀ GERİ'),
        h('h1', null, 'AYARLAR')),
      group('SES',
        row('SES EFEKTLERİ', tgl('sfx', 'Ses efektleri')),
        row('MÜZİK', tgl('music', 'Müzik')),
        row('SES SEVİYESİ', vol(), null, 'wrap')),
      group('GÖRÜNTÜ',
        row('TÜPLÜ TV EFEKTİ', tgl('crt', 'Tüplü TV efekti')),
        row('3D PİKSEL GÖRÜNÜM', tgl('pixel3d', '3D piksel görünüm'), 'Satranç, dama, tavla'),
        row('TAHTAYI ÇEVİR', tgl('flip', 'Tahtayı çevir'), '2 kişilik satranç ve dama'),
        row('TAM EKRAN', fs)),
      group(null, row('REKORLARI SİL', resetBox, null, 'wrap'))));
    return {
      el, music: true, nav: true, back: () => go('title'),
      destroy: () => document.removeEventListener('fullscreenchange', paintFs),
    };
  },

  game({ id, opts }) {
    const g = gameById(id);
    opts = normalizeOpts(g, opts);
    const status = h('div', { class: 'gstatus', 'aria-live': 'polite' });
    const stage = h('main', { class: 'stage' });
    const layer = h('div', { class: 'layer' });
    const soundBtn = h('button', { class: 'icon-btn', title: 'Ses aç/kapat', 'aria-label': 'Ses aç/kapat' }, '♪');
    const paintSound = () => soundBtn.classList.toggle('off', !settings.sfx);
    soundBtn.onclick = () => { setSetting('sfx', !settings.sfx); paintSound(); audio(); sfx('select'); soundBtn.blur(); };
    paintSound();
    const tool = (txt, label, fn) => h('button', { class: 'icon-btn', title: label, 'aria-label': label, onClick: (e) => { e.currentTarget.blur(); fn(); } }, txt);
    const el = h('div', { class: 'game-screen', style: 'position:relative' },
      h('header', { class: 'gbar' },
        h('button', { class: 'btn small', onClick: (e) => { e.currentTarget.blur(); toMenu(); } }, '◀ MENÜ'),
        h('div', { class: 'gtitle' }, h('b', null, g.name), h('span', null, describeOpts(g, opts))),
        status,
        h('div', { class: 'gtools' }, tool('?', 'Nasıl oynanır', () => showHelp()), tool('↺', 'Yeniden başlat', () => restart()), soundBtn, tool('||', 'Duraklat', () => pause()))),
      stage, layer);

    let inst = null, ov = null, toastTimer = 0, destroyed = false;
    const closeOv = () => { if (ov) { ov.remove(); ov = null; } };
    const api = {
      opts, game: g,
      sfx,
      settings,
      get blocked() { return !!ov; },
      status(parts) {
        clear(status);
        if (typeof parts === 'string') { status.textContent = parts; return; }
        for (const p of parts) {
          if (typeof p === 'string') { status.append(h('span', null, p)); continue; }
          const [k, v, color] = p;
          status.append(h('span', null, k ? h('span', { class: 'k' }, k + ' ') : null, h('span', { style: color ? { color } : null }, String(v))));
        }
      },
      toast(text, ms = 1300) {
        const old = el.querySelector('.toast'); if (old) old.remove();
        const t = h('div', { class: 'toast' }, text);
        stage.append(t);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.remove(), ms);
      },
      overlay(o) { return overlay(o); },
      closeOverlay: closeOv,
      gameOver({ title, text, cls = '', stats = [], extra = [] }) {
        if (destroyed) return;
        overlay({
          title, text, cls, stats, closable: false,
          buttons: [...extra, { label: 'TEKRAR OYNA', primary: true, fn: () => restart() }, { label: 'MENÜ', fn: () => toMenu() }],
        });
      },
      best: (key) => getBest(g.id + ':' + key),
      submitBest: (key, v, lower) => submitBest(g.id + ':' + key, v, lower),
      restart: () => restart(),
      toMenu: () => toMenu(),
      pause: () => pause(),
    };

    function overlay({ title, text, cls = '', stats = [], buttons = [], closable = true, html, onClose, node }) {
      closeOv();
      const box = h('div', { class: 'ov-box ' + cls, role: 'dialog', 'aria-label': title },
        title && h('h2', null, title),
        text && h('p', null, text),
        html && h('div', { html }),
        node,
        stats.length ? h('div', { class: 'stats' }, stats.map(([k, v]) => h('span', null, k + ' ', h('b', null, String(v))))) : null,
        buttons.length ? h('div', { class: 'ov-actions' }, buttons.map((b) => h('button', {
          class: 'btn' + (b.primary ? ' primary' : ''), 'data-nav': '',
          onClick: () => { sfx(b.primary ? 'select' : 'back'); b.fn(); },
        }, b.label))) : null);
      ov = h('div', { class: 'ov' }, box);
      ov.closable = closable;
      ov.onClose = onClose;
      layer.append(ov);
      setTimeout(() => { const f = box.querySelector('.btn.primary') || box.querySelector('[data-nav]'); if (f && f.isConnected) f.focus({ preventScroll: true }); }, 0);
      return closeOv;
    }

    function mount() {
      clear(stage); api.status('');
      try { inst = g.module.mount(stage, opts, api) || {}; }
      catch (err) { console.error(err); inst = {}; overlay({ title: 'HATA', text: 'Oyun başlatılamadı: ' + err.message, closable: false, buttons: [{ label: 'MENÜ', fn: () => toMenu() }] }); }
    }
    function unmount() { if (inst && inst.destroy) { try { inst.destroy(); } catch (e) { console.error(e); } } inst = null; }
    function restart() { closeOv(); unmount(); mount(); }
    function toMenu() { go('menu', { focus: g.id }); }
    function resume() {
      const o = ov; closeOv();
      if (o && o.onClose) o.onClose();
      if (inst && inst.resume) inst.resume();
    }
    function pause() {
      if (ov) return;
      if (inst && inst.pause) inst.pause();
      overlay({
        title: 'DURAKLATILDI', onClose: () => {},
        buttons: [
          { label: 'DEVAM', primary: true, fn: () => resume() },
          { label: 'YENİDEN', fn: () => restart() },
          { label: 'NASIL OYNANIR', fn: () => showHelp(true) },
          { label: 'MENÜ', fn: () => toMenu() },
        ],
      });
    }
    function showHelp(fromPause) {
      if (inst && inst.pause && !fromPause) inst.pause();
      const node = h('div', { class: 'help', style: 'display:flex;flex-direction:column;gap:12px;width:100%' },
        g.help.map(([head, items]) => [h('h3', null, head), h('ul', null, items.map((t) => h('li', { html: t })))]));
      overlay({ title: g.name, node, cls: 'help', buttons: [{ label: 'TAMAM', primary: true, fn: () => resume() }] });
    }

    return {
      el, music: false,
      start: () => mount(),
      destroy() { destroyed = true; clearTimeout(toastTimer); unmount(); },
      autoPause() { if (!ov && inst && inst.pause && inst.wantsAutoPause) pause(); },
      onKey(e) {
        if (ov) {
          if (e.key === 'Escape') { if (ov.closable !== false) { sfx('back'); resume(); } return true; }
          if (navKey(e, ov)) return true;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') return 'stop';
          return true;
        }
        if (e.key === 'Escape') { sfx('back'); pause(); return true; }
        return false;
      },
    };
  },
};

function modePanel(g) {
  const saved = load('opts:' + g.id, null);
  const opts = normalizeOpts(g, saved || defaultOpts(g));
  const groups = [];
  const optBtn = (label, desc, selected, onPick, compact) => {
    const b = h('button', { class: 'opt' + (compact ? ' compact' : '') + (selected ? ' sel' : ''), 'data-nav': '', 'aria-pressed': String(selected) }, label, desc && h('small', null, desc));
    b.addEventListener('click', () => { sfx('nav'); onPick(); });
    return b;
  };
  const group = (label, key, choices, when) => {
    const row = h('div', { class: 'opt-row', role: 'group', 'aria-label': label });
    const btns = choices.map(([id, lab, desc]) => {
      const b = optBtn(lab, desc, opts[key] === id, () => { opts[key] = id; paint(); }, !desc);
      b.dataset.val = id;
      return b;
    });
    row.append(...btns);
    const el = h('div', { class: 'opt-group' }, h('div', { class: 'opt-label' }, label), row);
    groups.push({ el, key, btns, when });
    return el;
  };
  const paint = () => {
    for (const gr of groups) {
      gr.btns.forEach((b) => { const s = opts[gr.key] === b.dataset.val; b.classList.toggle('sel', s); b.setAttribute('aria-pressed', String(s)); });
      if (gr.when) gr.el.hidden = !gr.when(opts);
    }
  };
  const play = () => {
    save('opts:' + g.id, opts);
    sfx('start');
    closeModal(true);
    go('game', { id: g.id, opts: { ...opts } });
  };
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-label': g.name + ' oyuncu şekli', style: { '--c': CART_COLORS[g.id] } },
    h('div', { class: 'modal-head' }, copyIcon(g.id, 4), h('div', { style: 'display:flex;flex-direction:column;gap:8px;min-width:0' }, h('h2', null, g.name), h('p', { class: 'muted' }, g.blurb))),
    group('OYUNCU ŞEKLİ', 'mod', g.modes.map((m) => [m.id, m.label, m.desc])),
    g.options.map((o) => group(o.label, o.id, o.choices, o.when)),
    h('div', { class: 'modal-actions' },
      h('button', { class: 'btn', 'data-nav': '', onClick: () => { sfx('back'); closeModal(); } }, '◀ GERİ'),
      h('button', { class: 'btn primary', 'data-nav': '', 'data-autofocus': '', onClick: play }, 'OYNA ▶')));
  paint();
  openModal(box, {});
}

function toggleFullscreen(done) {
  const fin = () => setTimeout(done, 80);
  try {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    if (p && p.then) p.then(fin, fin); else fin();
  } catch (e) { fin(); }
}

const PERSON = ['.###.', '.###.', '..#..', '#####', '#.#.#', '.#.#.', '.#.#.'];
function personIcon(color) {
  const c = document.createElement('canvas');
  c.width = 5; c.height = 7;
  const g = c.getContext('2d');
  g.fillStyle = color;
  PERSON.forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '#') g.fillRect(x, y, 1, 1); });
  return c;
}
const playerIcons = (g) => (/1-2/.test(g.players) ? [personIcon('#7dff6a'), personIcon('#ff4fa3')] : [personIcon('#7dff6a')]);
