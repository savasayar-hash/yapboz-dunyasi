/* Yapboz Dünyası — YB.FX
 * Tam ekran, tıklamayı engellemeyen tek canvas üzerinde parçacık efektleri:
 * burst, confetti, fireworks, floatText. İş yokken rAF döngüsü durur.
 */
window.YB = window.YB || {};
YB.FX = (function () {
  'use strict';

  var canvas = null, ctx = null, W = 0, H = 0, DPR = 1;
  var parts = [], emitters = [];
  var running = false, lastT = 0, simTime = 0;

  var PALETTE = ['#FF4D6D', '#FF9F1C', '#FFD60A', '#4CD964', '#2EC4FF', '#5E60CE', '#FF6FD8', '#00D1B2'];
  var FONT = '"Baloo 2", "Segoe UI", system-ui, sans-serif';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function safe(fn) { return function () { try { return fn.apply(null, arguments); } catch (e) { /* sessiz */ } }; }

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  // Ekran alanına göre ölçek: 360×740 telefon ≈ 0.45, 1280×800 ≈ 1
  function areaScale() {
    var a = (window.innerWidth || 800) * (window.innerHeight || 600);
    return Math.max(0.4, Math.min(1, a / (1280 * 800)));
  }
  function maxParts() { return Math.round(350 + 450 * Math.max(0, (areaScale() - 0.45) / 0.55)); } // 350..800
  function countScale() { return (reduced() ? 0.3 : 1) * (0.6 + 0.4 * areaScale()); }
  function sizeScale() { return Math.max(0.65, Math.min(1.4, Math.min(W || 800, H || 600) / 700)); }

  // ---------------------------------------------------------------- canvas
  function resize() {
    if (!canvas) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth || document.documentElement.clientWidth || 800;
    H = window.innerHeight || document.documentElement.clientHeight || 600;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function ensure() {
    if (canvas) {
      if (!canvas.parentNode && document.body) document.body.appendChild(canvas);
      return !!ctx;
    }
    if (!document.body) return false;
    try {
      canvas = document.createElement('canvas');
      canvas.className = 'yb-fx-layer';
      canvas.setAttribute('aria-hidden', 'true');
      var s = canvas.style;
      s.position = 'fixed'; s.left = '0'; s.top = '0'; s.right = '0'; s.bottom = '0';
      s.inset = '0'; s.pointerEvents = 'none'; s.zIndex = '9999';
      s.width = '100%'; s.height = '100%'; s.display = 'block';
      ctx = canvas.getContext('2d');
      document.body.appendChild(canvas);
      resize();
      window.addEventListener('resize', safe(resize));
      window.addEventListener('orientationchange', safe(function () { setTimeout(resize, 150); }));
    } catch (e) { canvas = null; ctx = null; }
    return !!ctx;
  }

  // Kare sırasında eklenenler ayrı listeye gider (döngü dizisini bozmadan)
  var inFrame = false, adds = [];
  function add(p, force) {
    if (!force && parts.length + adds.length >= maxParts()) return false;
    if (inFrame) adds.push(p); else parts.push(p);
    return true;
  }

  function start() {
    if (running) return;
    running = true;
    lastT = 0;
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- colors
  function hexToRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, f) {
    var c = hexToRgb(hex); if (!c) return hex;
    return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')';
  }
  function lighten(hex, f) {
    var c = hexToRgb(hex); if (!c) return hex;
    return 'rgb(' + Math.round(c[0] + (255 - c[0]) * f) + ',' + Math.round(c[1] + (255 - c[1]) * f) + ',' + Math.round(c[2] + (255 - c[2]) * f) + ')';
  }

  // ---------------------------------------------------------------- shapes
  function starPath(r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.45 : r;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  // ---------------------------------------------------------------- effects
  function burst(x, y, opts) {
    if (!ensure()) return;
    opts = opts || {};
    var cs = countScale(), ss = sizeScale(), red = reduced();
    var n = Math.max(4, Math.round((opts.count || 18) * cs));
    var base = opts.color;
    var cols = base ? [base, base, lighten(base, 0.5), '#FFD60A', '#FFFFFF'] : PALETTE.concat(['#FFFFFF']);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
      var sp = rnd(160, 380) * ss * (red ? 0.7 : 1);
      add({
        k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60 * ss,
        g: 520 * ss, drag: 2.2, life: 0, max: rnd(0.55, 0.95) * (red ? 0.7 : 1),
        size: rnd(6, 12) * ss, color: pick(cols), star: Math.random() < 0.6,
        rot: rnd(0, 6.28), vr: rnd(-8, 8)
      });
    }
    // küçük beyaz parıltılar
    var gl = Math.round(n * 0.35);
    for (var j = 0; j < gl; j++) {
      var a2 = rnd(0, Math.PI * 2), sp2 = rnd(60, 200) * ss;
      add({ k: 'spark', x: x, y: y, vx: Math.cos(a2) * sp2, vy: Math.sin(a2) * sp2, g: 120, drag: 3,
        life: 0, max: rnd(0.3, 0.55), size: rnd(2.5, 4.5) * ss, color: '#FFFFFF', star: false, rot: 0, vr: 0 });
    }
    add({ k: 'ring', x: x, y: y, life: 0, max: red ? 0.3 : 0.45, r0: 8 * ss, r1: 85 * ss, w: 7 * ss, color: base || '#FFD60A' }, true);
    start();
  }

  function spawnConfetti() {
    var ss = sizeScale();
    var r = Math.random(), color = pick(PALETTE);
    var p = {
      k: 'conf', x: rnd(-20, W + 20), y: rnd(-60, -15), vx: rnd(-35, 35) * ss, vy: rnd(110, 230) * ss,
      g: 30 * ss, life: 0, max: 7, color: color, back: shade(color, 0.62),
      rot: rnd(0, 6.28), vr: rnd(-3, 3), flip: rnd(0, 6.28), vf: rnd(5, 11),
      sway: rnd(0.8, 2.2), swayA: rnd(20, 55) * ss, phase: rnd(0, 6.28),
      shape: r < 0.6 ? 'rect' : (r < 0.8 ? 'circle' : 'ribbon'),
      w: rnd(8, 13) * ss, h: rnd(12, 20) * ss
    };
    if (p.shape === 'ribbon') { p.w = rnd(26, 42) * ss; p.h = rnd(3.5, 5) * ss; p.vr = rnd(-1.5, 1.5); }
    add(p);
  }

  function confetti(opts) {
    if (!ensure()) return;
    opts = opts || {};
    var red = reduced();
    var dur = (opts.duration || 3000) / 1000 * (red ? 0.6 : 1);
    var rate = 110 * countScale() * Math.max(0.6, Math.min(1.6, W / 900)); // parça/sn
    // ilk anda bir patlama
    var first = Math.round(rate * 0.35);
    for (var i = 0; i < first; i++) spawnConfetti();
    emitters.push({ k: 'conf', t: 0, dur: dur, rate: rate, acc: 0 });
    start();
  }

  function launchRocket() {
    var ss = sizeScale();
    var x = rnd(W * 0.15, W * 0.85);
    var targetY = rnd(H * 0.14, H * 0.42);
    var g = 320 * ss;
    var dist = Math.max(80, H - targetY);
    add({ k: 'rocket', x: x, y: H + 10, vx: rnd(-25, 25) * ss, vy: -Math.sqrt(2 * g * dist), g: g,
      life: 0, max: 4, color: pick(PALETTE), size: 3.5 * ss, ty: targetY, trailAcc: 0 }, true);
  }

  function explode(x, y, color) {
    var ss = sizeScale(), red = reduced();
    var n = Math.max(14, Math.round(64 * countScale()));
    var c2 = Math.random() < 0.5 ? pick(PALETTE) : color;
    var speed = rnd(170, 250) * ss;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rnd(-0.08, 0.08);
      var s = speed * rnd(0.75, 1.05);
      add({ k: 'fw', x: x, y: y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 110 * ss, drag: 1.6,
        life: 0, max: rnd(1.0, 1.5) * (red ? 0.7 : 1), size: rnd(2.2, 3.4) * ss, color: i % 3 ? color : c2 });
    }
    // iç küre
    var inner = Math.round(n * 0.35);
    for (var j = 0; j < inner; j++) {
      var a2 = rnd(0, Math.PI * 2), s2 = speed * rnd(0.15, 0.5);
      add({ k: 'fw', x: x, y: y, px: x, py: y, vx: Math.cos(a2) * s2, vy: Math.sin(a2) * s2, g: 90 * ss, drag: 1.8,
        life: 0, max: rnd(0.6, 1.0), size: rnd(1.8, 2.6) * ss, color: '#FFFFFF' });
    }
    add({ k: 'flash', x: x, y: y, life: 0, max: 0.25, r: 60 * ss, color: color }, true);
  }

  function fireworks(opts) {
    if (!ensure()) return;
    opts = opts || {};
    var red = reduced();
    var dur = (opts.duration || 4000) / 1000 * (red ? 0.6 : 1);
    launchRocket();
    emitters.push({ k: 'fw', t: 0, dur: dur, next: red ? 1.0 : rnd(0.3, 0.5), red: red });
    start();
  }

  function floatText(x, y, text, opts) {
    if (!ensure() || text == null) return;
    opts = opts || {};
    var vmin = Math.min(W, H);
    var size = Math.max(26, Math.min(48 * sizeScale(), W * 0.09, vmin * 0.11));
    add({ k: 'text', x: x, y: y, life: 0, max: reduced() ? 0.9 : 1.2, text: String(text), size: size,
      color: opts.color || '#FF4D6D', rise: Math.min(90, H * 0.12) }, true);
    start();
  }

  function clear() {
    parts = []; emitters = []; adds = [];
    if (ctx) { try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {} }
  }

  // ---------------------------------------------------------------- loop
  function updateEmitters(dt) {
    for (var i = emitters.length - 1; i >= 0; i--) {
      var e = emitters[i];
      e.t += dt;
      if (e.k === 'conf') {
        e.acc += e.rate * dt;
        while (e.acc >= 1) { e.acc -= 1; spawnConfetti(); }
      } else if (e.k === 'fw') {
        e.next -= dt;
        if (e.next <= 0 && e.t < e.dur) {
          launchRocket();
          if (!e.red && Math.random() < 0.25) launchRocket();
          e.next = e.red ? 1.0 : rnd(0.35, 0.65);
        }
      }
      if (e.t >= e.dur) emitters.splice(i, 1);
    }
  }

  function easeOutBack(t) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function frame(ts) {
    inFrame = true;
    try {
      if (!lastT) lastT = ts;
      var dt = Math.min(0.05, Math.max(0, (ts - lastT) / 1000));
      lastT = ts; simTime += dt;
      updateEmitters(dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var keep = [];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          if (p.k === 'rocket') explode(p.x, p.y, p.color);
          continue;
        }
        if (step(p, dt) === false) continue;
        draw(p);
        keep.push(p);
      }
      parts = adds.length ? keep.concat(adds) : keep;
      adds = [];
      ctx.globalAlpha = 1;
    } catch (e) { parts = []; emitters = []; adds = []; }
    inFrame = false;

    if (parts.length || emitters.length) requestAnimationFrame(frame);
    else {
      running = false;
      try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
    }
  }

  // Fizik. false → parçacığı sil
  function step(p, dt) {
    switch (p.k) {
      case 'spark':
      case 'fw':
        p.px = p.x; p.py = p.y;
        var d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += (p.vr || 0) * dt;
        return true;
      case 'conf':
        p.vy += p.g * dt; if (p.vy > 260 * sizeScale()) p.vy = 260 * sizeScale();
        p.x += (p.vx + Math.cos(simTime * p.sway + p.phase) * p.swayA) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt; p.flip += p.vf * dt;
        return p.y < H + 50;
      case 'rocket':
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.trailAcc += dt;
        if (p.trailAcc > 0.016) {
          p.trailAcc = 0;
          add({ k: 'spark', x: p.x + rnd(-1.5, 1.5), y: p.y + 4, vx: rnd(-15, 15), vy: rnd(20, 60), g: 40, drag: 2,
            life: 0, max: rnd(0.25, 0.45), size: rnd(1.6, 2.6) * sizeScale(), color: '#FFE8A3', star: false, rot: 0, vr: 0 });
        }
        if (p.vy >= -40 || p.y <= p.ty) { explode(p.x, p.y, p.color); return false; }
        return true;
      default:
        return true;
    }
  }

  function setT(x, y, rot, sx, sy) {
    var c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    sx = sx == null ? 1 : sx; sy = sy == null ? 1 : sy;
    ctx.setTransform(DPR * c * sx, DPR * s * sx, -DPR * s * sy, DPR * c * sy, DPR * x, DPR * y);
  }

  function draw(p) {
    var t = p.life / p.max;
    switch (p.k) {
      case 'spark': {
        ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        var sz = p.size * (1 - t * 0.35);
        setT(p.x, p.y, p.rot);
        ctx.fillStyle = p.color;
        if (p.star) { starPath(sz); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, 0, sz * 0.55, 0, 6.2832); ctx.fill(); }
        break;
      }
      case 'ring': {
        var e = 1 - Math.pow(1 - t, 3);
        ctx.globalAlpha = 1 - t;
        setT(p.x, p.y, 0);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, p.w * (1 - t));
        ctx.beginPath(); ctx.arc(0, 0, p.r0 + (p.r1 - p.r0) * e, 0, 6.2832); ctx.stroke();
        break;
      }
      case 'conf': {
        var fade = p.max - p.life < 0.5 ? (p.max - p.life) / 0.5 : 1;
        ctx.globalAlpha = fade;
        var fy = Math.cos(p.flip);
        setT(p.x, p.y, p.rot, 1, Math.abs(fy) < 0.08 ? 0.08 : fy);
        ctx.fillStyle = fy >= 0 ? p.color : p.back;
        if (p.shape === 'rect') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.w * 0.5, 0, 6.2832); ctx.fill(); }
        else {
          // dalgalı şerit
          setT(p.x, p.y, p.rot, 1, 1);
          ctx.strokeStyle = fy >= 0 ? p.color : p.back;
          ctx.lineWidth = p.h; ctx.lineCap = 'round';
          ctx.beginPath();
          var L = p.w, ph = simTime * 8 + p.phase;
          for (var k = 0; k <= 6; k++) {
            var xx = -L / 2 + (L * k) / 6, yy = Math.sin(ph + k * 1.1) * p.h * 1.3;
            if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
        break;
      }
      case 'rocket': {
        ctx.globalAlpha = 1;
        setT(p.x, p.y, 0);
        ctx.fillStyle = '#FFF6D5';
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.2832); ctx.fill();
        break;
      }
      case 'fw': {
        var a = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        ctx.globalAlpha = a;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // iz: önceki konumdan hız yönünde uzayan çizgi
        ctx.strokeStyle = p.color; ctx.lineCap = 'round';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (t < 0.7 && Math.random() < 0.85) { // pırıltı
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.45, 0, 6.2832); ctx.fill();
        }
        break;
      }
      case 'flash': {
        ctx.globalAlpha = 0.45 * (1 - t);
        setT(p.x, p.y, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.r * (0.6 + t * 0.6), 0, 6.2832); ctx.fill();
        break;
      }
      case 'text': {
        var sc;
        if (t < 0.2) sc = 0.3 + 0.7 * easeOutBack(t / 0.2); else sc = 1;
        var alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        var yy2 = p.y - p.rise * (1 - Math.pow(1 - t, 2));
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = '800 ' + Math.round(p.size) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (!p.tw) { try { p.tw = ctx.measureText(p.text).width; } catch (e) { p.tw = p.size * p.text.length * 0.5; } }
        var half = p.tw / 2 + p.size * 0.25;
        var xx2 = Math.max(half, Math.min(W - half, p.x));
        if (half * 2 > W) xx2 = W / 2;
        setT(xx2, yy2, 0, sc, sc);
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, p.size * 0.2);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeText(p.text, 0, p.size * 0.06);
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
        break;
      }
    }
  }

  return {
    burst: safe(burst),
    confetti: safe(confetti),
    fireworks: safe(fireworks),
    floatText: safe(floatText),
    clear: safe(clear),
    isActive: function () { return parts.length > 0 || emitters.length > 0; }
  };
})();
