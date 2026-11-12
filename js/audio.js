/* Yapboz Dünyası — YB.Audio
 * WebAudio ile sentezlenmiş sesler, üretken arka plan müziği ve tr-TR konuşma.
 * Ses dosyası yok, bağımlılık yok. Hiçbir fonksiyon hata fırlatmaz.
 */
window.YB = window.YB || {};
YB.Audio = (function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext || null;
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var Utter = window.SpeechSynthesisUtterance || null;

  var enabled = { sound: true, music: true, voice: true };

  var ctx = null, master = null, comp = null, sfxBus = null, musicBus = null, duckGain = null;
  var noiseBuf = null;
  var MUSIC_VOL = 0.12, SFX_VOL = 0.6, MASTER_VOL = 0.85;

  function now() { return ctx ? ctx.currentTime : 0; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function vary(amt) { return 1 + (Math.random() - 0.5) * 2 * (amt || 0.03); }
  function safe(fn) { return function () { try { return fn.apply(null, arguments); } catch (e) { /* sessiz */ } }; }

  // ---------------------------------------------------------------- context
  function ensureCtx() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      try { ctx = new AC(); } catch (e2) { ctx = null; return null; }
    }
    try {
      master = ctx.createGain();
      master.gain.value = MASTER_VOL;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = enabled.sound ? SFX_VOL : 0;
      sfxBus.connect(master);

      duckGain = ctx.createGain();
      duckGain.gain.value = 1;
      duckGain.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(duckGain);

      // 1 sn beyaz gürültü (whoosh/pop/drop için)
      var len = Math.floor(ctx.sampleRate);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function resumeCtx() {
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') {
        var p = ctx.resume();
        if (p && p.then) p.then(function () { if (wantMusic) startMusic(); }, function () {});
      }
    } catch (e) {}
  }

  var unlocked = false;
  function unlock() {
    if (!ensureCtx()) return;
    resumeCtx();
    if (!unlocked) {
      unlocked = true;
      try { // iOS/eski Android için sessiz buffer
        var b = ctx.createBuffer(1, 1, 22050);
        var s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (e) {}
      loadVoices();
    }
    if (wantMusic && enabled.music) startMusic();
  }

  // ---------------------------------------------------------------- synth helpers
  var activeVoices = 0, MAX_VOICES = 40;

  // Tek nota: osilatör(ler) + zarf. opts: type, vol, attack, dur, end(freq), bus, harm:[[mult,amp],...], vib
  function note(freq, t, opts) {
    if (!ctx || activeVoices >= MAX_VOICES) return;
    opts = opts || {};
    var dur = opts.dur || 0.3, vol = opts.vol == null ? 0.2 : opts.vol;
    var attack = opts.attack || 0.006;
    var bus = opts.bus || sfxBus;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    g.connect(bus);
    var partials = [[1, 1]].concat(opts.harm || []);
    var stopAt = t + attack + dur + 0.05;
    activeVoices++;
    var done = false;
    partials.forEach(function (p, idx) {
      var o = ctx.createOscillator();
      o.type = idx === 0 ? (opts.type || 'sine') : 'sine';
      o.frequency.setValueAtTime(freq * p[0], t);
      if (opts.end) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.end * p[0]), t + (opts.slide || dur));
      var out = o;
      if (p[1] !== 1) { var pg = ctx.createGain(); pg.gain.value = p[1]; o.connect(pg); out = pg; }
      out.connect(g);
      o.start(t); o.stop(stopAt);
      if (idx === 0) {
        o.onended = function () {
          if (done) return; done = true; activeVoices--;
          try { g.disconnect(); } catch (e) {}
        };
      }
    });
  }

  // Filtrelenmiş gürültü. opts: type, f0, f1, q, vol, dur, attack
  function noise(t, opts) {
    if (!ctx || !noiseBuf || activeVoices >= MAX_VOICES) return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.Q.value = opts.q || 1;
    f.frequency.setValueAtTime(opts.f0 || 1000, t);
    if (opts.f1) f.frequency.exponentialRampToValueAtTime(opts.f1, t + (opts.sweep || opts.dur));
    if (opts.f2) f.frequency.exponentialRampToValueAtTime(opts.f2, t + opts.dur);
    var g = ctx.createGain();
    var a = opts.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(opts.vol || 0.1, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(f); f.connect(g); g.connect(opts.bus || sfxBus);
    activeVoices++;
    src.onended = function () { activeVoices--; try { g.disconnect(); } catch (e) {} };
    src.start(t, Math.random() * 0.5); src.stop(t + opts.dur + 0.05);
  }

  // MIDI → Hz
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var BELL = [[2, 0.25], [3, 0.06]];
  var CHIME = [[2, 0.3], [4.01, 0.08]];

  // ---------------------------------------------------------------- sounds
  var lastStar = 0, starStep = 0, lastPlay = {};
  var STAR_STEPS = [0, 2, 4, 7, 9, 12, 14, 16]; // pentatonik yükseliş

  var sounds = {
    click: function (t) {
      var v = vary(0.05);
      note(1400 * v, t, { type: 'sine', vol: 0.12, dur: 0.045, end: 1000 * v });
      note(2800 * v, t, { type: 'sine', vol: 0.03, dur: 0.03 });
    },
    pickup: function (t) {
      var v = vary(0.04);
      note(520 * v, t, { type: 'triangle', vol: 0.16, dur: 0.12, end: 1040 * v, slide: 0.09 });
      note(1040 * v, t + 0.01, { type: 'sine', vol: 0.04, dur: 0.1 });
    },
    drop: function (t) {
      var v = vary(0.05);
      note(190 * v, t, { type: 'sine', vol: 0.32, dur: 0.16, end: 85 * v, slide: 0.12 });
      noise(t, { type: 'lowpass', f0: 600, q: 0.7, vol: 0.06, dur: 0.08, attack: 0.003 });
    },
    snap: function (t) {
      var v = vary(0.02);
      note(mtof(84) * v, t, { type: 'triangle', vol: 0.2, dur: 0.3, harm: BELL });        // C6
      note(mtof(91) * v, t + 0.075, { type: 'triangle', vol: 0.22, dur: 0.45, harm: BELL }); // G6
      var sp = [96, 100, 103];
      for (var i = 0; i < sp.length; i++) {
        note(mtof(sp[i]) * vary(0.01), t + 0.13 + i * 0.035, { type: 'sine', vol: 0.045, dur: 0.2 });
      }
    },
    wrong: function (t) {
      // Dostça, korkutmayan "boop-boop" (alçalan)
      note(392, t, { type: 'sine', vol: 0.2, dur: 0.16, end: 349, harm: [[2, 0.12]] });
      note(330, t + 0.2, { type: 'sine', vol: 0.2, dur: 0.22, end: 294, harm: [[2, 0.12]] });
    },
    hint: function (t) {
      var seq = [84, 88, 91, 96, 100];
      for (var i = 0; i < seq.length; i++) {
        note(mtof(seq[i]), t + i * 0.075, { type: 'sine', vol: 0.12, dur: 0.6, harm: CHIME });
      }
      for (var j = 0; j < 4; j++) {
        note(mtof(103 + (j % 2) * 5), t + 0.38 + j * 0.06, { type: 'sine', vol: 0.03, dur: 0.25 });
      }
    },
    star: function (t) {
      var nowMs = Date.now();
      starStep = (nowMs - lastStar < 1000) ? Math.min(starStep + 1, STAR_STEPS.length - 1) : 0;
      lastStar = nowMs;
      var m = 81 + STAR_STEPS[starStep]; // A5'ten yukarı
      note(mtof(m), t, { type: 'triangle', vol: 0.18, dur: 0.55, harm: BELL });
      note(mtof(m + 12), t + 0.02, { type: 'sine', vol: 0.05, dur: 0.35 });
      note(mtof(m + 19), t + 0.06, { type: 'sine', vol: 0.025, dur: 0.25 });
    },
    win: function (t) {
      // C E G C' (sekizlikler) — G E' — C'' uzun
      var mel = [[72, 0, 0.18], [76, 0.14, 0.18], [79, 0.28, 0.18], [84, 0.42, 0.3],
                 [79, 0.66, 0.15], [84, 0.8, 0.18], [88, 0.94, 0.6]];
      mel.forEach(function (n) {
        note(mtof(n[0]), t + n[1], { type: 'triangle', vol: 0.17, dur: n[2] + 0.15, harm: BELL });
      });
      note(mtof(48), t, { type: 'sine', vol: 0.18, dur: 0.5 });
      note(mtof(55), t + 0.42, { type: 'sine', vol: 0.15, dur: 0.4 });
      [60, 64, 67].forEach(function (m) { note(mtof(m), t + 0.94, { type: 'sine', vol: 0.07, dur: 0.7, attack: 0.03 }); });
      for (var i = 0; i < 5; i++) note(mtof(96 + [0, 4, 7, 12, 16][i]), t + 1.0 + i * 0.05, { type: 'sine', vol: 0.03, dur: 0.3 });
    },
    unlock: function (t) {
      var seq = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
      for (var i = 0; i < seq.length; i++) {
        note(mtof(seq[i]), t + i * 0.04, { type: 'sine', vol: 0.09 + i * 0.004, dur: 0.28, harm: [[2, 0.2]] });
      }
      note(mtof(96), t + seq.length * 0.04, { type: 'triangle', vol: 0.12, dur: 0.6, harm: CHIME });
    },
    pop: function (t) {
      var v = vary(0.08);
      note(380 * v, t, { type: 'sine', vol: 0.25, dur: 0.07, end: 1300 * v, slide: 0.05 });
      noise(t, { type: 'highpass', f0: 2500, q: 0.7, vol: 0.03, dur: 0.03, attack: 0.002 });
    },
    whoosh: function (t) {
      noise(t, { type: 'bandpass', f0: 300, f1: 2600, f2: 700, sweep: 0.2, q: 1.4, vol: 0.18, dur: 0.42, attack: 0.12 });
    },
    fanfare: function (t) {
      var mel = [[67, 0, 0.14], [67, 0.16, 0.14], [67, 0.32, 0.14], [72, 0.48, 0.45],
                 [76, 0.96, 0.2], [74, 1.18, 0.14], [76, 1.34, 0.14], [79, 1.5, 0.9]];
      mel.forEach(function (n) {
        note(mtof(n[0]), t + n[1], { type: 'triangle', vol: 0.17, dur: n[2] + 0.12, harm: [[2, 0.35], [3, 0.12]] });
        note(mtof(n[0] - 12), t + n[1], { type: 'sine', vol: 0.06, dur: n[2] + 0.1 });
      });
      [[48, 0], [43, 0.48], [48, 0.96], [55, 1.5]].forEach(function (b) {
        note(mtof(b[0]), t + b[1], { type: 'sine', vol: 0.2, dur: 0.45 });
      });
      [72, 76, 79, 84].forEach(function (m) { note(mtof(m), t + 1.5, { type: 'sine', vol: 0.06, dur: 0.95, attack: 0.04 }); });
      for (var i = 0; i < 7; i++) note(mtof(96 + [0, 4, 7, 12, 16, 19, 24][i]), t + 1.6 + i * 0.06, { type: 'sine', vol: 0.03, dur: 0.3 });
    }
  };

  function play(name) {
    if (!enabled.sound) return;
    if (!ensureCtx() || !sounds[name]) return;
    resumeCtx();
    var ms = Date.now();
    if (lastPlay[name] && ms - lastPlay[name] < 35) return; // üst üste yığılmayı önle
    lastPlay[name] = ms;
    sounds[name](now() + 0.01);
  }

  // ---------------------------------------------------------------- music
  var wantMusic = false, musicTimer = null, nextTime = 0, step = 0;
  var STEP_DUR = 60 / 90 / 2; // 90 BPM sekizlik
  var SCALE = [67, 69, 72, 74, 76, 79, 81, 84, 86, 88]; // C majör pentatonik (G4..E6)
  var PROG = [48, 45, 41, 43];                           // C, Am, F, G kökleri
  var motif = null, motifPlays = 0, melIdx = 4, bar = 0;

  function makeMotif() {
    var m = [];
    for (var i = 0; i < 16; i++) {
      var strong = i % 2 === 0;
      if (Math.random() < (strong ? 0.62 : 0.22)) {
        melIdx += Math.round(rnd(-2.4, 2.4));
        if (melIdx < 1) melIdx = 2; if (melIdx > SCALE.length - 2) melIdx = SCALE.length - 3;
        m.push(SCALE[melIdx]);
      } else m.push(null);
    }
    if (m[0] == null) m[0] = SCALE[2 + Math.floor(Math.random() * 3)];
    m[15] = null;
    return m;
  }

  function musicNote(m, t, vol, dur) {
    note(mtof(m), t, { type: 'sine', vol: vol, dur: dur, harm: [[2, 0.22], [3.98, 0.05]], bus: musicBus });
  }

  function scheduleStep(t) {
    var inBar = step % 8;
    if (inBar === 0) {
      if (step % 16 === 0) {
        if (!motif || motifPlays >= 2) { motif = makeMotif(); motifPlays = 0; }
        motifPlays++;
      }
      bar = Math.floor(step / 8) % PROG.length;
      musicNote(PROG[bar], t, 0.55, 1.4);
      musicNote(PROG[bar] + 12, t, 0.12, 0.8);
    } else if (inBar === 4) {
      musicNote(PROG[bar] + 7, t, 0.32, 1.0);
    }
    var mel = motif && motif[step % 16];
    if (mel != null) {
      // ikinci tekrarda ufak çeşitleme
      if (motifPlays === 2 && Math.random() < 0.2) mel = SCALE[Math.max(0, Math.min(SCALE.length - 1, SCALE.indexOf(mel) + (Math.random() < 0.5 ? -1 : 1)))];
      musicNote(mel, t, 0.32 * rnd(0.8, 1), 0.7);
    }
    step++;
  }

  function scheduler() {
    if (!ctx || document.hidden) return;
    if (ctx.state !== 'running') return;
    var horizon = ctx.currentTime + 0.5;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // geride kaldıysa toparla
    while (nextTime < horizon) { scheduleStep(nextTime); nextTime += STEP_DUR; }
  }

  function startMusic() {
    if (!ctx || !enabled.music || !wantMusic) return;
    if (document.hidden) return;
    if (!musicTimer) {
      nextTime = ctx.currentTime + 0.1;
      musicTimer = setInterval(safe(scheduler), 100);
    }
    try {
      var g = musicBus.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(MUSIC_VOL, t + 1.0);
    } catch (e) {}
    scheduler();
  }

  function stopMusic(pauseOnly) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!ctx || pauseOnly) return;
    try {
      var g = musicBus.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + 0.3);
    } catch (e) {}
  }

  function music(on) {
    wantMusic = !!on;
    if (!wantMusic) { stopMusic(false); return; }
    if (!enabled.music) return;
    if (ctx) { resumeCtx(); startMusic(); }
    // ctx yoksa unlock() geldiğinde başlar
  }

  document.addEventListener('visibilitychange', safe(function () {
    if (document.hidden) {
      stopMusic(true);
      if (synth && speaking > 0) { try { synth.cancel(); } catch (e) {} }
    } else {
      resumeCtx(); // Android arka planda askıya alır
      if (wantMusic && enabled.music) startMusic();
    }
  }));
  window.addEventListener('pageshow', safe(function () { resumeCtx(); }));

  // ---------------------------------------------------------------- ducking
  var speaking = 0;
  function duck(down) {
    if (!ctx || !duckGain) return;
    try {
      var g = duckGain.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(down ? 0.3 : 1, t + (down ? 0.25 : 0.8));
    } catch (e) {}
  }

  // ---------------------------------------------------------------- speech
  var voice = null, voicesTried = false;

  function scoreVoice(v) {
    var lang = (v.lang || '').replace('_', '-').toLowerCase();
    var name = v.name || '';
    var s = 0;
    if (lang === 'tr-tr') s += 10; else if (lang.indexOf('tr') === 0) s += 8;
    else if (/turk|türk/i.test(name)) s += 6; else return -1;
    if (/google/i.test(name)) s += 4;
    if (/microsoft/i.test(name)) s += 4;
    if (/natural|online|neural|enhanced|premium/i.test(name)) s += 2;
    if (/female|kad[ıi]n|emel|seda|yelda|filiz|zeynep|aylin|elif|ay[sş]e|cansu/i.test(name)) s += 3;
    if (/\bmale\b|tolga|ahmet|erkek/i.test(name)) s -= 2;
    if (v.localService) s += 0.5;
    return s;
  }

  function loadVoices() {
    if (!synth) return;
    try {
      var list = synth.getVoices() || [];
      if (!list.length) return;
      voicesTried = true;
      var best = null, bs = -1;
      for (var i = 0; i < list.length; i++) {
        var sc = scoreVoice(list[i]);
        if (sc > bs) { bs = sc; best = list[i]; }
      }
      voice = bs >= 0 ? best : null;
    } catch (e) {}
  }
  if (synth) {
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', safe(loadVoices));
      else synth.onvoiceschanged = safe(loadVoices);
    } catch (e) {}
    loadVoices();
  }

  var keep = []; // Chrome GC hatasına karşı referans tut

  function speak(text, opts) {
    return new Promise(function (resolve) {
      try {
        if (!text || !enabled.voice || !synth || !Utter) { resolve(); return; }
        opts = opts || {};
        var rate = opts.rate || 0.92, pitch = opts.pitch || 1.15;
        var interrupt = opts.interrupt !== false;
        if (!voice) loadVoices(); // Android: ses geç yüklenir, her denemede tekrar bak

        var u = new Utter(String(text));
        u.lang = 'tr-TR';
        if (voice) u.voice = voice;
        u.rate = rate; u.pitch = pitch; u.volume = 1;

        var finished = false, timer = null, counted = false;
        function finish() {
          if (finished) return; finished = true;
          if (timer) clearTimeout(timer);
          var k = keep.indexOf(u); if (k >= 0) keep.splice(k, 1);
          if (counted) { speaking = Math.max(0, speaking - 1); if (!speaking) duck(false); }
          resolve();
        }
        u.onend = finish;
        u.onerror = finish;
        keep.push(u);

        var doSpeak = function () {
          try {
            counted = true; speaking++; duck(true);
            if (synth.paused) synth.resume();
            synth.speak(u);
          } catch (e) { finish(); }
        };
        // Android onend'i bazen hiç çağırmaz → uzunluğa göre emniyet zaman aşımı
        var est = Math.max(2500, String(text).length * 95 / rate) + 2000;
        if (!interrupt) est += 6000 * Math.min(keep.length - 1, 4);
        timer = setTimeout(finish, est);

        if (interrupt && (synth.speaking || synth.pending)) {
          try { synth.cancel(); } catch (e) {}
          setTimeout(doSpeak, 60); // Chrome: cancel ardından hemen speak bazen düşer
        } else {
          if (interrupt) { try { synth.cancel(); } catch (e) {} }
          doSpeak();
        }
      } catch (e) { resolve(); }
    });
  }

  var CHEERS = ['Harika!', 'Süper!', 'Aferin sana!', 'Çok güzel!', 'Bravo!', 'Muhteşem!'];
  var lastCheer = -1;
  function pickCheer() {
    var i = Math.floor(Math.random() * CHEERS.length);
    if (i === lastCheer) i = (i + 1 + Math.floor(Math.random() * (CHEERS.length - 1))) % CHEERS.length;
    lastCheer = i;
    return CHEERS[i];
  }
  function cheer(text) {
    var t = (typeof text === 'string' && text) ? text : pickCheer();
    var p = speak(t, { rate: 0.95, pitch: 1.2 });
    try { p.text = t; } catch (e) {}
    return p;
  }

  // ---------------------------------------------------------------- settings
  function setEnabled(o) {
    if (!o) return;
    if (typeof o.sound === 'boolean') {
      enabled.sound = o.sound;
      if (ctx && sfxBus) { try { sfxBus.gain.setTargetAtTime(o.sound ? SFX_VOL : 0, ctx.currentTime, 0.03); } catch (e) {} }
    }
    if (typeof o.music === 'boolean') {
      enabled.music = o.music;
      if (!o.music) { stopMusic(false); wantMusic = false; } // tekrar açmak için app music(true) çağırır
    }
    if (typeof o.voice === 'boolean') {
      enabled.voice = o.voice;
      if (!o.voice && synth) { try { synth.cancel(); } catch (e) {} }
    }
  }

  function isMusicPlaying() { return !!musicTimer; }

  return {
    unlock: safe(unlock),
    play: safe(play),
    music: safe(music),
    speak: function (text, opts) { try { return speak(text, opts); } catch (e) { return Promise.resolve(); } },
    cheer: function (text) { try { return cheer(text); } catch (e) { return Promise.resolve(); } },
    pickCheer: function () { try { return pickCheer(); } catch (e) { return 'Harika!'; } },
    setEnabled: safe(setEnabled),
    getEnabled: function () { return { sound: enabled.sound, music: enabled.music, voice: enabled.voice }; },
    isMusicPlaying: isMusicPlaying,
    SOUNDS: Object.keys(sounds)
  };
})();
