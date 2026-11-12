/* Yapboz Dünyası — YB.Puzzle (yapboz motoru)
 * Klasik script, bağımlılık yok. Bkz. SPEC.md "YB.Puzzle".
 *
 *   var p = YB.Puzzle.create(container, {image, cols, rows, shape, ghost, grid, snap, seed,
 *                                        tutorial, onPickup, onDrop, onSnap, onComplete});
 *   p.hint(); p.solve(); p.destroy();
 *
 * Performans notları (Android telefon önceliği):
 *  - Parçalarda CSS filter YOK. Dinlenme gölgesi her parça canvas'ına bir kez çizilir.
 *    Sürükleme gölgesi ve ipucu parıltısı, ayrı önceden çizilmiş canvas katmanlarıdır.
 *  - Hareket yalnızca transform/opacity; DOM okuması sadece pointerdown/relayout'ta.
 *  - rAF döngüsü yalnızca iş varken çalışır.
 */
window.YB = window.YB || {};
YB.Puzzle = (function () {
  'use strict';

  var DRAG_SCALE = 1.08;       // sürüklerken büyüme
  var TRAY_MIN_SCALE = 0.45;   // tepside izin verilen en küçük ölçek (altında üst üste binme)
  var TAB = 0.095;             // diş boyutu (kısa kenara oran)
  var DEAD_ZONE = 4;           // px; altındaki hareket "dokunma" sayılır
  var TOUCH_LIFT = 0.35;       // dokunmada parça parmağın bu kadar (parça yüksekliği) üstünde
  var TOUCH_SNAP_BONUS = 1.3;  // dokunmada yakalama mesafesi çarpanı
  var SNAP_MS = 280;
  var COMPLETE_DELAY = 350;
  var COMPLETE_ANIM = 1500;
  var HINT_MS = 1500;
  var STYLE_ID = 'yb-puzzle-style';

  // ------------------------------------------------------------------ yardımcılar
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function num(v, d) { v = +v; return (v === v && isFinite(v)) ? v : d; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { t = 1 - t; return 1 - t * t * t; }
  function easeOutBack(t) { var c1 = 1.35, c3 = c1 + 1; t -= 1; return 1 + c3 * t * t * t + c1 * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // ------------------------------------------------------------------ PRNG
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(seed) {
    var s = String(seed == null ? 1 : seed), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h ^ 0x5bd1e995) >>> 0;
  }
  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ------------------------------------------------------------------ geometri (saf)
  // Görüntü koordinatlarında (ör. 1200×900). Kenarlar paylaşılır: komşu iki parça aynı
  // kenar noktalarını biri ileri, diğeri ters yönde kullanır → birebir oturur.
  function makeGeometry(o) {
    var IW = o.IW, IH = o.IH, cols = o.cols, rows = o.rows;
    var cw = IW / cols, ch = IH / rows, S = Math.min(cw, ch);
    var jig = o.shape === 'jigsaw';
    var rng = mulberry32(hashSeed(o.seed));
    function r(j) { return (rng() * 2 - 1) * j; }
    function edge() {
      return { k: rng() < 0.5 ? 1 : -1, t: TAB * (1 + r(0.1)), a: r(0.035), b: r(0.045), c: r(0.025), d: r(0.025), e: r(0.035) };
    }
    var h = [], v = [], R, C;
    // h[R][C]: y = R*ch üzerindeki kenar (R-1. ve R. satır arası), soldan sağa; +dik = aşağı
    for (R = 0; R <= rows; R++) { h[R] = []; for (C = 0; C < cols; C++) h[R][C] = (jig && R > 0 && R < rows) ? edge() : null; }
    // v[R][C]: x = C*cw üzerindeki kenar (C-1. ve C. sütun arası), yukarıdan aşağı; +dik = sağa
    for (R = 0; R < rows; R++) { v[R] = []; for (C = 0; C <= cols; C++) v[R][C] = (jig && C > 0 && C < cols) ? edge() : null; }
    return {
      IW: IW, IH: IH, cols: cols, rows: rows, cw: cw, ch: ch, S: S, jig: jig, h: h, v: v,
      ext: jig ? 0.29 * S : 0,      // en büyük diş taşması (canvas payı için)
      packExt: jig ? 0.22 * S : 0   // tepside yerleşim için ortalama taşma
    };
  }

  // Kenarı yerel (boy, dik) koordinatlarda 10 nokta: p0, 3 kübik bezier (p1..p9)
  function edgeLocal(e, L, S) {
    var t = e.t, m = L / 2, k = e.k;
    var P = [
      [0, 0],
      [0.2 * L, e.a * S],
      [m + (e.b + e.d) * S, (-t + e.c) * S],
      [m + (-t + e.b) * S, (t + e.c) * S],
      [m + (-2 * t + e.b - e.d) * S, (3 * t + e.c) * S],
      [m + (2 * t + e.b - e.d) * S, (3 * t + e.c) * S],
      [m + (t + e.b) * S, (t + e.c) * S],
      [m + (e.b + e.d) * S, (-t + e.c) * S],
      [0.8 * L, e.e * S],
      [L, 0]
    ];
    for (var i = 0; i < P.length; i++) P[i][1] *= k;
    return P;
  }
  function edgeH(g, e, x0, y) {
    return edgeLocal(e, g.cw, g.S).map(function (p) { return [x0 + p[0], y + p[1]]; });
  }
  function edgeV(g, e, x, y0) {
    return edgeLocal(e, g.ch, g.S).map(function (p) { return [x + p[1], y0 + p[0]]; });
  }
  function pushEdge(ops, pts, rev) {
    if (rev) pts = pts.slice().reverse();
    ops.push(['C', pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
    ops.push(['C', pts[4][0], pts[4][1], pts[5][0], pts[5][1], pts[6][0], pts[6][1]]);
    ops.push(['C', pts[7][0], pts[7][1], pts[8][0], pts[8][1], pts[9][0], pts[9][1]]);
  }
  // Parça yolu (saat yönünde), mutlak görüntü koordinatlarında
  function pieceOps(g, c, r) {
    var x0 = c * g.cw, y0 = r * g.ch, x1 = x0 + g.cw, y1 = y0 + g.ch, e;
    var ops = [['M', x0, y0]];
    e = g.h[r][c];     if (e) pushEdge(ops, edgeH(g, e, x0, y0), false); else ops.push(['L', x1, y0]);
    e = g.v[r][c + 1]; if (e) pushEdge(ops, edgeV(g, e, x1, y0), false); else ops.push(['L', x1, y1]);
    e = g.h[r + 1][c]; if (e) pushEdge(ops, edgeH(g, e, x0, y1), true);  else ops.push(['L', x0, y1]);
    e = g.v[r][c];     if (e) pushEdge(ops, edgeV(g, e, x0, y0), true);  else ops.push(['L', x0, y0]);
    ops.push(['Z']);
    return ops;
  }
  // ctx veya Path2D üzerine çiz (dx,dy kaydırma)
  function traceOps(t, ops, dx, dy) {
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i];
      if (o[0] === 'M') t.moveTo(o[1] + dx, o[2] + dy);
      else if (o[0] === 'L') t.lineTo(o[1] + dx, o[2] + dy);
      else if (o[0] === 'C') t.bezierCurveTo(o[1] + dx, o[2] + dy, o[3] + dx, o[4] + dy, o[5] + dx, o[6] + dy);
      else if (o[0] === 'Z') t.closePath();
    }
  }
  // Izgara için her kenarı bir kez çiz
  function traceGridEdges(t, g) {
    var R, C, e, p;
    for (R = 1; R < g.rows; R++) {
      for (C = 0; C < g.cols; C++) {
        e = g.h[R][C];
        if (!e) { t.moveTo(C * g.cw, R * g.ch); t.lineTo((C + 1) * g.cw, R * g.ch); continue; }
        p = edgeH(g, e, C * g.cw, R * g.ch);
        t.moveTo(p[0][0], p[0][1]);
        t.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
        t.bezierCurveTo(p[4][0], p[4][1], p[5][0], p[5][1], p[6][0], p[6][1]);
        t.bezierCurveTo(p[7][0], p[7][1], p[8][0], p[8][1], p[9][0], p[9][1]);
      }
    }
    for (R = 0; R < g.rows; R++) {
      for (C = 1; C < g.cols; C++) {
        e = g.v[R][C];
        if (!e) { t.moveTo(C * g.cw, R * g.ch); t.lineTo(C * g.cw, (R + 1) * g.ch); continue; }
        p = edgeV(g, e, C * g.cw, R * g.ch);
        t.moveTo(p[0][0], p[0][1]);
        t.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
        t.bezierCurveTo(p[4][0], p[4][1], p[5][0], p[5][1], p[6][0], p[6][1]);
        t.bezierCurveTo(p[7][0], p[7][1], p[8][0], p[8][1], p[9][0], p[9][1]);
      }
    }
  }

  // ------------------------------------------------------------------ yerleşim (saf)
  function traysFor(type, W, H, pad, gap, bw, bh) {
    var bx, by, t;
    if (type === 'lr') {
      bx = (W - bw) / 2; by = (H - bh) / 2;
      t = (W - bw) / 2 - pad - gap;
      return { bx: bx, by: by, trays: [{ x: pad, y: pad, w: t, h: H - 2 * pad }, { x: bx + bw + gap, y: pad, w: t, h: H - 2 * pad }] };
    }
    if (type === 'r') {
      bx = pad; by = (H - bh) / 2;
      return { bx: bx, by: by, trays: [{ x: bx + bw + gap, y: pad, w: W - bw - 2 * pad - gap, h: H - 2 * pad }] };
    }
    if (type === 'b') {
      bx = (W - bw) / 2; by = pad;
      return { bx: bx, by: by, trays: [{ x: pad, y: by + bh + gap, w: W - 2 * pad, h: H - bh - 2 * pad - gap }] };
    }
    // 'tb'
    bx = (W - bw) / 2; by = (H - bh) / 2;
    t = (H - bh) / 2 - pad - gap;
    return { bx: bx, by: by, trays: [{ x: pad, y: pad, w: W - 2 * pad, h: t }, { x: pad, y: by + bh + gap, w: W - 2 * pad, h: t }] };
  }
  function capacity(trays, fw, fh) {
    var c = 0;
    for (var i = 0; i < trays.length; i++) c += Math.floor(trays[i].w / fw) * Math.floor(trays[i].h / fh);
    return c;
  }
  // n parçanın sığdığı en büyük ölçek (1'den büyük olabilir; çağıran kırpar)
  function fitScale(trays, n, fw, fh) {
    var lo = 0.02, hi = 4;
    if (capacity(trays, fw * lo, fh * lo) < n) return lo;
    for (var i = 0; i < 26; i++) {
      var mid = (lo + hi) / 2;
      if (capacity(trays, fw * mid, fh * mid) >= n) lo = mid; else hi = mid;
    }
    return lo;
  }
  var PREF = { lr: 1, b: 1, r: 0.95, tb: 0.9 };
  // g: {IW, IH, cw, ch, packExt}; n parça sayısı
  function computeLayout(W, H, g, n) {
    var pad = Math.max(6, Math.round(Math.min(W, H) * 0.02));
    var gap = pad;
    var ar = g.IW / g.IH;
    var types = ['lr', 'b', 'r', 'tb'];
    var best = null;
    for (var ti = 0; ti < types.length; ti++) {
      var type = types[ti];
      var bwMax = Math.min(W - 2 * pad, (H - 2 * pad) * ar);
      if (bwMax <= 10) continue;
      for (var i = 0; i <= 50; i++) {
        var bw = bwMax * (1 - i * 0.013);
        var bh = bw / ar, bs = bw / g.IW;
        var L = traysFor(type, W, H, pad, gap, bw, bh);
        var ok = true;
        for (var k = 0; k < L.trays.length; k++) if (L.trays[k].w < 24 || L.trays[k].h < 24) ok = false;
        if (!ok) continue;
        var fw = (g.cw + 2 * g.packExt) * bs + 6, fh = (g.ch + 2 * g.packExt) * bs + 6;
        var s = Math.min(1, fitScale(L.trays, n, fw, fh));
        var score = bw * Math.pow(s, 0.55) * PREF[type] * (s < TRAY_MIN_SCALE ? 0.7 : 1);
        if (!best || score > best.score) {
          best = { score: score, type: type, bx: L.bx, by: L.by, bw: bw, bh: bh, bs: bs, trays: L.trays,
                   fitScale: s, trayScale: Math.max(s, TRAY_MIN_SCALE), overlap: s < TRAY_MIN_SCALE, pad: pad, fw: fw, fh: fh };
        }
      }
    }
    if (!best) { // çok küçük alan: tahta tüm alan, tepsi yok → parçalar tahta dışında kalamaz; alt kenara dizilir
      var bw2 = Math.max(10, Math.min(W, H * ar)), bh2 = bw2 / ar;
      best = { score: 0, type: 'none', bx: (W - bw2) / 2, by: (H - bh2) / 2, bw: bw2, bh: bh2, bs: bw2 / g.IW,
               trays: [{ x: 0, y: Math.max(0, H - 40), w: W, h: Math.min(40, H) }], fitScale: TRAY_MIN_SCALE,
               trayScale: TRAY_MIN_SCALE, overlap: true, pad: 0, fw: 1, fh: 1 };
      best.fw = (g.cw + 2 * g.packExt) * best.bs + 6; best.fh = (g.ch + 2 * g.packExt) * best.bs + 6;
    }
    return best;
  }
  // Tepsilere n merkez noktası dağıt. fw,fh: ölçeklenmiş ayak izi. Sığmazsa eşit aralıkla üst üste bindirir.
  function packTrays(trays, n, fw, fh, rng) {
    var out = [];
    if (!n) return out;
    rng = rng || Math.random;
    var caps = trays.map(function (t) { return Math.max(0, Math.floor(t.w / fw) * Math.floor(t.h / fh)); });
    var totalCap = caps.reduce(function (a, b) { return a + b; }, 0);
    var weights = totalCap >= n ? caps : trays.map(function (t) { return Math.max(1, t.w * t.h); });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var counts = weights.map(function (w) { return Math.floor(n * w / wsum); });
    var rem = n - counts.reduce(function (a, b) { return a + b; }, 0);
    var order = weights.map(function (w, i) { return { i: i, f: n * w / wsum - counts[i] }; }).sort(function (a, b) { return b.f - a.f; });
    for (var q = 0; rem > 0; q++) {
      var idx = order[q % order.length].i;
      if (totalCap < n || counts[idx] < caps[idx]) { counts[idx]++; rem--; }
      if (q > 10 * n + 10) { counts[0] += rem; rem = 0; }
    }
    for (var ti = 0; ti < trays.length; ti++) {
      var t = trays[ti], k = counts[ti];
      if (!k) continue;
      var bestGc = 1, bestRatio = -1, bestCells = Infinity;
      for (var gc = 1; gc <= k; gc++) {
        var gr = Math.ceil(k / gc);
        var ratio = Math.min(t.w / gc / fw, t.h / gr / fh);
        if (ratio > bestRatio + 1e-9 || (Math.abs(ratio - bestRatio) < 1e-9 && gc * gr < bestCells)) {
          bestRatio = ratio; bestGc = gc; bestCells = gc * gr;
        }
      }
      var GC = bestGc, GR = Math.ceil(k / GC);
      var sx = t.w / GC, sy = t.h / GR;
      var jx = Math.max(0, sx - fw) / 2 * 0.7, jy = Math.max(0, sy - fh) / 2 * 0.7;
      for (var j = 0; j < k; j++) {
        var row = Math.floor(j / GC), col = j % GC;
        var inRow = (row === GR - 1) ? k - row * GC : GC;
        var offX = (GC - inRow) * sx / 2;
        out.push({
          x: t.x + offX + (col + 0.5) * sx + (rng() * 2 - 1) * jx,
          y: t.y + (row + 0.5) * sy + (rng() * 2 - 1) * jy,
          tray: ti
        });
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ CSS
  var CSS = [
    '.ybp-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;touch-action:none;-ms-touch-action:none;',
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;isolation:isolate;z-index:0;contain:strict;}',
    '.ybp-root *{-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}',
    '.ybp-board{position:absolute;left:0;top:0;z-index:0;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.6);',
    'box-shadow:inset 0 2px 8px rgba(0,0,0,.2),0 0 0 3px rgba(255,255,255,.65),0 4px 14px rgba(0,0,0,.14);}',
    '.ybp-board canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;}',
    '.ybp-piece{position:absolute;left:0;top:0;display:block;transform-origin:50% 50%;pointer-events:none;}',
    '.ybp-live{will-change:transform;}',
    '.ybp-aux{position:absolute;left:0;top:0;display:block;transform-origin:50% 50%;pointer-events:none;opacity:0;transition:opacity .16s ease-out;will-change:transform,opacity;}',
    '.ybp-aux.ybp-on{opacity:1;}',
    '.ybp-glowc.ybp-on{transition:none;animation:ybp-glow .42s ease-in-out infinite alternate;}',
    '@keyframes ybp-glow{from{opacity:.35}to{opacity:1}}',
    '.ybp-slot{position:absolute;left:0;top:0;z-index:3;pointer-events:none;transform-origin:50% 50%;animation:ybp-slot .42s ease-in-out infinite alternate;}',
    '@keyframes ybp-slot{from{opacity:.25;transform:scale(.97)}to{opacity:1;transform:scale(1.03)}}',
    '.ybp-tut{position:absolute;left:0;top:0;right:0;bottom:0;z-index:150000;pointer-events:none;}',
    '.ybp-tut svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;}',
    '.ybp-trail{fill:none;stroke:#fff;stroke-linecap:round;stroke-dasharray:0 16;animation:ybp-dots .8s linear infinite;}',
    '.ybp-trail2{fill:none;stroke:rgba(0,0,0,.22);stroke-linecap:round;stroke-dasharray:0 16;animation:ybp-dots .8s linear infinite;}',
    '@keyframes ybp-dots{to{stroke-dashoffset:-16}}',
    '.ybp-hand{position:absolute;left:0;top:0;line-height:1;text-shadow:0 4px 6px rgba(0,0,0,.35);will-change:transform,opacity;opacity:0;}',
    '.ybp-tghost{position:absolute;left:0;top:0;will-change:transform,opacity;opacity:0;}',
    '.ybp-done{position:absolute;left:0;top:0;z-index:200000;pointer-events:none;border-radius:6px;overflow:hidden;opacity:0;transform-origin:50% 50%;',
    'animation:ybp-fadein .5s ease-out forwards,ybp-pulse .8s .45s ease-in-out;}',
    '.ybp-done canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;}',
    '.ybp-shine{position:absolute;top:-10%;bottom:-10%;left:0;width:45%;',
    'background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.18) 30%,rgba(255,255,255,.8) 50%,rgba(255,255,255,.18) 70%,rgba(255,255,255,0) 100%);',
    'transform:translateX(-120%) skewX(-14deg);animation:ybp-shine 1s .35s ease-in-out forwards;}',
    '@keyframes ybp-fadein{from{opacity:0}to{opacity:1}}',
    '@keyframes ybp-pulse{0%{transform:scale(1)}45%{transform:scale(1.04)}100%{transform:scale(1)}}',
    '@keyframes ybp-shine{from{transform:translateX(-120%) skewX(-14deg)}to{transform:translateX(330%) skewX(-14deg)}}',
    '@media (prefers-reduced-motion:reduce){.ybp-done{animation:ybp-fadein .4s ease-out forwards}.ybp-shine{display:none}',
    '.ybp-trail,.ybp-trail2{animation:none}.ybp-slot{animation-duration:.8s}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function safeCall(fn, arg) {
    if (typeof fn !== 'function') return;
    try { fn(arg); } catch (err) { if (window.console) console.error('[YB.Puzzle] callback error', err); }
  }

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ create
  function create(container, opts) {
    if (!container) throw new Error('YB.Puzzle.create: container gerekli');
    opts = opts || {};
    injectStyle();

    var image = opts.image;
    if (!image) { image = document.createElement('canvas'); image.width = 1200; image.height = 900; }
    var IW = image.naturalWidth || image.videoWidth || image.width || 1200;
    var IH = image.naturalHeight || image.videoHeight || image.height || 900;
    var cols = Math.max(1, Math.round(num(opts.cols, 2)));
    var rows = Math.max(1, Math.round(num(opts.rows, 1)));
    var shape = opts.shape === 'jigsaw' ? 'jigsaw' : 'rect';
    var ghostOpacity = clamp(num(opts.ghost, 0.4), 0, 1);
    var showGrid = opts.grid === undefined ? true : !!opts.grid;
    var snapRatio = clamp(num(opts.snap, 0.4), 0.05, 2);
    var seed = opts.seed == null ? 1 : opts.seed;
    var N = cols * rows;
    var g = makeGeometry({ IW: IW, IH: IH, cols: cols, rows: rows, shape: shape, seed: seed });
    var rng = mulberry32(hashSeed(seed) ^ 0xA5A5A5A5);
    var reduce = reducedMotion();

    // --- durum
    var destroyed = false, completed = false, completeFired = false, completeScheduled = false;
    var placedCount = 0;
    var W = 0, H = 0, L = null, dpr = 1, rootRect = null;
    var raf = 0, lastTick = 0;
    var timers = [];
    var drag = null, hintSt = null, tut = null, tutWanted = !!opts.tutorial;
    var zTop = 10;
    var doneEl = null;

    // --- DOM
    var prevPos = null;
    try {
      if (window.getComputedStyle(container).position === 'static') { prevPos = container.style.position; container.style.position = 'relative'; }
    } catch (e) { /* yoksay */ }

    var root = document.createElement('div');
    root.className = 'ybp-root';
    var board = document.createElement('div');
    board.className = 'ybp-board';
    var ghostCv = document.createElement('canvas');
    ghostCv.style.opacity = String(ghostOpacity);
    var gridCv = document.createElement('canvas');
    board.appendChild(ghostCv);
    if (showGrid) board.appendChild(gridCv);
    root.appendChild(board);

    // sürükleme gölgesi ve ipucu parıltısı: tek, önceden çizilen katmanlar (CSS filter yok)
    var shadowCv = document.createElement('canvas');
    shadowCv.className = 'ybp-aux';
    var glowCv = document.createElement('canvas');
    glowCv.className = 'ybp-aux ybp-glowc';
    root.appendChild(shadowCv);
    root.appendChild(glowCv);

    var hitCtx = document.createElement('canvas').getContext('2d');
    var hasPath2D = typeof window.Path2D === 'function';

    var pieces = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var ops = pieceOps(g, c, r);
        var x0 = c * g.cw, y0 = r * g.ch;
        var path = null;
        if (hasPath2D) { path = new Path2D(); traceOps(path, ops, -x0, -y0); }
        var el = document.createElement('canvas');
        el.className = 'ybp-piece';
        var p = {
          index: r * cols + c, col: c, row: r, x0: x0, y0: y0, ops: ops, path: path, el: el,
          cssW: 0, cssH: 0, cx: 0, cy: 0, s: 1, rot: 0, restScale: 1,
          placed: false, tw: null, hintRot: 0, hintS: 1, dirty: true, z: 10, live: false
        };
        pieces.push(p);
        root.appendChild(el);
      }
    }
    container.appendChild(root);

    // ------------------------------------------------------------ çizim
    function localPath(ctx, p) {
      if (p.path) return p.path;
      ctx.beginPath(); traceOps(ctx, p.ops, -p.x0, -p.y0); return null;
    }
    function fillPath(ctx, p) { var pp = localPath(ctx, p); if (pp) ctx.fill(pp); else ctx.fill(); }
    function strokePath(ctx, p) { var pp = localPath(ctx, p); if (pp) ctx.stroke(pp); else ctx.stroke(); }
    function clipPath(ctx, p) { var pp = localPath(ctx, p); if (pp) ctx.clip(pp); else ctx.clip(); }

    function sizeCanvas(cv, cssW, cssH) {
      var bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
      if (cv.width !== bw) cv.width = bw;
      if (cv.height !== bh) cv.height = bh;
      cv.style.width = cssW + 'px';
      cv.style.height = cssH + 'px';
      return cv.getContext('2d');
    }

    function renderPiece(p) {
      var m = L.m, bs = L.bs;
      var wI = g.cw + 2 * m, hI = g.ch + 2 * m;
      p.cssW = wI * bs; p.cssH = hI * bs;
      var ctx = sizeCanvas(p.el, p.cssW, p.cssH);
      var kx = p.el.width / wI, ky = p.el.height / hI;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, p.el.width, p.el.height);
      ctx.setTransform(kx, 0, 0, ky, m * kx, m * ky);
      // dinlenme gölgesi (bir kez, canvas içinde)
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.34)';
      ctx.shadowBlur = 4 * dpr;
      ctx.shadowOffsetX = 0.5 * dpr;
      ctx.shadowOffsetY = 2 * dpr;
      ctx.fillStyle = '#7a7a7a';
      fillPath(ctx, p);
      ctx.restore();
      // resim
      ctx.save();
      clipPath(ctx, p);
      ctx.drawImage(image, -p.x0, -p.y0, IW, IH);
      // bevel: üst-sol açık, alt-sağ koyu iç çizgi
      var d = clamp(g.S * bs * 0.022, 1.2, 3.2) / bs;
      ctx.lineJoin = 'round';
      ctx.translate(d * 0.8, d * 0.8);
      ctx.lineWidth = d * 2.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      strokePath(ctx, p);
      ctx.translate(-d * 1.6, -d * 1.6);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      strokePath(ctx, p);
      ctx.restore();
      ctx.lineWidth = 1 / bs;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      strokePath(ctx, p);
    }

    // Yalnızca gölge/parıltı olan halo canvas (şekil ekran dışında çizilir, gölgesi içeri kaydırılır)
    function renderHalo(cv, p, color, blurCss, passes) {
      var bs = L.bs, extra = blurCss * 2 / bs;
      var m = L.m + extra;
      var wI = g.cw + 2 * m, hI = g.ch + 2 * m;
      var cssW = wI * bs, cssH = hI * bs;
      var ctx = sizeCanvas(cv, cssW, cssH);
      cv._w = cssW; cv._h = cssH;
      var kx = cv.width / wI, ky = cv.height / hI;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var OFF = 10000; // cihaz px
      ctx.setTransform(kx, 0, 0, ky, m * kx - OFF, m * ky);
      ctx.shadowColor = color;
      ctx.shadowBlur = blurCss * dpr;
      ctx.shadowOffsetX = OFF;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#000';
      for (var i = 0; i < (passes || 1); i++) fillPath(ctx, p);
    }

    function renderBoard() {
      board.style.left = L.bx + 'px';
      board.style.top = L.by + 'px';
      board.style.width = L.bw + 'px';
      board.style.height = L.bh + 'px';
      var ctx = sizeCanvas(ghostCv, L.bw, L.bh);
      ghostCv.style.width = ghostCv.style.height = '100%';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ghostCv.width, ghostCv.height);
      ctx.drawImage(image, 0, 0, ghostCv.width, ghostCv.height);
      try { // renk doygunluğunu azalt (silik, griye yakın)
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, ghostCv.width, ghostCv.height);
      } catch (e) { /* yoksay */ }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (showGrid) {
        var gx = sizeCanvas(gridCv, L.bw, L.bh);
        gridCv.style.width = gridCv.style.height = '100%';
        var k = gridCv.width / IW;
        gx.setTransform(1, 0, 0, 1, 0, 0);
        gx.clearRect(0, 0, gridCv.width, gridCv.height);
        gx.setTransform(k, 0, 0, gridCv.height / IH, 0, 0);
        var bs = L.bs, lw = 2 / bs;
        gx.lineCap = 'round'; gx.lineJoin = 'round';
        gx.beginPath(); traceGridEdges(gx, g);
        gx.rect(lw / 2, lw / 2, IW - lw, IH - lw);
        gx.setLineDash([]);
        gx.lineWidth = lw * 1.8; gx.strokeStyle = 'rgba(255,255,255,0.45)'; gx.stroke();
        gx.setLineDash([7 / bs, 6 / bs]);
        gx.lineWidth = lw; gx.strokeStyle = 'rgba(40,40,80,0.55)'; gx.stroke();
      }
    }

    function renderDone() {
      if (!doneEl) return;
      doneEl.style.left = L.bx + 'px';
      doneEl.style.top = L.by + 'px';
      doneEl.style.width = L.bw + 'px';
      doneEl.style.height = L.bh + 'px';
      var cv = doneEl.firstChild;
      var ctx = sizeCanvas(cv, L.bw, L.bh);
      cv.style.width = cv.style.height = '100%';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(image, 0, 0, cv.width, cv.height);
    }

    // ------------------------------------------------------------ koordinat yardımcıları
    function slotCenter(p) {
      return { x: L.bx + (p.col + 0.5) * g.cw * L.bs, y: L.by + (p.row + 0.5) * g.ch * L.bs };
    }
    function clampCenter(x, y, s) {
      var hx = g.cw * L.bs * s * 0.5, hy = g.ch * L.bs * s * 0.5;
      return { x: W < 2 * hx ? W / 2 : clamp(x, hx, W - hx), y: H < 2 * hy ? H / 2 : clamp(y, hy, H - hy) };
    }
    function overBoard(x, y) {
      var mx = g.cw * L.bs * 0.25, my = g.ch * L.bs * 0.25;
      return x > L.bx - mx && x < L.bx + L.bw + mx && y > L.by - my && y < L.by + L.bh + my;
    }

    // ------------------------------------------------------------ transform yazımı
    function setLive(p, on) {
      if (p.live === on) return;
      p.live = on;
      if (on) p.el.classList.add('ybp-live'); else p.el.classList.remove('ybp-live');
    }
    function xf(x, y, w, h, rot, s) {
      return 'translate(' + (x - w / 2).toFixed(2) + 'px,' + (y - h / 2).toFixed(2) + 'px)' +
        (rot ? ' rotate(' + rot.toFixed(2) + 'deg)' : '') + ' scale(' + s.toFixed(4) + ')';
    }
    function flush() {
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (!p.dirty) continue;
        p.dirty = false;
        p.el.style.transform = xf(p.cx, p.cy, p.cssW, p.cssH, p.rot + p.hintRot, p.s * p.hintS);
      }
      if (drag && shadowCv._w) {
        var dp = drag.p;
        var off = 7 + Math.abs(drag.lift) * 0.3;
        shadowCv.style.transform = xf(dp.cx + 2, dp.cy + off, shadowCv._w, shadowCv._h, dp.rot, dp.s);
      }
      if (hintSt && hintSt.p && glowCv._w) {
        var hp = hintSt.p;
        glowCv.style.transform = xf(hp.cx, hp.cy, glowCv._w, glowCv._h, hp.rot + hp.hintRot, hp.s * hp.hintS);
      }
    }

    // ------------------------------------------------------------ rAF döngüsü
    function schedule() {
      if (!raf && !destroyed) raf = requestAnimationFrame(tick);
    }
    function later(ms, fn) {
      var id = setTimeout(function () {
        var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1);
        if (!destroyed) fn();
      }, ms);
      timers.push(id);
      return id;
    }
    function clearLater(id) {
      if (id == null) return;
      clearTimeout(id);
      var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1);
    }

    function tweenTo(p, to, dur, ease, done) {
      p.tw = { t0: now(), dur: dur, ease: ease, from: { cx: p.cx, cy: p.cy, s: p.s, rot: p.rot }, to: to, done: done };
      setLive(p, true);
      schedule();
    }
    function stepTween(p, t) {
      var tw = p.tw, u = Math.min(1, (t - tw.t0) / tw.dur), e = tw.ease(u);
      p.cx = lerp(tw.from.cx, tw.to.cx, e);
      p.cy = lerp(tw.from.cy, tw.to.cy, e);
      p.s = lerp(tw.from.s, tw.to.s, e);
      p.rot = lerp(tw.from.rot, tw.to.rot, e);
      p.dirty = true;
      if (u >= 1) {
        p.cx = tw.to.cx; p.cy = tw.to.cy; p.s = tw.to.s; p.rot = tw.to.rot;
        p.tw = null;
        if (!(drag && drag.p === p) && !(hintSt && hintSt.p === p)) setLive(p, false);
        if (tw.done) tw.done();
        return false;
      }
      return true;
    }
    function finishTweens() {
      for (var i = 0; i < pieces.length; i++) if (pieces[i].tw) stepTween(pieces[i], Infinity);
    }

    function tick() {
      raf = 0;
      if (destroyed) return;
      var t = now();
      var dt = lastTick ? Math.min(64, Math.max(1, t - lastTick)) : 16;
      lastTick = t;
      var again = false;

      if (drag) {
        var p = drag.p;
        var ks = 1 - Math.exp(-dt / 70);
        p.s += (DRAG_SCALE - p.s) * ks;
        if (Math.abs(DRAG_SCALE - p.s) < 0.002) p.s = DRAG_SCALE; else again = true;
        var liftTarget = (drag.touch && drag.moved) ? -TOUCH_LIFT * g.ch * L.bs * DRAG_SCALE : 0;
        drag.lift += (liftTarget - drag.lift) * (1 - Math.exp(-dt / 90));
        if (Math.abs(liftTarget - drag.lift) < 0.3) drag.lift = liftTarget; else again = true;
        var rt = reduce ? 0 : clamp(drag.vx * 6, -6, 6);
        p.rot += (rt - p.rot) * (1 - Math.exp(-dt / 90));
        drag.vx *= Math.exp(-dt / 110);
        if (Math.abs(p.rot) > 0.05 || Math.abs(drag.vx) > 0.005) again = true; else p.rot = 0;
        p.cx = clamp(drag.x - drag.ox * p.s, 0, W);
        p.cy = clamp(drag.y - drag.oy * p.s + drag.lift, 0, H);
        p.dirty = true;
      }

      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].tw && stepTween(pieces[i], t)) again = true;
      }

      if (hintSt) {
        var u = (t - hintSt.t0) / HINT_MS;
        var hp = hintSt.p;
        if (hp) {
          if (u < 1) {
            var amp = reduce ? 3 : 8;
            hp.hintRot = Math.sin(u * Math.PI * 2 * 4) * amp * (1 - u);
            hp.hintS = 1 + 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.15));
            again = true;
          } else { hp.hintRot = 0; hp.hintS = 1; }
          hp.dirty = true;
        }
      }

      if (tut) { updateTutorial(t); again = true; }

      flush();
      if (again) schedule(); else lastTick = 0;
    }

    // ------------------------------------------------------------ yerleşim / relayout
    function describe(p, OL) {
      for (var i = 0; i < OL.trays.length; i++) {
        var tr = OL.trays[i];
        if (p.cx >= tr.x - 2 && p.cx <= tr.x + tr.w + 2 && p.cy >= tr.y - 2 && p.cy <= tr.y + tr.h + 2) {
          return { kind: 'tray', i: i, fx: (p.cx - tr.x) / (tr.w || 1), fy: (p.cy - tr.y) / (tr.h || 1) };
        }
      }
      return { kind: 'board', fx: (p.cx - OL.bx) / OL.bw, fy: (p.cy - OL.by) / OL.bh };
    }

    function relayout(force) {
      if (destroyed) return;
      var nw = root.clientWidth, nh = root.clientHeight;
      if (!nw || !nh) return;
      if (!force && L && nw === W && nh === H) return;
      rootRect = root.getBoundingClientRect();
      finishTweens();
      var OL = L;
      var descs = null;
      if (OL) {
        descs = pieces.map(function (p) { return p.placed ? null : describe(p, OL); });
      }
      W = nw; H = nh;
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      L = computeLayout(W, H, g, N);
      L.m = g.ext + 8 / L.bs; // diş taşması + gölge payı (css 8px)

      renderBoard();
      for (var i = 0; i < pieces.length; i++) renderPiece(pieces[i]);

      var rescatter = [];
      for (i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (p.placed) { var sc = slotCenter(p); p.cx = sc.x; p.cy = sc.y; p.s = 1; p.rot = 0; p.dirty = true; continue; }
        if (!OL) { rescatter.push(p); continue; }
        var d = descs[i];
        if (drag && drag.p === p) {
          p.cx = L.bx + d.fx * L.bw; p.cy = L.by + d.fy * L.bh; p.dirty = true;
          if (d.kind === 'tray') p.restScale = L.trayScale;
          continue;
        }
        if (d.kind === 'tray') {
          if (OL.type === L.type && L.trays[d.i]) {
            var tr = L.trays[d.i];
            p.cx = tr.x + d.fx * tr.w; p.cy = tr.y + d.fy * tr.h;
            p.s = p.restScale = L.trayScale;
          } else { rescatter.push(p); continue; }
        } else {
          p.cx = L.bx + d.fx * L.bw; p.cy = L.by + d.fy * L.bh;
          p.s = p.restScale = overBoard(p.cx, p.cy) ? 1 : L.trayScale;
        }
        var cc = clampCenter(p.cx, p.cy, p.s);
        p.cx = cc.x; p.cy = cc.y; p.dirty = true;
      }
      if (rescatter.length) {
        var s = L.trayScale;
        var pos = packTrays(L.trays, rescatter.length, L.fw * s, L.fh * s, rng);
        if (!OL) shuffle(rescatter, rng);
        for (i = 0; i < rescatter.length; i++) {
          var q = rescatter[i], pp = pos[i];
          var c2 = clampCenter(pp.x, pp.y, s);
          q.cx = c2.x; q.cy = c2.y; q.s = q.restScale = s; q.rot = 0; q.dirty = true;
          if (!OL) { q.z = 10 + i; q.el.style.zIndex = q.z; }
        }
        if (!OL) zTop = 10 + rescatter.length;
      }
      for (i = 0; i < pieces.length; i++) if (pieces[i].placed && !pieces[i].tw) pieces[i].el.style.zIndex = 2;

      if (drag) {
        var rs = L.bs / OL.bs; drag.ox *= rs; drag.oy *= rs; drag.lift *= rs;
        renderHalo(shadowCv, drag.p, 'rgba(0,0,0,0.38)', 10);
      }
      if (hintSt) endHint();
      if (doneEl) renderDone();
      if (tut) refreshTutorialGhost();
      if (tutWanted && !tut && !OL) startTutorial();
      flush();
    }

    // ------------------------------------------------------------ isabet testi
    function hitTest(x, y) {
      var best = null, bestZ = -1, near = null, nearZ = -1;
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (p.placed) continue;
        var k = L.bs * p.s;
        var lx = (x - p.cx) / k + g.cw / 2, ly = (y - p.cy) / k + g.ch / 2;
        if (p.z > bestZ) {
          var inside;
          if (p.path) inside = hitCtx.isPointInPath(p.path, lx, ly);
          else inside = lx >= 0 && lx <= g.cw && ly >= 0 && ly <= g.ch;
          if (inside) { best = p; bestZ = p.z; }
        }
        var inf = 12 / k;
        if (p.z > nearZ && lx > -inf && lx < g.cw + inf && ly > -inf && ly < g.ch + inf) { near = p; nearZ = p.z; }
      }
      return best || near;
    }

    // ------------------------------------------------------------ pointer olayları
    function localPt(e) {
      var rr = rootRect || (rootRect = root.getBoundingClientRect());
      return { x: e.clientX - rr.left, y: e.clientY - rr.top };
    }

    function onDown(e) {
      if (destroyed || completed || drag || !L) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      rootRect = root.getBoundingClientRect();
      var pt = localPt(e);
      var p = hitTest(pt.x, pt.y);
      if (!p) return;
      e.preventDefault();
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
      removeTutorial();
      if (hintSt && hintSt.p === p) endHint();
      if (p.tw) { p.tw = null; } // mevcut değerlerde bırak
      drag = {
        p: p, id: e.pointerId, touch: e.pointerType === 'touch' || e.pointerType === 'pen',
        sx: pt.x, sy: pt.y, x: pt.x, y: pt.y,
        ox: (pt.x - p.cx) / p.s, oy: (pt.y - p.cy) / p.s,
        startCx: p.cx, startCy: p.cy, startS: p.s,
        moved: false, lift: 0, vx: 0, lx: pt.x, lt: e.timeStamp || now()
      };
      zTop += 2;
      shadowCv.style.zIndex = zTop - 1;
      p.z = zTop; p.el.style.zIndex = p.z;
      setLive(p, true);
      renderHalo(shadowCv, p, 'rgba(0,0,0,0.38)', 10);
      shadowCv.classList.add('ybp-on');
      p.dirty = true;
      safeCall(opts.onPickup, { index: p.index });
      schedule();
    }

    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      var pt = localPt(e);
      var ts = e.timeStamp || now();
      var dtm = Math.max(1, ts - drag.lt);
      drag.vx = drag.vx * 0.6 + ((pt.x - drag.lx) / dtm) * 0.4;
      drag.lx = pt.x; drag.lt = ts;
      drag.x = pt.x; drag.y = pt.y;
      if (!drag.moved && Math.abs(pt.x - drag.sx) + Math.abs(pt.y - drag.sy) >= DEAD_ZONE) drag.moved = true;
      schedule();
    }

    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.type !== 'lostpointercapture') {
        var pt = localPt(e);
        if (e.type !== 'pointercancel') { drag.x = pt.x; drag.y = pt.y; }
      }
      release(e.type === 'pointercancel' || e.type === 'lostpointercapture');
    }

    function release(cancelled) {
      var d = drag;
      drag = null;
      try { if (root.hasPointerCapture && root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id); } catch (err) { /* yoksay */ }
      shadowCv.classList.remove('ybp-on');
      var p = d.p;
      // son görünür konum (kaldırma dahil)
      p.cx = clamp(d.x - d.ox * p.s, 0, W);
      p.cy = clamp(d.y - d.oy * p.s + d.lift, 0, H);
      p.dirty = true;

      var moved = d.moved && Math.abs(d.x - d.sx) + Math.abs(d.y - d.sy) >= DEAD_ZONE;
      if (!moved) { // dokunma: yerine geri dön
        tweenTo(p, { cx: d.startCx, cy: d.startCy, s: p.restScale, rot: 0 }, 160, easeOutCubic);
        return;
      }
      var sc = slotCenter(p);
      var dist = Math.sqrt((p.cx - sc.x) * (p.cx - sc.x) + (p.cy - sc.y) * (p.cy - sc.y));
      var thr = snapRatio * Math.min(g.cw, g.ch) * L.bs * (d.touch ? TOUCH_SNAP_BONUS : 1);
      if (!cancelled && dist <= thr) {
        place(p, true);
      } else {
        var rest = overBoard(p.cx, p.cy) ? 1 : L.trayScale;
        p.restScale = rest;
        var cc = clampCenter(p.cx, p.cy, rest);
        tweenTo(p, { cx: cc.x, cy: cc.y, s: rest, rot: 0 }, 200, easeOutCubic);
        if (!cancelled) safeCall(opts.onDrop, { index: p.index, snapped: false });
      }
      schedule();
    }

    function place(p, fromDrag) {
      if (p.placed) return;
      p.placed = true;
      placedCount++;
      if (hintSt && hintSt.p === p) endHint();
      var sc = slotCenter(p);
      if (!fromDrag) { zTop++; p.z = zTop; p.el.style.zIndex = p.z; }
      tweenTo(p, { cx: sc.x, cy: sc.y, s: 1, rot: 0 }, reduce ? 160 : SNAP_MS, reduce ? easeOutCubic : easeOutBack, function () {
        p.z = 2; p.el.style.zIndex = 2;
        if (placedCount === N) scheduleComplete();
      });
      var rr = root.getBoundingClientRect();
      safeCall(opts.onSnap, { index: p.index, placed: placedCount, total: N, x: rr.left + sc.x, y: rr.top + sc.y });
      if (placedCount === N) {
        completed = true;
        // Yedek: rAF durursa (sekme arka planda vb.) bitiş yine de tetiklensin
        later((reduce ? 160 : SNAP_MS) + 250, function () { finishTweens(); scheduleComplete(); });
      }
    }

    function onContext(e) { e.preventDefault(); }

    // ------------------------------------------------------------ bitiş
    function scheduleComplete() {
      if (completeScheduled) return;
      completeScheduled = true;
      completed = true;
      removeTutorial();
      endHint();
      later(COMPLETE_DELAY, function () {
        doneEl = document.createElement('div');
        doneEl.className = 'ybp-done';
        doneEl.appendChild(document.createElement('canvas'));
        var sh = document.createElement('div');
        sh.className = 'ybp-shine';
        doneEl.appendChild(sh);
        renderDone();
        root.appendChild(doneEl);
        later(reduce ? 600 : COMPLETE_ANIM, function () {
          if (completeFired) return;
          completeFired = true;
          safeCall(opts.onComplete);
        });
      });
    }

    // ------------------------------------------------------------ ipucu
    function endHint() {
      if (!hintSt) return;
      var h = hintSt;
      hintSt = null;
      clearLater(h.timer);
      if (h.p) {
        h.p.hintRot = 0; h.p.hintS = 1; h.p.dirty = true;
        if (!h.p.tw && !(drag && drag.p === h.p)) setLive(h.p, false);
      }
      glowCv.classList.remove('ybp-on');
      if (h.slotEl && h.slotEl.parentNode) h.slotEl.parentNode.removeChild(h.slotEl);
      schedule();
    }

    function hint() {
      if (destroyed || completed || !L) return false;
      var cands = pieces.filter(function (p) { return !p.placed && !(drag && drag.p === p); });
      var target = null;
      if (cands.length) {
        var inView = cands.filter(function (p) { return p.cx >= 0 && p.cx <= W && p.cy >= 0 && p.cy <= H; });
        var pool = inView.length ? inView : cands;
        target = pool[Math.floor(Math.random() * pool.length)];
      } else if (drag && !drag.p.placed) {
        target = null; // yalnızca sürüklenen parça kaldı: sadece yuvayı göster
      } else return false;
      endHint();
      var slotPiece = target || drag.p;
      var st = { p: target, t0: now(), slotEl: null, timer: null };
      // yuva vurgusu
      var sEl = document.createElement('canvas');
      sEl.className = 'ybp-slot';
      var bs = L.bs, m = L.m, wI = g.cw + 2 * m, hI = g.ch + 2 * m;
      var ctx = sizeCanvas(sEl, wI * bs, hI * bs);
      var kx = sEl.width / wI, ky = sEl.height / hI;
      ctx.setTransform(kx, 0, 0, ky, m * kx, m * ky);
      ctx.fillStyle = 'rgba(255,214,0,0.5)';
      fillPath(ctx, slotPiece);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5 / bs; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; strokePath(ctx, slotPiece);
      ctx.lineWidth = 2.5 / bs; ctx.strokeStyle = 'rgba(255,160,0,1)'; strokePath(ctx, slotPiece);
      var sc = slotCenter(slotPiece);
      sEl.style.left = (sc.x - wI * bs / 2) + 'px';
      sEl.style.top = (sc.y - hI * bs / 2) + 'px';
      root.appendChild(sEl);
      st.slotEl = sEl;
      if (target) {
        zTop += 2;
        glowCv.style.zIndex = zTop - 1;
        target.z = zTop; target.el.style.zIndex = target.z;
        setLive(target, true);
        renderHalo(glowCv, target, 'rgba(255,215,0,1)', 14, 2);
        glowCv.classList.add('ybp-on');
      }
      st.timer = later(HINT_MS, endHint);
      hintSt = st;
      schedule();
      return true;
    }

    // ------------------------------------------------------------ öğretici el
    function startTutorial() {
      if (tut || completed || !L) return;
      var best = null, bd = Infinity;
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (p.placed) continue;
        var sc = slotCenter(p), dd = (sc.x - p.cx) * (sc.x - p.cx) + (sc.y - p.cy) * (sc.y - p.cy);
        if (dd < bd) { bd = dd; best = p; }
      }
      if (!best) return;
      var el = document.createElement('div');
      el.className = 'ybp-tut';
      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      var p2 = document.createElementNS(svgNS, 'path'); p2.setAttribute('class', 'ybp-trail2');
      var p1 = document.createElementNS(svgNS, 'path'); p1.setAttribute('class', 'ybp-trail');
      svg.appendChild(p2); svg.appendChild(p1);
      var gh = document.createElement('canvas'); gh.className = 'ybp-tghost';
      var hand = document.createElement('div'); hand.className = 'ybp-hand'; hand.textContent = '👆';
      el.appendChild(svg); el.appendChild(gh); el.appendChild(hand);
      root.appendChild(el);
      tut = { p: best, el: el, path1: p1, path2: p2, ghost: gh, hand: hand, t0: now(), lastD: '', fs: 48 };
      refreshTutorialGhost();
      schedule();
    }
    function refreshTutorialGhost() {
      if (!tut) return;
      var p = tut.p;
      var ctx = sizeCanvas(tut.ghost, p.cssW, p.cssH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, tut.ghost.width, tut.ghost.height);
      ctx.drawImage(p.el, 0, 0);
      var fs = clamp(Math.min(g.cw, g.ch) * L.bs * 0.55, 40, 88);
      tut.fs = fs;
      tut.hand.style.fontSize = fs + 'px';
      var sw = Math.max(5, fs * 0.13);
      tut.path1.setAttribute('stroke-width', sw.toFixed(1));
      tut.path2.setAttribute('stroke-width', (sw + 3).toFixed(1));
      tut.lastD = '';
    }
    function updateTutorial(t) {
      var p = tut.p;
      if (p.placed) { removeTutorial(); return; }
      var fx = p.cx, fy = p.cy, sc = slotCenter(p), tx = sc.x, ty = sc.y;
      var dx = tx - fx, dy = ty - fy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      var bend = len * 0.18;
      var qx = (fx + tx) / 2 + nx * bend, qy = (fy + ty) / 2 + ny * bend;
      var dstr = 'M' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1);
      if (dstr !== tut.lastD) { tut.path1.setAttribute('d', dstr); tut.path2.setAttribute('d', dstr); tut.lastD = dstr; }

      var T = (t - tut.t0) % 2900;
      var u = 0, hx, hy, hs = 1, ho = 1, go = 0, gs = p.s;
      if (T < 400) {
        var a = T / 400; ho = a; hs = 1.3 - 0.3 * a; go = 0.65 * a; u = 0;
      } else if (T < 1700) {
        u = easeInOut((T - 400) / 1300); go = 0.65; gs = lerp(p.s, 1, u);
      } else if (T < 2100) {
        var b = (T - 1700) / 400; u = 1; ho = 1 - b; hs = 1 + 0.2 * b; go = 0.65 * (1 - b); gs = 1;
      } else { u = 1; ho = 0; go = 0; gs = 1; }
      var iu = 1 - u;
      hx = iu * iu * fx + 2 * iu * u * qx + u * u * tx;
      hy = iu * iu * fy + 2 * iu * u * qy + u * u * ty;
      var fs = tut.fs;
      // parmak ucu ≈ emoji kutusunun üst-ortası
      tut.hand.style.transform = 'translate(' + (hx - fs * 0.42).toFixed(1) + 'px,' + (hy - fs * 0.06).toFixed(1) + 'px) scale(' + hs.toFixed(3) + ')';
      tut.hand.style.opacity = ho.toFixed(3);
      tut.ghost.style.transform = xf(hx, hy, p.cssW, p.cssH, 0, gs);
      tut.ghost.style.opacity = go.toFixed(3);
    }
    function removeTutorial() {
      tutWanted = false;
      if (!tut) return;
      if (tut.el.parentNode) tut.el.parentNode.removeChild(tut.el);
      tut = null;
    }

    // ------------------------------------------------------------ çöz (test/yardım)
    function solve() {
      if (destroyed || completed) return;
      removeTutorial();
      endHint();
      var k = 0;
      pieces.forEach(function (p) {
        if (p.placed || (drag && drag.p === p)) return;
        later(k++ * 90, function () { if (!p.placed && !(drag && drag.p === p)) place(p, false); });
      });
    }

    // ------------------------------------------------------------ dinleyiciler
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('lostpointercapture', onUp);
    root.addEventListener('contextmenu', onContext);
    root.addEventListener('dragstart', onContext);

    var ro = null, roRaf = 0;
    function onResize() {
      if (roRaf || destroyed) return;
      roRaf = requestAnimationFrame(function () { roRaf = 0; relayout(false); });
    }
    if (typeof window.ResizeObserver === 'function') {
      ro = new ResizeObserver(onResize);
      ro.observe(root);
    } else {
      window.addEventListener('resize', onResize);
    }
    relayout(true);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      if (roRaf) cancelAnimationFrame(roRaf);
      raf = roRaf = 0;
      timers.slice().forEach(clearTimeout);
      timers.length = 0;
      if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
      if (drag) { try { root.releasePointerCapture(drag.id); } catch (e) { /* yoksay */ } drag = null; }
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('lostpointercapture', onUp);
      root.removeEventListener('contextmenu', onContext);
      root.removeEventListener('dragstart', onContext);
      tut = null; hintSt = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (prevPos !== null) container.style.position = prevPos;
      pieces.forEach(function (p) { p.el.width = p.el.height = 0; });
      pieces.length = 0;
    }

    return {
      hint: hint,
      destroy: destroy,
      solve: solve,
      relayout: function () { relayout(true); },
      get placed() { return placedCount; },
      total: N
    };
  }

  return {
    create: create,
    // saf fonksiyonlar (test için)
    _internal: {
      mulberry32: mulberry32, hashSeed: hashSeed, makeGeometry: makeGeometry, edgeLocal: edgeLocal,
      pieceOps: pieceOps, computeLayout: computeLayout, packTrays: packTrays, fitScale: fitScale
    }
  };
})();
