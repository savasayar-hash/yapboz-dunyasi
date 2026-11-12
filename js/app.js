/* =========================================================
   Yapboz Dünyası — uygulama katmanı (YB.App)
   Ekran yönlendirici, durum, ekran başına çizim fonksiyonları.
   Diğer modüllere (Storage, Content, Levels, Audio, FX, Puzzle)
   yapılan her çağrı korumalıdır: modül yoksa / hata verirse oyun çökmez.
   ========================================================= */
(function () {
  'use strict';

  var YB = (window.YB = window.YB || {});

  /* ---------------------------------------------------------
     Küçük yardımcılar
     --------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const isCanvas = (c) => !!(c && typeof c.getContext === 'function' && c.width > 0 && c.height > 0);
  const numOr = (v, fb) => (typeof v === 'number' && isFinite(v) ? v : fb);

  const REDUCED = (function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();

  function warn(e) { try { console.warn('[YB.App]', e); } catch (_) { /* yok */ } }

  function safe(fn, fallback) {
    try {
      const r = fn();
      return r === undefined ? fallback : r;
    } catch (e) {
      warn(e);
      return fallback;
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function clampLevel(n) {
    n = parseInt(n, 10);
    if (!(n >= 1)) n = 1;
    return Math.min(100, n);
  }

  /** Söz verilen değeri bekler; süre dolarsa ya da reddedilirse fallback döner (asla reddetmez). */
  function withTimeout(p, ms, fallback) {
    return new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, ms);
      Promise.resolve(p).then(
        (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } },
        (e) => { warn(e); if (!done) { done = true; clearTimeout(t); resolve(fallback); } }
      );
    });
  }

  function idValue(s) { return /^\d+$/.test(String(s)) ? Number(s) : s; }

  const PALETTE = ['#FF6B6B', '#FF9F43', '#FFB800', '#3CCB76', '#3AA9F5', '#9B74FF', '#FF6FAE'];
  const CHEERS = ['Harika!', 'Süper!', 'Bravo!', 'Aferin!', 'Çok güzel!', 'Yaşasın!'];

  /* ---------------------------------------------------------
     Ses / efekt / titreşim sarmalayıcıları
     --------------------------------------------------------- */
  const sfx = (name) => safe(() => { if (YB.Audio && YB.Audio.play) YB.Audio.play(name); });
  const cheer = () => safe(() => { if (YB.Audio && YB.Audio.cheer) YB.Audio.cheer(); });
  const music = (on) => safe(() => { if (YB.Audio && YB.Audio.music) YB.Audio.music(!!on); });
  const audioEnabled = (p) => safe(() => { if (YB.Audio && YB.Audio.setEnabled) YB.Audio.setEnabled(p); });
  const fx = (method, ...args) => safe(() => { if (YB.FX && typeof YB.FX[method] === 'function') YB.FX[method](...args); });

  function speak(text, opts) {
    if (!text) return Promise.resolve();
    let p;
    try {
      p = YB.Audio && YB.Audio.speak ? YB.Audio.speak(text, opts || {}) : null;
    } catch (e) { warn(e); p = null; }
    if (!p) return Promise.resolve();
    // Konuşma motoru takılırsa sıra ilerlesin diye süre sınırı
    return withTimeout(p, Math.max(3500, String(text).length * 140), undefined);
  }

  function stopSpeech() {
    safe(() => { if (window.speechSynthesis) window.speechSynthesis.cancel(); });
  }

  function buzz(pattern) {
    if (!state.settings.sound) return;
    safe(() => { if (navigator.vibrate) navigator.vibrate(pattern); });
  }

  /* ---------------------------------------------------------
     Yedek içerik (modüller eksikse)
     --------------------------------------------------------- */
  const FALLBACK_WORLDS = [
    { id: 1, name: 'Çiftlik', emoji: '🐄', colors: { bg1: '#D6F5B8', bg2: '#A6E07E', accent: '#4CAF50' } },
    { id: 2, name: 'Meyveler', emoji: '🍎', colors: { bg1: '#FFE0E0', bg2: '#FFB3A7', accent: '#F25C54' } },
    { id: 3, name: 'Renkler', emoji: '🎨', colors: { bg1: '#FFE9FB', bg2: '#E3C8FF', accent: '#B15CFF' } },
    { id: 4, name: 'Şekiller', emoji: '🔷', colors: { bg1: '#DDF0FF', bg2: '#A9D6FF', accent: '#3A8DFF' } },
    { id: 5, name: 'Sayılar', emoji: '🔢', colors: { bg1: '#FFF4CC', bg2: '#FFDE85', accent: '#F5A300' } },
    { id: 6, name: 'Taşıtlar', emoji: '🚗', colors: { bg1: '#FFE6CC', bg2: '#FFC28A', accent: '#FF7A1A' } },
    { id: 7, name: 'Orman', emoji: '🦁', colors: { bg1: '#E3F5D0', bg2: '#B5DD8E', accent: '#5E9E2E' } },
    { id: 8, name: 'Deniz', emoji: '🐠', colors: { bg1: '#D4F4FF', bg2: '#8FDCF5', accent: '#1E9BD7' } },
    { id: 9, name: 'Harfler', emoji: '🔤', colors: { bg1: '#FFE3EF', bg2: '#FFB8D6', accent: '#F0508F' } },
    { id: 10, name: 'Gökyüzü ve Doğa', emoji: '🌈', colors: { bg1: '#E4EEFF', bg2: '#C3D7FF', accent: '#6A7CFF' } }
  ];

  const LEVEL_TABLE = [
    [3, 2, 1, 'rect', 0.55, true, 0.5],
    [6, 3, 1, 'rect', 0.5, true, 0.5],
    [15, 2, 2, 'rect', 0.45, true, 0.45],
    [20, 3, 2, 'rect', 0.45, true, 0.45],
    [25, 3, 2, 'jigsaw', 0.4, true, 0.4],
    [30, 3, 3, 'rect', 0.4, true, 0.4],
    [40, 3, 3, 'jigsaw', 0.35, true, 0.4],
    [50, 4, 3, 'jigsaw', 0.3, true, 0.35],
    [60, 4, 4, 'jigsaw', 0.25, false, 0.35],
    [70, 5, 4, 'jigsaw', 0.2, false, 0.35],
    [80, 5, 4, 'jigsaw', 0.12, false, 0.3],
    [90, 6, 4, 'jigsaw', 0.08, false, 0.3],
    [100, 6, 5, 'jigsaw', 0.05, false, 0.3]
  ];

  function fallbackLevel(n) {
    const r = LEVEL_TABLE.find((row) => n <= row[0]) || LEVEL_TABLE[LEVEL_TABLE.length - 1];
    return { n, world: Math.ceil(n / 10), cols: r[1], rows: r[2], shape: r[3], ghost: r[4], grid: r[5], snap: r[6], seed: n, tutorial: n <= 3, worldEnd: n % 10 === 0 };
  }

  function worlds() {
    const w = safe(() => YB.Content && YB.Content.WORLDS);
    return Array.isArray(w) && w.length >= 10 ? w : FALLBACK_WORLDS;
  }

  function world(id) {
    const ws = worlds();
    return ws.find((x) => x && x.id === id) || ws[id - 1] || FALLBACK_WORLDS[(Math.max(1, id) - 1) % 10];
  }

  function colorsOf(w) {
    const fb = FALLBACK_WORLDS[((w && w.id) || 1) - 1] || FALLBACK_WORLDS[0];
    const c = (w && w.colors) || {};
    return { bg1: c.bg1 || fb.colors.bg1, bg2: c.bg2 || fb.colors.bg2, accent: c.accent || fb.colors.accent };
  }

  function worldVars(w) {
    const c = colorsOf(w);
    return `--bg1:${c.bg1};--bg2:${c.bg2};--accent:${c.accent}`;
  }

  function getItem(n) {
    let it = safe(() => YB.Content && YB.Content.getItem && YB.Content.getItem(n));
    if (!it) it = safe(() => YB.Content && YB.Content.ITEMS && YB.Content.ITEMS[n - 1]);
    if (!it) it = { id: 'lv' + n, world: Math.ceil(n / 10), word: 'YAPBOZ', emoji: '🧩', say: 'Harika! Yapbozu tamamladın!', kind: 'emoji' };
    return it;
  }

  function getLevel(n) {
    const lv = safe(() => YB.Levels && YB.Levels.get && YB.Levels.get(n));
    if (lv && lv.cols >= 1 && lv.rows >= 1) return lv;
    return fallbackLevel(n);
  }

  /* ---------------------------------------------------------
     Depolama sarmalayıcısı (bellek içi yedekli)
     --------------------------------------------------------- */
  const DEFAULT_SETTINGS = { sound: true, music: true, voice: true, imageMode: 'mixed' };
  const mem = { progress: { unlocked: 1, stars: {}, completed: {} }, settings: Object.assign({}, DEFAULT_SETTINGS) };
  const hasStorage = () => !!(YB.Storage && typeof YB.Storage.getProgress === 'function');

  function normProgress(p) {
    p = p && typeof p === 'object' ? p : {};
    return {
      unlocked: Math.max(1, Math.min(100, parseInt(p.unlocked, 10) || 1)),
      stars: p.stars && typeof p.stars === 'object' ? p.stars : {},
      completed: p.completed && typeof p.completed === 'object' ? p.completed : {}
    };
  }

  const store = {
    progress() {
      if (hasStorage()) {
        const p = safe(() => YB.Storage.getProgress(), null);
        if (p) return normProgress(p);
      }
      return normProgress(mem.progress);
    },
    saveResult(n, stars) {
      const ok = hasStorage() && safe(() => { YB.Storage.saveLevelResult(n, stars); return true; }, false);
      if (!ok) {
        const p = mem.progress;
        p.completed[n] = true;
        p.stars[n] = Math.max(p.stars[n] || 0, stars);
        p.unlocked = Math.min(100, Math.max(p.unlocked, n + 1));
      }
    },
    reset() {
      const ok = hasStorage() && safe(() => { YB.Storage.resetProgress(); return true; }, false);
      if (!ok) mem.progress = { unlocked: 1, stars: {}, completed: {} };
    },
    unlockAll() {
      const ok = hasStorage() && safe(() => { YB.Storage.unlockAll(); return true; }, false);
      if (!ok) mem.progress.unlocked = 100;
    },
    settings() {
      let s = null;
      if (YB.Storage && YB.Storage.getSettings) s = safe(() => YB.Storage.getSettings(), null);
      return Object.assign({}, DEFAULT_SETTINGS, mem.settings, s && typeof s === 'object' ? s : {});
    },
    saveSettings(partial) {
      Object.assign(mem.settings, partial);
      if (YB.Storage && YB.Storage.saveSettings) safe(() => YB.Storage.saveSettings(partial));
      state.settings = store.settings();
      return state.settings;
    }
  };

  const isDone = (prog, n) => !!(prog.completed[n] || prog.completed[String(n)] || (prog.stars[n] | 0) > 0);
  const starsOf = (prog, n) => Math.max(0, Math.min(3, parseInt(prog.stars[n] || prog.stars[String(n)], 10) || (isDone(prog, n) ? 1 : 0)));

  async function listImages() {
    try {
      if (!YB.Storage || !YB.Storage.listImages) return [];
      const r = await withTimeout(YB.Storage.listImages(), 8000, []);
      return Array.isArray(r) ? r.filter((x) => x && x.id != null) : [];
    } catch (e) {
      warn(e);
      return [];
    }
  }

  /* ---------------------------------------------------------
     Uygulama durumu
     --------------------------------------------------------- */
  const state = {
    screen: null,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    // oyun
    level: 1, lv: null, item: null, world: null,
    image: null, custom: null,
    puzzle: null, pendingDestroy: null,
    playToken: 0, hintsUsed: 0, completed: false,
    lastCheer: 0, idleTimer: null,
    previewOn: false,
    // harita
    pendingUnlock: null, pendingWorldUnlock: false,
    // kazanma kartı
    winTimers: [], winN: null,
    // ebeveyn kapısı
    gate: { a: 7, b: 8, input: '' },
    // ses kilidi
    audioArmed: false,
    confirmResolve: null,
    wakeLock: null
  };

  /* ---------------------------------------------------------
     Maskot (satır içi SVG: gülen, göz kırpan, el sallayan yapboz parçası)
     --------------------------------------------------------- */
  function mascotSVG(extra) {
    return '<svg class="mascot ' + (extra || '') + '" viewBox="0 0 200 210" aria-hidden="true" focusable="false">' +
      '<ellipse class="m-shadow" cx="100" cy="198" rx="50" ry="8" fill="rgba(62,42,92,.16)"/>' +
      '<g class="m-float">' +
        '<g class="m-arm">' +
          '<path d="M46 128 Q26 118 22 98" fill="none" stroke="#F59E1B" stroke-width="13" stroke-linecap="round"/>' +
          '<circle cx="21" cy="91" r="11" fill="#FFB938" stroke="#E8912B" stroke-width="3"/>' +
        '</g>' +
        '<path d="M157 146 Q172 152 174 166" fill="none" stroke="#F59E1B" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="175" cy="170" r="10" fill="#FFB938" stroke="#E8912B" stroke-width="3"/>' +
        '<ellipse cx="76" cy="177" rx="16" ry="9" fill="#E8912B"/>' +
        '<ellipse cx="124" cy="177" rx="16" ry="9" fill="#E8912B"/>' +
        '<path class="m-body" d="M40 62 Q40 50 52 50 L84 50 C82 42 78 38 80 30 C84 14 116 14 120 30 C122 38 118 42 116 50 L148 50 Q160 50 160 62 L160 92 C168 90 172 86 180 88 C194 92 194 128 180 132 C172 134 168 130 160 128 L160 158 Q160 170 148 170 L52 170 Q40 170 40 158 Z" fill="#FFB938" stroke="#E8912B" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M52 92 L52 66 Q52 60 60 60 L80 60" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="98" cy="28" r="5" fill="#fff" fill-opacity=".5"/>' +
        '<g class="m-eyes">' +
          '<ellipse cx="78" cy="104" rx="13" ry="15" fill="#fff"/>' +
          '<ellipse cx="122" cy="104" rx="13" ry="15" fill="#fff"/>' +
          '<circle cx="80" cy="107" r="7.5" fill="#3E2A5C"/>' +
          '<circle cx="124" cy="107" r="7.5" fill="#3E2A5C"/>' +
          '<circle cx="83" cy="103" r="2.6" fill="#fff"/>' +
          '<circle cx="127" cy="103" r="2.6" fill="#fff"/>' +
        '</g>' +
        '<ellipse cx="60" cy="127" rx="9" ry="6" fill="#FF7E9D" opacity=".65"/>' +
        '<ellipse cx="140" cy="127" rx="9" ry="6" fill="#FF7E9D" opacity=".65"/>' +
        '<path d="M86 124 Q100 146 114 124 Q100 130 86 124 Z" fill="#8B2F3C"/>' +
        '<ellipse cx="100" cy="131.5" rx="6" ry="3.2" fill="#FF8A9A"/>' +
      '</g>' +
    '</svg>';
  }

  /* ---------------------------------------------------------
     Gökyüzü dekoru
     --------------------------------------------------------- */
  function buildSky() {
    const sky = $('sky');
    if (!sky || sky.childElementCount) return;
    let h = '<div class="sun"></div><div class="hill h1"></div><div class="hill h3"></div><div class="hill h2"></div>';
    const clouds = [
      { w: 170, y: 9, dur: 70, delay: -12, x: 8 },
      { w: 110, y: 24, dur: 52, delay: -36, x: 60 },
      { w: 210, y: 40, dur: 88, delay: -58, x: 25 },
      { w: 130, y: 60, dur: 64, delay: -20, x: 70 }
    ];
    clouds.forEach((c) => {
      h += `<div class="cloud" style="--w:${c.w}px;top:${c.y}%;--dur:${c.dur}s;--delay:${c.delay}s;--x:${c.x}%"></div>`;
    });
    for (let i = 0; i < 7; i++) {
      h += `<div class="bubble" style="--x:${randInt(3, 92)}%;--s:${randInt(16, 48)}px;--dur:${randInt(10, 17)}s;--delay:${-randInt(0, 16)}s"></div>`;
    }
    sky.innerHTML = h;
  }

  /* ---------------------------------------------------------
     Ekran yönlendirici + Android geri tuşu (History API)
     --------------------------------------------------------- */
  const RANK = { home: 0, map: 1, album: 1, gate: 1, play: 2, parent: 2 };
  const Screens = {
    home: { enter: enterHome },
    map: { enter: enterMap },
    play: { enter: enterPlay, leave: leavePlay },
    album: { enter: enterAlbum },
    gate: { enter: enterGate },
    parent: { enter: enterParent }
  };

  const Hist = {
    depth: 0,
    push(tag) {
      try {
        history.pushState({ yb: tag, t: Date.now() }, '');
        this.depth++;
      } catch (e) { /* file:// vb. — sessiz */ }
    }
  };

  function go(name, params, opts) {
    if (!Screens[name]) name = 'home';
    opts = opts || {};
    const prev = state.screen;
    const nextEl = $('screen-' + name);
    if (!nextEl) return;

    if (prev && Screens[prev].leave) safe(() => Screens[prev].leave(name));

    if (prev !== name) {
      const forward = !prev || RANK[name] >= RANK[prev];
      const prevEl = prev ? $('screen-' + prev) : null;
      if (prevEl) {
        prevEl.classList.remove('active', 'pre-fwd', 'pre-back', 'leave-fwd', 'leave-back');
        prevEl.classList.add(forward ? 'leave-fwd' : 'leave-back');
        prevEl.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          if (!prevEl.classList.contains('active')) prevEl.classList.remove('leave-fwd', 'leave-back');
        }, 450);
      }
      nextEl.classList.remove('leave-fwd', 'leave-back');
      nextEl.classList.add(forward ? 'pre-fwd' : 'pre-back');
      void nextEl.offsetWidth; // yeniden akış: geçişin başlangıç durumu uygulansın
      nextEl.classList.remove('pre-fwd', 'pre-back');
      nextEl.classList.add('active');
      nextEl.removeAttribute('aria-hidden');
      document.body.setAttribute('data-screen', name);
      state.screen = name;
      if (!opts.fromHistory) Hist.push(name);
    }
    safe(() => Screens[name].enter(params || {}));
  }

  /** Geri tuşu / Esc: açık pencereyi kapatır ya da bir önceki ekrana gider. */
  function backAction() {
    if (!$('busy').hidden) return; // resim işlenirken bekle
    if (!$('confirm').hidden) { closeConfirm(false); return; }
    if (isWinOpen()) { hideWin(); go('map', null, { fromHistory: true }); return; }
    switch (state.screen) {
      case 'play': go('map', null, { fromHistory: true }); break;
      case 'map':
      case 'album':
      case 'gate':
      case 'parent': go('home', null, { fromHistory: true }); break;
      default: break; // ana ekranda: hiçbir şey yapma
    }
  }

  function onPopState() {
    Hist.depth = Math.max(0, Hist.depth - 1);
    safe(backAction);
    if (Hist.depth < 1) Hist.push('guard'); // uygulamadan çıkılmasın
  }

  /* ---------------------------------------------------------
     Tam ekran ve ekranın açık kalması
     --------------------------------------------------------- */
  function isInstalled() {
    return safe(() =>
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true, false);
  }

  function tryFullscreen() {
    try {
      if (isInstalled() || document.fullscreenElement || document.webkitFullscreenElement) return;
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return;
      const r = req.call(el, { navigationUI: 'hide' });
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* sessiz */ }
  }

  async function requestWake() {
    try {
      if (state.wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      const lock = await navigator.wakeLock.request('screen');
      if (state.screen !== 'play') { try { lock.release(); } catch (e) { /* sessiz */ } return; }
      state.wakeLock = lock;
      if (lock.addEventListener) lock.addEventListener('release', () => { if (state.wakeLock === lock) state.wakeLock = null; });
    } catch (e) {
      state.wakeLock = null;
    }
  }

  function releaseWake() {
    const l = state.wakeLock;
    state.wakeLock = null;
    if (l) { try { const r = l.release(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* sessiz */ } }
  }

  /* ---------------------------------------------------------
     1. ANA EKRAN
     --------------------------------------------------------- */
  function buildHome() {
    const title = $('home-title');
    if (title && !title.dataset.built) {
      let k = 0;
      title.innerHTML = ['Yapboz', 'Dünyası'].map((w) =>
        '<span class="tw">' + Array.from(w).map((ch) => {
          const i = k++;
          return `<span class="tl" style="--d:${(i * 0.09).toFixed(2)}s;--c:${PALETTE[i % PALETTE.length]}">${esc(ch)}</span>`;
        }).join('') + '</span>'
      ).join(' ');
      title.dataset.built = '1';
    }
    const m = $('home-mascot');
    if (m && !m.childElementCount) m.innerHTML = mascotSVG();
  }

  function enterHome() { buildHome(); }

  function mascotTap() {
    const m = $('home-mascot');
    if (!m) return;
    m.classList.remove('jump');
    void m.offsetWidth;
    m.classList.add('jump');
    setTimeout(() => m.classList.remove('jump'), 800);
    sfx('pop');
    speak(pickOne(['Merhaba! Hadi yapboz yapalım!', 'Ben Yapboz! Oynayalım mı?', 'Hihi! Gıdıklanıyorum!']));
  }

  /* ---------------------------------------------------------
     2. HARİTA
     --------------------------------------------------------- */
  function currentLevel(prog) {
    for (let n = 1; n <= prog.unlocked; n++) if (!isDone(prog, n)) return n;
    return null;
  }

  function renderMap() {
    const scroll = $('map-scroll');
    if (!scroll) return;
    const prog = store.progress();
    const cur = currentLevel(prog);
    let total = 0;
    let html = '';
    const ws = worlds();
    for (let wi = 0; wi < 10; wi++) {
      const w = ws[wi] || FALLBACK_WORLDS[wi];
      let wStars = 0;
      let nodes = '';
      for (let i = 0; i < 10; i++) {
        const n = wi * 10 + i + 1;
        const done = isDone(prog, n);
        const st = done ? starsOf(prog, n) : 0;
        wStars += st;
        const locked = n > prog.unlocked;
        const isCur = n === cur;
        let cls = 'node';
        let inner;
        if (locked) { cls += ' locked'; inner = '🔒'; }
        else if (done) { cls += ' done'; inner = esc(getItem(n).emoji || '⭐'); }
        else { cls += ' open'; inner = String(n); }
        if (isCur) cls += ' current';
        nodes += `<button class="${cls}" data-action="level" data-n="${n}" data-sfx="none" aria-label="Seviye ${n}${locked ? ' (kilitli)' : ''}">` +
          `<span class="node-bubble">${inner}</span>` +
          (locked || done ? `<span class="node-num">${n}</span>` : '') +
          (done ? `<span class="node-stars">${'⭐'.repeat(st)}${st < 3 ? `<span class="off">${'⭐'.repeat(3 - st)}</span>` : ''}</span>` : '') +
          (isCur ? `<span class="node-marker">${mascotSVG('mini')}</span>` : '') +
          '</button>';
      }
      total += wStars;
      const worldLocked = wi * 10 + 1 > prog.unlocked;
      html += `<section class="world${worldLocked ? ' locked-world' : ''}" data-world="${wi + 1}" style="${worldVars(w)}">` +
        '<svg class="world-path" aria-hidden="true"></svg>' +
        `<span class="world-decor" style="left:6%;top:18%;--r:-12deg">${esc(w.emoji)}</span>` +
        `<span class="world-decor" style="right:5%;top:46%;--r:10deg">${esc(w.emoji)}</span>` +
        `<span class="world-decor" style="left:8%;top:78%;--r:6deg">${esc(w.emoji)}</span>` +
        `<div class="world-banner"><span class="wb-emoji">${esc(w.emoji)}</span><span class="wb-name">${esc(w.name)}</span>` +
        `<span class="wb-stars">${worldLocked ? '🔒' : '⭐ ' + wStars}</span></div>` +
        nodes + '</section>';
    }
    const last = colorsOf(ws[9] || FALLBACK_WORLDS[9]);
    html += `<div class="map-end" style="--bg2:${last.bg2}">🏆</div>`;
    scroll.innerHTML = html;
    const pill = $('map-stars');
    if (pill) pill.textContent = '⭐ ' + total;
    layoutMap();
  }

  function smoothPath(p) {
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  /** Balonları zikzak yola yerleştirir ve noktalı yolu çizer (genişlik değişince yeniden). */
  function layoutMap() {
    const scroll = $('map-scroll');
    if (!scroll) return;
    const W = scroll.clientWidth;
    if (!W) return;
    const sample = qs('.node', scroll);
    const ns = (sample && sample.offsetWidth) || 72;
    const rowH = Math.round(ns * 1.32 + 16);
    const cx = W / 2;
    const amp = Math.max(30, Math.min(W / 2 - ns / 2 - 26, 170));
    qsa('.world', scroll).forEach((sec, wi) => {
      const banner = qs('.world-banner', sec);
      const top = 14 + (banner ? banner.offsetHeight : 60) + Math.round(ns * 0.55) + 10;
      const H = top + 10 * rowH + 10;
      sec.style.height = H + 'px';
      const sign = wi % 2 ? -1 : 1;
      const pts = [{ x: cx, y: 0 }];
      qsa('.node', sec).forEach((node, i) => {
        const x = cx + sign * amp * Math.sin((Math.PI * (i + 1)) / 3.3);
        const y = top + i * rowH + rowH / 2;
        node.style.left = (x - ns / 2).toFixed(1) + 'px';
        node.style.top = (y - ns / 2).toFixed(1) + 'px';
        pts.push({ x, y });
      });
      pts.push({ x: cx, y: H });
      const svg = qs('.world-path', sec);
      if (svg) {
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const d = smoothPath(pts);
        svg.innerHTML = `<path class="road" d="${d}"/><path class="dots" d="${d}"/>`;
      }
    });
  }

  function scrollMapTo(n, smooth) {
    const scroll = $('map-scroll');
    const node = scroll && qs(`.node[data-n="${n}"]`, scroll);
    if (!node) return;
    const sec = node.closest('.world');
    const y = (sec ? sec.offsetTop : 0) + node.offsetTop + node.offsetHeight / 2 - scroll.clientHeight / 2;
    const top = Math.max(0, y);
    try {
      scroll.scrollTo({ top, behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
    } catch (e) {
      scroll.scrollTop = top;
    }
  }

  function enterMap() {
    renderMap();
    const prog = store.progress();
    const target = currentLevel(prog) || prog.unlocked;
    const scroll = $('map-scroll');
    // önce yakına anında, sonra yumuşakça hedefe kay
    scrollMapTo(target, false);
    if (scroll) scroll.scrollTop = Math.max(0, scroll.scrollTop - 280);
    setTimeout(() => { if (state.screen === 'map') scrollMapTo(target, true); }, REDUCED ? 0 : 120);

    if (state.pendingUnlock) {
      const n = state.pendingUnlock;
      const worldOpened = state.pendingWorldUnlock;
      state.pendingUnlock = null;
      state.pendingWorldUnlock = false;
      setTimeout(() => {
        if (state.screen !== 'map') return;
        const node = qs(`.node[data-n="${n}"]`, $('map-scroll'));
        if (node) {
          node.classList.remove('unlocked-pop');
          void node.offsetWidth;
          node.classList.add('unlocked-pop');
          setTimeout(() => node.classList.remove('unlocked-pop'), 1100);
        }
        if (worldOpened) {
          sfx('unlock');
          const w = world(Math.ceil(n / 10));
          speak('Yeni dünya açıldı: ' + (w.name || '') + '!');
        }
      }, REDUCED ? 100 : 750);
    }
  }

  function tapLevel(btn) {
    const n = clampLevel(btn.dataset.n);
    const prog = store.progress();
    if (n > prog.unlocked) {
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 550);
      sfx('wrong');
      return;
    }
    sfx('pop');
    startLevel(n);
  }

  /* ---------------------------------------------------------
     3. OYUN
     --------------------------------------------------------- */
  function startLevel(n) {
    tryFullscreen(); // kullanıcı hareketi içinde
    go('play', { n: clampLevel(n) });
  }

  function fallbackCanvas(item, w) {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 900;
    const g = c.getContext('2d');
    if (!g) return c;
    const col = colorsOf(w);
    const grd = g.createLinearGradient(0, 0, 1200, 900);
    grd.addColorStop(0, col.bg1); grd.addColorStop(1, col.bg2);
    g.fillStyle = grd; g.fillRect(0, 0, 1200, 900);
    const dots = ['#ffffff', '#FFD23F', '#FF7EB6', '#4DB8FF', col.accent];
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.35;
      g.fillStyle = dots[i % dots.length];
      g.beginPath();
      g.arc((i * 397) % 1200, (i * 263) % 900, 12 + (i % 5) * 8, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '440px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.fillText(item.emoji || '🧩', 600, 390);
    g.fillStyle = '#fff';
    g.beginPath();
    if (g.roundRect) g.roundRect(300, 700, 600, 140, 70); else g.rect(300, 700, 600, 140);
    g.fill();
    g.fillStyle = '#3E2A5C';
    g.font = 'bold 100px "Baloo 2", system-ui, sans-serif';
    g.fillText(String(item.word || ''), 600, 775);
    return c;
  }

  function coverCanvas(img) {
    let c = safe(() => YB.Content && YB.Content.cover && YB.Content.cover(img, 1200, 900), null);
    if (isCanvas(c)) return c;
    try {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) return null;
      c = document.createElement('canvas');
      c.width = 1200; c.height = 900;
      const s = Math.max(1200 / iw, 900 / ih);
      const dw = iw * s, dh = ih * s;
      c.getContext('2d').drawImage(img, (1200 - dw) / 2, (900 - dh) / 2, dw, dh);
      return c;
    } catch (e) { warn(e); return null; }
  }

  function renderItemCanvas(item, w) {
    const c = safe(() => YB.Content && YB.Content.render && YB.Content.render(item, 1200, 900), null);
    return isCanvas(c) ? c : fallbackCanvas(item, w);
  }

  /** SPEC "Seviye görseli seçimi" kuralları. */
  async function pickLevelImage(n, item, w) {
    const mode = state.settings.imageMode || 'mixed';
    let canvas = null, custom = null;
    if (mode === 'custom' || (mode === 'mixed' && n % 2 === 0)) {
      const imgs = await listImages();
      if (imgs.length) {
        // custom: images[(n-1) % len]; mixed (çift seviyeler): tüm resimleri sırayla dolaşmak için (n/2-1) % len
        const idx = mode === 'custom' ? (n - 1) % imgs.length : (Math.floor(n / 2) - 1) % imgs.length;
        const rec = imgs[idx] || imgs[0];
        if (YB.Storage && YB.Storage.getImage) {
          const img = await withTimeout(safe(() => YB.Storage.getImage(rec.id), null), 10000, null);
          if (img) {
            canvas = coverCanvas(img);
            if (canvas) custom = { id: rec.id, name: String(rec.name || '').trim() };
          }
        }
      }
    }
    if (!canvas) {
      // Resim üzerindeki kelime "Baloo 2" ile çizilsin diye yazı tipini bekle (en çok 1.5 sn)
      await withTimeout(safe(() => document.fonts && document.fonts.load('800 100px "Baloo 2"'), null), 1500, null);
      canvas = renderItemCanvas(item, w);
    }
    return { canvas, custom };
  }

  function thumbCanvas(src, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    safe(() => c.getContext('2d').drawImage(src, 0, 0, w, h));
    return c;
  }

  function flushDestroy() {
    const pd = state.pendingDestroy;
    if (!pd) return;
    clearTimeout(pd.timer);
    state.pendingDestroy = null;
    safe(() => pd.p && pd.p.destroy && pd.p.destroy());
  }

  function destroyPuzzle(deferMs) {
    const p = state.puzzle;
    state.puzzle = null;
    if (!p) return;
    flushDestroy();
    if (deferMs) {
      state.pendingDestroy = { p, timer: setTimeout(flushDestroy, deferMs) };
    } else {
      safe(() => p.destroy && p.destroy());
    }
  }

  function setPreview(on) {
    state.previewOn = !!on;
    const box = $('preview');
    if (box) box.hidden = !on;
    const b = $('btn-preview');
    if (b) b.classList.toggle('on', !!on);
  }

  function buildPreview(canvas) {
    const box = $('preview');
    if (!box) return;
    box.innerHTML = '';
    if (isCanvas(canvas)) box.appendChild(thumbCanvas(canvas, 400, 300));
  }

  function showLoading(on) {
    const l = $('play-loading');
    if (l) l.classList.toggle('show', !!on);
  }

  function showPartsBadge(count) {
    const b = $('parts-badge');
    if (!b) return;
    b.innerHTML = `<span>🧩 ${count} parça</span>`;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(showPartsBadge.t);
    showPartsBadge.t = setTimeout(() => b.classList.remove('show'), 2100);
  }

  function resetIdle() {
    clearTimeout(state.idleTimer);
    const hb = $('btn-hint');
    if (hb) hb.classList.remove('nudge');
    if (state.screen !== 'play' || state.completed) return;
    state.idleTimer = setTimeout(() => {
      if (state.screen === 'play' && !state.completed && !isWinOpen() && hb) hb.classList.add('nudge');
    }, 22000);
  }

  function showPlayError() {
    const host = $('puzzle-host');
    if (!host) return;
    host.innerHTML = '<div class="play-error"><div class="big">😕</div><div>Yapboz açılamadı</div>' +
      '<button class="btn btn-lg btn-green" data-action="to-map">🗺</button></div>';
  }

  async function enterPlay(params) {
    const n = clampLevel(params && params.n);
    const token = ++state.playToken;
    hideWin();
    flushDestroy();
    destroyPuzzle(0);
    clearTimeout(state.idleTimer);

    state.level = n;
    state.hintsUsed = 0;
    state.completed = false;
    state.lastCheer = 0;
    state.custom = null;
    state.image = null;
    state.pendingUnlock = null;
    state.pendingWorldUnlock = false;
    setPreview(false);

    const lv = getLevel(n);
    const item = getItem(n);
    const w = world(numOr(lv.world, 0) || numOr(item.world, 0) || Math.ceil(n / 10));
    state.lv = lv; state.item = item; state.world = w;

    const scr = $('screen-play');
    const col = colorsOf(w);
    scr.style.setProperty('--bg1', col.bg1);
    scr.style.setProperty('--bg2', col.bg2);
    scr.style.setProperty('--accent', col.accent);
    $('play-world-emoji').textContent = w.emoji || '🧩';
    $('play-level-num').textContent = String(n);

    const host = $('puzzle-host');
    if (host) host.innerHTML = '';
    const loadT = setTimeout(() => { if (token === state.playToken) showLoading(true); }, 150);

    requestWake();

    const t0 = Date.now();
    let pick;
    try {
      pick = await pickLevelImage(n, item, w);
    } catch (e) {
      warn(e);
      pick = { canvas: fallbackCanvas(item, w), custom: null };
    }
    if (token !== state.playToken || state.screen !== 'play') { clearTimeout(loadT); return; }
    // ekran geçişi bitsin, ölçüler otursun
    const rest = (REDUCED ? 30 : 380) - (Date.now() - t0);
    if (rest > 0) await delay(rest);
    if (token !== state.playToken || state.screen !== 'play') { clearTimeout(loadT); return; }
    clearTimeout(loadT);
    showLoading(false);

    state.image = pick.canvas;
    state.custom = pick.custom;
    buildPreview(pick.canvas);
    createPuzzle(lv, pick.canvas, token);
    if (state.puzzle) {
      showPartsBadge((lv.cols | 0) * (lv.rows | 0));
      if (n <= 3) setTimeout(() => {
        if (token === state.playToken && state.screen === 'play' && !state.completed) speak('Parçayı tutup yerine sürükle!');
      }, 900);
    }
    resetIdle();
  }

  function guard(fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { warn(e); return undefined; }
    };
  }

  function createPuzzle(lv, canvas, token) {
    const host = $('puzzle-host');
    if (!host) return;
    if (!YB.Puzzle || typeof YB.Puzzle.create !== 'function') { showPlayError(); return; }
    try {
      state.puzzle = YB.Puzzle.create(host, {
        image: canvas,
        cols: lv.cols, rows: lv.rows,
        shape: lv.shape || 'rect',
        ghost: numOr(lv.ghost, 0.4),
        grid: !!lv.grid,
        snap: numOr(lv.snap, 0.4),
        seed: lv.seed != null ? lv.seed : lv.n,
        tutorial: !!lv.tutorial,
        onPickup: guard(() => {
          if (token !== state.playToken) return;
          sfx('pickup');
          resetIdle();
        }),
        onDrop: guard(() => {
          if (token !== state.playToken) return;
          sfx('drop');
        }),
        onSnap: guard((info) => onSnap(info || {}, token)),
        onComplete: guard(() => onComplete(token))
      }) || null;
    } catch (e) {
      warn(e);
      state.puzzle = null;
      showPlayError();
    }
  }

  function onSnap(info, token) {
    if (token !== state.playToken) return;
    sfx('snap');
    buzz(15);
    resetIdle();
    const x = numOr(info.x, window.innerWidth / 2);
    const y = numOr(info.y, window.innerHeight / 2);
    const col = colorsOf(state.world);
    fx('burst', x, y, { color: col.accent });
    const placed = info.placed | 0, total = info.total | 0;
    const now = Date.now();
    if (total && placed < total && now - state.lastCheer > 3000) {
      if (placed === Math.ceil(total / 2) || Math.random() < 0.25) {
        state.lastCheer = now;
        fx('floatText', x, y - 30, pickOne(CHEERS), { color: col.accent });
        cheer();
      }
    }
  }

  function onComplete(token) {
    if (token !== state.playToken || state.completed) return;
    state.completed = true;
    clearTimeout(state.idleTimer);
    const hb = $('btn-hint');
    if (hb) hb.classList.remove('nudge');
    setPreview(false);
    showWin();
  }

  function doHint() {
    if (!state.puzzle || state.completed) { sfx('click'); return; }
    let r = false;
    try { r = state.puzzle.hint ? state.puzzle.hint() : false; } catch (e) { warn(e); r = false; }
    if (r !== false) {
      state.hintsUsed++;
      sfx('hint');
    } else {
      sfx('click');
    }
    resetIdle();
  }

  function leavePlay(next) {
    state.playToken++;
    clearTimeout(state.idleTimer);
    showLoading(false);
    hideWin();
    setPreview(false);
    destroyPuzzle(next === 'play' ? 0 : 420); // geçiş bitene kadar parçalar görünsün
    if (next !== 'play') releaseWake();
  }

  /* ---------------------------------------------------------
     4. KAZANMA KARTI
     --------------------------------------------------------- */
  function isWinOpen() { const w = $('win'); return !!(w && !w.hidden); }

  function later(ms, fn) {
    state.winTimers.push(setTimeout(() => safe(fn), ms));
  }

  function hideWin() {
    state.winTimers.forEach(clearTimeout);
    state.winTimers = [];
    const ov = $('win');
    if (!ov || ov.hidden) return;
    ov.classList.remove('show');
    $('win-card').classList.remove('ready');
    stopSpeech();
    setTimeout(() => { if (!ov.classList.contains('show')) ov.hidden = true; }, 230);
  }

  function wordFontSize(len) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const landscapeShort = vw > vh && vh < 560;
    let cw = landscapeShort ? Math.min(vw * 0.94, 760) * 0.56 : Math.min(vw * 0.94, 540) - 40;
    let fs = cw / (Math.max(len, 3) * 0.64);
    fs = Math.min(fs, 120, vh * (landscapeShort ? 0.16 : 0.12));
    return Math.max(26, Math.round(fs));
  }

  function showWin() {
    const n = state.level;
    const lv = state.lv || getLevel(n);
    const item = state.item || getItem(n);
    const w = state.world || world(Math.ceil(n / 10));
    const col = colorsOf(w);
    const stars = state.hintsUsed > 0 ? 2 : 3;

    const before = store.progress();
    store.saveResult(n, stars);
    const after = store.progress();
    if (n < 100 && before.unlocked < n + 1 && after.unlocked >= n + 1) {
      state.pendingUnlock = n + 1;
      state.pendingWorldUnlock = n % 10 === 0;
    }

    const worldEnd = lv.worldEnd != null ? !!lv.worldEnd : n % 10 === 0;
    const finale = n === 100;
    const custom = state.custom;
    const displayName = custom ? (custom.name || 'Resmim') : '';
    const word = custom ? displayName.toLocaleUpperCase('tr-TR') : String(item.word || '');
    const say = custom ? `Harika! ${displayName} resmini tamamladın!` : (item.say || item.word || 'Harika!');

    state.winN = n;
    const card = $('win-card');
    card.style.setProperty('--accent', col.accent);
    card.style.setProperty('--bg1', col.bg1);
    card.classList.remove('ready');

    // resim / emoji
    const pic = $('win-pic');
    pic.innerHTML = '';
    pic.className = 'win-pic';
    if (isCanvas(state.image) && state.image.width > 0) {
      // Tamamlanan resmin kendisi (eğitici resimlerde sayı/renk/şekil de doğru görünür)
      pic.classList.add('photo');
      pic.appendChild(thumbCanvas(state.image, 480, 360));
      if (custom) pic.insertAdjacentHTML('beforeend', '<span class="photo-badge">🖼️</span>');
    } else {
      pic.innerHTML = `<span class="win-emoji">${esc(item.emoji || '🧩')}</span>`;
    }

    // kelime: harfler sırayla zıplayarak gelir
    const letters = Array.from(word);
    const wEl = $('win-word');
    wEl.style.fontSize = wordFontSize(letters.length) + 'px';
    wEl.setAttribute('aria-label', word);
    wEl.innerHTML = letters.map((ch, i) =>
      `<span class="ltr" style="--i:${i};color:${PALETTE[i % PALETTE.length]}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
    ).join('');

    // yıldız yuvaları
    $('win-stars').innerHTML = '<span class="star-slot"><span class="s">⭐</span></span>'.repeat(3);

    // dünya sonu afişi / büyük final
    const banner = $('win-banner');
    banner.hidden = true;
    banner.textContent = `🏆 ${w.name || 'Dünya'} tamamlandı!`;
    const fin = $('win-final');
    fin.hidden = true;
    fin.textContent = '👑 Tebrikler! 100 yapbozun hepsini bitirdin! Sen bir Yapboz Ustasısın!';

    const next = $('win-next');
    next.textContent = finale ? '📒' : '▶';
    next.setAttribute('aria-label', finale ? 'Albüm' : 'Sonraki seviye');

    // aç
    const ov = $('win');
    ov.hidden = false;
    void ov.offsetWidth;
    ov.classList.add('show');
    Hist.push('win');

    sfx('win');
    buzz([30, 40, 30]);
    fx('confetti', { duration: 3000 });
    later(REDUCED ? 100 : 800, () => card.classList.add('ready'));

    const starStep = REDUCED ? 160 : 480;
    let t = REDUCED ? 200 : 350 + letters.length * 90 + 350;
    const slots = qsa('.star-slot', $('win-stars'));
    slots.forEach((slot, i) => {
      if (i < stars) later(t + i * starStep, () => { slot.classList.add('on'); sfx('star'); });
    });
    t += stars * starStep + 150;

    if (worldEnd) {
      later(t, () => {
        banner.hidden = false;
        fx('fireworks', { duration: finale ? 6500 : 4000 });
        sfx('fanfare');
      });
      t += REDUCED ? 300 : 1100;
    }
    if (finale) {
      later(t, () => { fin.hidden = false; fx('confetti', { duration: 5000 }); });
    }
    later(t, () => {
      const myN = n;
      speak(say).then(() => {
        if (!isWinOpen() || state.winN !== myN) return null;
        if (finale) return speak('Tebrikler! Bütün yapbozları bitirdin. Sen tam bir yapboz ustasısın!');
        if (worldEnd) return speak(`Yaşasın! ${w.name || ''} dünyası tamamlandı!`);
        return null;
      });
    });
  }

  function winReplay() { const n = state.winN || state.level; hideWin(); startLevel(n); }
  function winMap() { hideWin(); go('map'); }
  function winNext() {
    const n = state.winN || state.level;
    hideWin();
    if (n >= 100) go('album');
    else startLevel(n + 1);
  }

  /* ---------------------------------------------------------
     5. ÇIKARTMA ALBÜMÜ
     --------------------------------------------------------- */
  function enterAlbum() {
    const box = $('album-scroll');
    if (!box) return;
    const prog = store.progress();
    const ws = worlds();
    let doneCount = 0;
    let html = '';
    for (let wi = 0; wi < 10; wi++) {
      const w = ws[wi] || FALLBACK_WORLDS[wi];
      let cells = '';
      let wDone = 0;
      for (let i = 0; i < 10; i++) {
        const n = wi * 10 + i + 1;
        if (isDone(prog, n)) {
          wDone++;
          const it = getItem(n);
          const r = ((n * 37) % 9) - 4;
          cells += `<button class="sticker done" data-action="sticker" data-n="${n}" data-sfx="none" style="--r:${r}deg" aria-label="${esc(it.word)}">` +
            `<span class="st-emoji">${esc(it.emoji || '⭐')}</span><span class="st-word">${esc(it.word || '')}</span></button>`;
        } else {
          cells += `<button class="sticker" data-action="sticker" data-n="${n}" data-sfx="none" aria-label="Henüz yok">?</button>`;
        }
      }
      doneCount += wDone;
      html += `<section class="album-world" style="${worldVars(w)}"><h3><span class="aw-emoji">${esc(w.emoji)}</span>` +
        `<span>${esc(w.name)}</span><small>${wDone}/10</small></h3><div class="album-grid">${cells}</div></section>`;
    }
    box.innerHTML = html;
    box.scrollTop = 0;
    const c = $('album-count');
    if (c) c.textContent = doneCount + '/100';
  }

  function tapSticker(btn) {
    const n = clampLevel(btn.dataset.n);
    const prog = store.progress();
    const cls = isDone(prog, n) ? 'boing' : 'wiggle';
    btn.classList.remove('boing', 'wiggle');
    void btn.offsetWidth;
    btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 750);
    if (cls === 'boing') {
      sfx('pop');
      const it = getItem(n);
      speak(it.say || it.word);
    } else {
      sfx('click');
    }
  }

  /* ---------------------------------------------------------
     6. EBEVEYN KAPISI
     --------------------------------------------------------- */
  function buildKeypad() {
    const kp = $('keypad');
    if (!kp || kp.childElementCount) return;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    kp.innerHTML = keys.map((k) => {
      if (k === 'del') return '<button class="btn btn-orange" data-action="gate-key" data-key="del" aria-label="Sil">⌫</button>';
      if (k === 'ok') return '<button class="btn btn-green" data-action="gate-key" data-key="ok" aria-label="Tamam">✓</button>';
      return `<button class="btn btn-white" data-action="gate-key" data-key="${k}">${k}</button>`;
    }).join('');
  }

  function newGateQuestion() {
    let a, b;
    do { a = randInt(3, 9); b = randInt(3, 9); } while (a + b < 10);
    state.gate = { a, b, input: '' };
    $('gate-q').textContent = `${a} + ${b} = ?`;
    renderGateDisplay();
  }

  function renderGateDisplay() {
    const spans = qsa('span', $('gate-display'));
    const inp = state.gate.input;
    spans.forEach((s, i) => { s.textContent = inp[i] || ''; });
  }

  function enterGate() { buildKeypad(); newGateQuestion(); }

  function gateKey(k) {
    const g = state.gate;
    if (k === 'del') g.input = g.input.slice(0, -1);
    else if (k === 'ok') { checkGate(); return; }
    else if (g.input.length < 2) g.input += k;
    renderGateDisplay();
    if (g.input.length === 2) setTimeout(checkGate, 220);
  }

  function checkGate() {
    const g = state.gate;
    if (state.screen !== 'gate' || !g.input) return;
    if (parseInt(g.input, 10) === g.a + g.b) {
      sfx('unlock');
      g.input = '';
      go('parent');
    } else {
      sfx('wrong');
      const card = $('gate-card');
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      setTimeout(() => { card.classList.remove('shake'); newGateQuestion(); }, 550);
    }
  }

  /* ---------------------------------------------------------
     7. EBEVEYN PANELİ
     --------------------------------------------------------- */
  function enterParent() {
    const s = (state.settings = store.settings());
    qsa('input[name="imageMode"]').forEach((r) => { r.checked = r.value === s.imageMode; });
    ['sound', 'music', 'voice'].forEach((k) => { const cb = $('set-' + k); if (cb) cb.checked = !!s[k]; });
    renderProgressSummary();
    refreshThumbs();
  }

  function renderProgressSummary() {
    const prog = store.progress();
    let done = 0, stars = 0;
    for (let n = 1; n <= 100; n++) if (isDone(prog, n)) { done++; stars += starsOf(prog, n); }
    const el = $('progress-summary');
    if (el) el.textContent = `Tamamlanan: ${done} / 100 seviye · ⭐ ${stars} / 300 · Açık seviye: ${prog.unlocked}`;
  }

  let thumbsToken = 0;
  async function refreshThumbs() {
    const box = $('thumbs');
    if (!box) return;
    const tok = ++thumbsToken;
    if (!box.childElementCount) box.innerHTML = '<div class="empty">Yükleniyor…</div>';
    const imgs = await listImages();
    if (tok !== thumbsToken) return;
    state.imageCount = imgs.length;
    if (!imgs.length) {
      box.innerHTML = '<div class="empty">Henüz resim yok. “＋ Resim ekle” ile fotoğraf seçin ya da çekin.</div>';
    } else {
      box.innerHTML = imgs.map((im) =>
        `<div class="thumb" data-id="${esc(im.id)}">` +
          `<div class="thumb-img">${im.url ? `<img src="${esc(im.url)}" alt="" loading="lazy" decoding="async">` : ''}</div>` +
          '<div class="thumb-row">' +
            `<input class="thumb-name" type="text" maxlength="24" value="${esc(im.name || '')}" placeholder="Resmim" data-id="${esc(im.id)}" enterkeyhint="done" autocomplete="off" aria-label="Resim adı">` +
            `<button class="btn btn-sm btn-red" data-action="del-image" data-id="${esc(im.id)}" aria-label="Resmi sil">🗑</button>` +
          '</div>' +
        '</div>'
      ).join('');
    }
    updateModeNote();
  }

  function updateModeNote() {
    const note = $('mode-note');
    if (!note) return;
    const mode = state.settings.imageMode;
    if ((mode === 'custom' || mode === 'mixed') && !state.imageCount) {
      note.textContent = 'Henüz fotoğraf yüklemediniz; o seviyelerde eğitici resimler kullanılacak.';
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }

  function defaultName(fileName) {
    let s = String(fileName || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    // kamera / ekran görüntüsü adları çocuk için anlamsız
    if (!s || /^(img|dsc|dcim|pxl|image|photo|foto|screenshot|ekran|whatsapp|wp|mvimg|signal|received)\b/i.test(s) || (s.replace(/\D/g, '').length >= s.length / 2)) {
      return 'Resmim';
    }
    return s.slice(0, 24);
  }

  function setBusy(msg) {
    const b = $('busy');
    if (!b) return;
    if (msg) {
      $('busy-msg').textContent = msg;
      if (b.hidden) { b.hidden = false; void b.offsetWidth; b.classList.add('show'); }
    } else {
      b.classList.remove('show');
      b.hidden = true;
    }
  }

  async function onFiles(e) {
    const input = e.target;
    const files = Array.prototype.slice.call(input.files || []).filter((f) => !f.type || /^image\//.test(f.type));
    input.value = '';
    if (!files.length) return;
    if (!YB.Storage || !YB.Storage.addImage) { toast('⚠️ Resim kaydedilemedi'); return; }
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setBusy(files.length > 1 ? `Resimler hazırlanıyor… ${i + 1}/${files.length}` : 'Resim hazırlanıyor…');
      try {
        const r = await withTimeout(Promise.resolve(YB.Storage.addImage(files[i], defaultName(files[i].name))).then(() => true), 45000, false);
        if (r) ok++;
      } catch (err) { warn(err); }
    }
    setBusy(null);
    toast(ok ? `✓ ${ok} resim eklendi` : '⚠️ Resim eklenemedi', 2600);
    if (ok) sfx('pop');
    refreshThumbs();
  }

  function onThumbNameChange(e) {
    const inp = e.target;
    if (!inp.classList || !inp.classList.contains('thumb-name')) return;
    const name = inp.value.trim().slice(0, 24);
    inp.value = name;
    if (!YB.Storage || !YB.Storage.renameImage) return;
    withTimeout(Promise.resolve(safe(() => YB.Storage.renameImage(idValue(inp.dataset.id), name))).then(() => true), 8000, false)
      .then((r) => toast(r ? '✓ İsim kaydedildi' : '⚠️ İsim kaydedilemedi'));
  }

  async function deleteImage(btn) {
    const id = idValue(btn.dataset.id);
    const ok = await confirmDialog('Bu resim silinsin mi?', '🗑 Sil');
    if (!ok) return;
    if (YB.Storage && YB.Storage.deleteImage) {
      await withTimeout(Promise.resolve(safe(() => YB.Storage.deleteImage(id))), 8000, null);
    }
    toast('🗑 Resim silindi');
    refreshThumbs();
  }

  async function resetProgress() {
    const ok = await confirmDialog('Tüm ilerleme (yıldızlar ve çıkartmalar) silinsin mi? Bu işlem geri alınamaz.', 'Sıfırla');
    if (!ok) return;
    store.reset();
    renderProgressSummary();
    toast('İlerleme sıfırlandı');
  }

  function unlockAll() {
    store.unlockAll();
    renderProgressSummary();
    toast('🔓 Tüm seviyeler açıldı');
  }

  function bindParent() {
    const fi = $('file-input');
    if (fi) fi.addEventListener('change', (e) => { onFiles(e).catch(warn); });

    qsa('input[name="imageMode"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        store.saveSettings({ imageMode: r.value });
        sfx('pop');
        updateModeNote();
      });
    });

    ['sound', 'music', 'voice'].forEach((k) => {
      const cb = $('set-' + k);
      if (!cb) return;
      cb.addEventListener('change', () => {
        const on = cb.checked;
        const patch = {}; patch[k] = on;
        store.saveSettings(patch);
        audioEnabled(patch);
        if (k === 'music') music(on);
        if (k === 'sound' && on) { sfx('pop'); buzz(15); }
        if (k === 'voice' && on) speak('Merhaba!');
      });
    });

    const thumbs = $('thumbs');
    if (thumbs) {
      thumbs.addEventListener('change', onThumbNameChange);
      thumbs.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('thumb-name')) { e.preventDefault(); e.target.blur(); }
      });
    }
  }

  /* ---------------------------------------------------------
     Onay penceresi ve bildirim
     --------------------------------------------------------- */
  function confirmDialog(msg, okLabel, cancelLabel) {
    return new Promise((resolve) => {
      if (state.confirmResolve) closeConfirm(false);
      const ov = $('confirm');
      $('confirm-msg').textContent = msg;
      $('confirm-ok').textContent = okLabel || 'Evet';
      $('confirm-cancel').textContent = cancelLabel || 'Vazgeç';
      state.confirmResolve = resolve;
      ov.hidden = false;
      void ov.offsetWidth;
      ov.classList.add('show');
      Hist.push('confirm');
    });
  }

  function closeConfirm(value) {
    const ov = $('confirm');
    const res = state.confirmResolve;
    state.confirmResolve = null;
    ov.classList.remove('show');
    ov.hidden = true;
    if (res) res(!!value);
  }

  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2300);
  }

  /* ---------------------------------------------------------
     Eylemler (tek tıklama dinleyicisi)
     --------------------------------------------------------- */
  const ACTIONS = {
    'open-gate': () => go('gate'),
    'mascot': mascotTap,
    'play': () => go('map'),
    'album': () => go('album'),
    'home': () => go('home'),
    'to-map': () => go('map'),
    'preview': () => setPreview(!state.previewOn),
    'hint': doHint,
    'level': tapLevel,
    'sticker': tapSticker,
    'gate-key': (t) => gateKey(t.dataset.key),
    'file': () => {},
    'del-image': (t) => { deleteImage(t).catch(warn); },
    'unlock-all': unlockAll,
    'reset-progress': () => { resetProgress().catch(warn); },
    'win-replay': winReplay,
    'win-map': winMap,
    'win-next': winNext
  };

  function onClick(e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    const t = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!t) return;
    const a = t.getAttribute('data-action');
    const s = t.getAttribute('data-sfx') || (t.classList.contains('btn') ? 'click' : null);
    if (s && s !== 'none') sfx(s);
    const h = ACTIONS[a];
    if (h) safe(() => h(t, e));
  }

  /* ---------------------------------------------------------
     Genel dinleyiciler
     --------------------------------------------------------- */
  const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

  function audioGesture(e) {
    safe(() => { if (YB.Audio && YB.Audio.unlock) YB.Audio.unlock(); });
    if (state.settings.music) music(true);
    // Android'de dokunmada asıl kullanıcı etkinleşmesi pointerup/touchend ile gelir
    if (e.type !== 'pointerdown' || e.pointerType === 'mouse') {
      state.audioArmed = true;
      GESTURE_EVENTS.forEach((t) => document.removeEventListener(t, audioGesture, true));
    }
  }

  function onPointerDown(e) {
    const b = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (b && !b.classList.contains('nudge') && !b.classList.contains('btn-next') && !b.classList.contains('btn-play')) {
      b.classList.remove('squish');
      void b.offsetWidth;
      b.classList.add('squish');
    }
  }

  function onAnimEnd(e) {
    if (e.animationName === 'squish' && e.target.classList) e.target.classList.remove('squish');
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.screen === 'map') layoutMap(); }, 140);
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      music(false);
    } else {
      if (state.audioArmed && state.settings.music) music(true);
      if (state.screen === 'play') { state.wakeLock = null; requestWake(); }
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      // geçmiş girdisini de tüket ki Android geri ile tutarlı kalsın
      if (state.screen !== 'home' || isWinOpen() || !$('confirm').hidden) {
        if (Hist.depth > 1) { try { history.back(); return; } catch (err) { /* aşağı düş */ } }
        backAction();
      }
    }
  }

  function bindGlobal() {
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('animationend', onAnimEnd);
    GESTURE_EVENTS.forEach((t) => document.addEventListener(t, audioGesture, true));
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('popstate', onPopState);

    // uzun basma menüsü, çift dokunma ve kıstırma yakınlaştırması kapalı
    document.addEventListener('contextmenu', (e) => {
      if (!(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) e.preventDefault();
    });
    document.addEventListener('dblclick', (e) => { if (!(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

    $('confirm-ok').addEventListener('click', () => { sfx('click'); closeConfirm(true); });
    $('confirm-cancel').addEventListener('click', () => { sfx('click'); closeConfirm(false); });
  }

  function registerSW() {
    try {
      if (!/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;
      const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
      if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
    } catch (e) { /* sessiz */ }
  }

  /* ---------------------------------------------------------
     Başlat
     --------------------------------------------------------- */
  function init() {
    state.settings = store.settings();
    audioEnabled({ sound: !!state.settings.sound, music: !!state.settings.music, voice: !!state.settings.voice });
    buildSky();
    buildHome();
    buildKeypad();
    bindParent();
    bindGlobal();
    try { history.replaceState({ yb: 'root' }, ''); } catch (e) { /* sessiz */ }
    go('home');
    registerSW();
  }

  YB.App = {
    go: (name, params) => safe(() => go(name, params)),
    startLevel: (n) => safe(() => startLevel(n)),
    get state() { return state; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safe(init));
  else safe(init);
})();
