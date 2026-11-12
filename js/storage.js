/* Yapboz Dünyası — kalıcı veri (YB.Storage)
 * localStorage: ilerleme + ayarlar. IndexedDB: ebeveyn fotoğrafları.
 * Hiçbir erişim çağırana hata fırlatmaz; erişilemezse bellek içi yedek kullanılır. */
window.YB = window.YB || {};
YB.Storage = (function () {
  'use strict';

  var KEY_PROGRESS = 'yapboz.v1.progress';
  var KEY_SETTINGS = 'yapboz.v1.settings';
  var MAX_LEVEL = 100;
  var MAX_SIDE = 1600;
  var JPEG_Q = 0.88;
  var DB_NAME = 'yapboz-db';
  var STORE = 'images';
  var IMAGE_MODES = { builtin: 1, custom: 1, mixed: 1 };

  /* ---------------- localStorage (bellek yedekli) ---------------- */
  var memLS = {};

  function lsGet(key) {
    try {
      var v = window.localStorage.getItem(key);
      if (v !== null && v !== undefined) return v;
    } catch (e) { /* yoksay */ }
    return Object.prototype.hasOwnProperty.call(memLS, key) ? memLS[key] : null;
  }

  function lsSet(key, value) {
    memLS[key] = value;
    try { window.localStorage.setItem(key, value); } catch (e) { /* yoksay */ }
  }

  function lsRemove(key) {
    delete memLS[key];
    try { window.localStorage.removeItem(key); } catch (e) { /* yoksay */ }
  }

  function readJSON(key) {
    var raw = lsGet(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeJSON(key, obj) {
    try { lsSet(key, JSON.stringify(obj)); } catch (e) { /* yoksay */ }
  }

  /* ---------------- İlerleme ---------------- */
  function defaultProgress() {
    return { unlocked: 1, stars: {}, completed: {} };
  }

  function normalizeProgress(p) {
    var out = defaultProgress();
    if (!p || typeof p !== 'object') return out;
    var u = Math.round(Number(p.unlocked));
    out.unlocked = isFinite(u) ? Math.max(1, Math.min(MAX_LEVEL, u)) : 1;
    var k, n, v;
    if (p.stars && typeof p.stars === 'object') {
      for (k in p.stars) {
        if (!Object.prototype.hasOwnProperty.call(p.stars, k)) continue;
        n = parseInt(k, 10);
        v = Math.round(Number(p.stars[k]));
        if (n >= 1 && n <= MAX_LEVEL && isFinite(v) && v > 0) out.stars[String(n)] = Math.min(3, v);
      }
    }
    if (p.completed && typeof p.completed === 'object') {
      for (k in p.completed) {
        if (!Object.prototype.hasOwnProperty.call(p.completed, k)) continue;
        n = parseInt(k, 10);
        if (n >= 1 && n <= MAX_LEVEL && p.completed[k]) out.completed[String(n)] = true;
      }
    }
    return out;
  }

  function getProgress() {
    return normalizeProgress(readJSON(KEY_PROGRESS));
  }

  function saveLevelResult(n, stars) {
    var p = getProgress();
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 1 || n > MAX_LEVEL) return p;
    var st = Math.round(Number(stars));
    if (!isFinite(st)) st = 0;
    st = Math.max(0, Math.min(3, st));
    var key = String(n);
    p.completed[key] = true;
    if (st > (p.stars[key] || 0)) p.stars[key] = st;
    p.unlocked = Math.min(MAX_LEVEL, Math.max(p.unlocked, n + 1));
    writeJSON(KEY_PROGRESS, p);
    return p;
  }

  function resetProgress() {
    lsRemove(KEY_PROGRESS);
    return defaultProgress();
  }

  function unlockAll() {
    var p = getProgress();
    p.unlocked = MAX_LEVEL;
    writeJSON(KEY_PROGRESS, p);
    return p;
  }

  /* ---------------- Ayarlar ---------------- */
  function defaultSettings() {
    return { sound: true, music: true, voice: true, imageMode: 'mixed' };
  }

  function normalizeSettings(s) {
    var out = defaultSettings();
    if (!s || typeof s !== 'object') return out;
    if (typeof s.sound === 'boolean') out.sound = s.sound;
    if (typeof s.music === 'boolean') out.music = s.music;
    if (typeof s.voice === 'boolean') out.voice = s.voice;
    if (typeof s.imageMode === 'string' && IMAGE_MODES[s.imageMode]) out.imageMode = s.imageMode;
    return out;
  }

  function getSettings() {
    return normalizeSettings(readJSON(KEY_SETTINGS));
  }

  function saveSettings(partial) {
    var cur = getSettings();
    if (partial && typeof partial === 'object') {
      for (var k in partial) {
        if (Object.prototype.hasOwnProperty.call(partial, k)) cur[k] = partial[k];
      }
    }
    var s = normalizeSettings(cur);
    writeJSON(KEY_SETTINGS, s);
    return s;
  }

  /* ---------------- Kalıcı depolama isteği (Android tahliyesine karşı) ---------------- */
  var persistAsked = false;
  function requestPersist() {
    if (persistAsked) return;
    persistAsked = true;
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persisted && navigator.storage.persisted().then(function (already) {
          if (!already) return navigator.storage.persist();
        }).catch(function () {});
        if (!navigator.storage.persisted) navigator.storage.persist().catch(function () {});
      }
    } catch (e) { /* yoksay */ }
  }

  /* ---------------- IndexedDB (bellek yedekli) ---------------- */
  var memImages = {};          // id -> {id, name, blob, created}
  var memNextId = 1000000;     // IndexedDB id'leriyle çakışmasın
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var idb = null;
      try { idb = window.indexedDB; } catch (e) { idb = null; }
      if (!idb) { resolve(null); return; }
      var done = false;
      function finish(db) { if (!done) { done = true; resolve(db); } }
      var timer = setTimeout(function () { finish(null); }, 4000);
      try {
        var req = idb.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          try {
            var db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
              db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
          } catch (e) { /* yoksay */ }
        };
        req.onsuccess = function () {
          clearTimeout(timer);
          var db = req.result;
          try { db.onversionchange = function () { try { db.close(); } catch (e) {} dbPromise = null; }; } catch (e) {}
          finish(db);
        };
        req.onerror = function () { clearTimeout(timer); finish(null); };
        req.onblocked = function () { /* bekle; zaman aşımı yedeği devrede */ };
      } catch (e) {
        clearTimeout(timer);
        finish(null);
      }
    });
    return dbPromise;
  }

  // İşlem yardımcı: fn(store) bir IDBRequest döndürür (ya da hiçbir şey).
  function tx(mode, fn) {
    return openDB().then(function (db) {
      if (!db) throw new Error('no-idb');
      return new Promise(function (resolve, reject) {
        var t, req, result;
        try {
          t = db.transaction(STORE, mode);
          req = fn(t.objectStore(STORE));
        } catch (e) { reject(e); return; }
        if (req) req.onsuccess = function () { result = req.result; };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error || new Error('tx-error')); };
        t.onabort = function () { reject(t.error || new Error('tx-abort')); };
      });
    });
  }

  function isMemId(id) {
    return Object.prototype.hasOwnProperty.call(memImages, String(id));
  }

  function recordBlob(rec) {
    if (!rec) return null;
    if (rec.blob instanceof Blob) return rec.blob;
    if (rec.buf) {
      try { return new Blob([rec.buf], { type: rec.type || 'image/jpeg' }); } catch (e) { return null; }
    }
    return null;
  }

  function getRecord(id) {
    if (isMemId(id)) return Promise.resolve(memImages[String(id)]);
    var key = Number(id);
    if (!isFinite(key)) return Promise.resolve(null);
    return tx('readonly', function (st) { return st.get(key); }).catch(function () { return null; });
  }

  /* ---------------- Resim işleme ---------------- */
  function cleanName(name) {
    var s = String(name == null ? '' : name)
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
    var first;
    try { first = s.charAt(0).toLocaleUpperCase('tr-TR'); } catch (e) { first = s.charAt(0).toUpperCase(); }
    s = first + s.slice(1);
    if (s.length > 20) s = s.slice(0, 20).trim();
    return s;
  }

  function nameFromFile(file) {
    var n = (file && file.name) ? String(file.name) : '';
    n = n.replace(/\.[^.\/\\]{1,6}$/, '');
    return cleanName(n);
  }

  function fitSize(w, h) {
    var longest = Math.max(w, h);
    if (longest <= MAX_SIDE) return { w: w, h: h };
    var k = MAX_SIDE / longest;
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }

  function loadImgFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url;
      try { url = URL.createObjectURL(blob); } catch (e) { reject(e); return; }
      var img = new Image();
      img.onload = function () {
        // decode() arka planda/görünmeyen sayfada hiç bitmeyebilir → süre sınırı
        var p = (img.decode ? img.decode().catch(function () {}) : Promise.resolve());
        var t = new Promise(function (r) { setTimeout(r, 1500); });
        Promise.race([p, t]).then(function () { resolve({ img: img, url: url }); });
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
        reject(new Error('decode-failed'));
      };
      img.src = url;
    });
  }

  // Kaynak çözme → {source, w, h, release()}
  function decodeFile(file) {
    var hasCIB = typeof window.createImageBitmap === 'function';
    function viaImg() {
      return loadImgFromBlob(file).then(function (r) {
        return {
          source: r.img,
          w: r.img.naturalWidth || r.img.width,
          h: r.img.naturalHeight || r.img.height,
          release: function () { try { URL.revokeObjectURL(r.url); } catch (e) {} }
        };
      });
    }
    function wrapBitmap(bmp) {
      return { source: bmp, w: bmp.width, h: bmp.height, release: function () { try { bmp.close && bmp.close(); } catch (e) {} } };
    }
    if (!hasCIB) return viaImg();

    // Önce dosya başlığından boyutu (EXIF yönü dahil) oku, sonra createImageBitmap'e
    // hedef boyutu vererek çöz: 12MP+ kamera fotoğrafları tam çözünürlükte belleğe açılmaz.
    return probeSize(file).then(function (dim) {
      if (dim) {
        var fit = fitSize(dim.w, dim.h);
        var opts = { imageOrientation: 'from-image', resizeWidth: fit.w, resizeHeight: fit.h, resizeQuality: 'high' };
        return window.createImageBitmap(file, opts).then(function (bmp) {
          // Bazı tarayıcılar yeniden boyutlandırmayı EXIF döndürmesinden önce uygular → boyutlar ters çıkar.
          if (Math.abs(bmp.width - fit.w) > 2 || Math.abs(bmp.height - fit.h) > 2) {
            try { bmp.close && bmp.close(); } catch (e) {}
            throw new Error('resize-mismatch');
          }
          return wrapBitmap(bmp);
        }).catch(function () {
          return window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(wrapBitmap);
        });
      }
      return window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(wrapBitmap);
    }).catch(function () {
      return window.createImageBitmap(file).then(wrapBitmap);
    }).catch(viaImg);
  }

  // Görüntü boyutunu (EXIF yönü uygulanmış hâliyle) ucuzca öğren.
  // JPEG/PNG/WebP başlığını okur; okunamazsa null.
  function probeSize(file) {
    return readHead(file, 256 * 1024).then(function (buf) {
      if (!buf) return null;
      var d = new DataView(buf);
      try {
        if (d.byteLength > 24 && d.getUint32(0) === 0x89504E47) {           // PNG
          return { w: d.getUint32(16), h: d.getUint32(20) };
        }
        if (d.byteLength > 30 && d.getUint32(0) === 0x52494646 && d.getUint32(8) === 0x57454250) { // WebP
          var fourcc = d.getUint32(12);
          if (fourcc === 0x56503820) { // 'VP8 '
            return { w: d.getUint16(26, true) & 0x3fff, h: d.getUint16(28, true) & 0x3fff };
          }
          if (fourcc === 0x5650384C) { // 'VP8L'
            var b = d.getUint32(21, true);
            return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
          }
          if (fourcc === 0x56503858) { // 'VP8X'
            var w = 1 + (d.getUint8(24) | (d.getUint8(25) << 8) | (d.getUint8(26) << 16));
            var h = 1 + (d.getUint8(27) | (d.getUint8(28) << 8) | (d.getUint8(29) << 16));
            return { w: w, h: h };
          }
          return null;
        }
        if (d.getUint16(0) === 0xFFD8) return jpegSize(d);                  // JPEG
      } catch (e) { return null; }
      return null;
    }).catch(function () { return null; });
  }

  function readHead(file, n) {
    return new Promise(function (resolve) {
      try {
        var part = file.slice(0, Math.min(file.size || n, n));
        if (part.arrayBuffer) { part.arrayBuffer().then(resolve, function () { resolve(null); }); return; }
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { resolve(null); };
        fr.readAsArrayBuffer(part);
      } catch (e) { resolve(null); }
    });
  }

  function jpegSize(d) {
    var off = 2, len = d.byteLength, orient = 1, w = 0, h = 0;
    while (off + 4 < len) {
      if (d.getUint8(off) !== 0xFF) { off++; continue; }
      var marker = d.getUint8(off + 1);
      if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { off += 2; continue; }
      var segLen = d.getUint16(off + 2);
      if (marker === 0xE1 && off + 10 < len && d.getUint32(off + 4) === 0x45786966) { // Exif
        orient = exifOrientation(d, off + 10, Math.min(len, off + 2 + segLen)) || 1;
      }
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        if (off + 9 > len) return null;
        h = d.getUint16(off + 5);
        w = d.getUint16(off + 7);
        break;
      }
      off += 2 + segLen;
    }
    if (!w || !h) return null;
    if (orient >= 5 && orient <= 8) return { w: h, h: w };
    return { w: w, h: h };
  }

  function exifOrientation(d, tiff, end) {
    if (tiff + 8 > end) return 1;
    var little = d.getUint16(tiff) === 0x4949;
    var ifd = d.getUint32(tiff + 4, little);
    var p = tiff + ifd;
    if (p + 2 > end) return 1;
    var count = d.getUint16(p, little);
    for (var i = 0; i < count; i++) {
      var e = p + 2 + i * 12;
      if (e + 12 > end) break;
      if (d.getUint16(e, little) === 0x0112) return d.getUint16(e + 8, little);
    }
    return 1;
  }

  function canvasToJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      function fromDataURL() {
        try {
          var url = canvas.toDataURL('image/jpeg', JPEG_Q);
          var bin = atob(url.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/jpeg' }));
        } catch (e) { reject(e); }
      }
      try {
        if (canvas.toBlob) {
          canvas.toBlob(function (b) { if (b) resolve(b); else fromDataURL(); }, 'image/jpeg', JPEG_Q);
        } else fromDataURL();
      } catch (e) { fromDataURL(); }
    });
  }

  function processFile(file) {
    return decodeFile(file).then(function (dec) {
      try {
        var fit = fitSize(dec.w, dec.h);
        var c = document.createElement('canvas');
        c.width = fit.w; c.height = fit.h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';             // şeffaf PNG'ler JPEG'de siyah olmasın
        ctx.fillRect(0, 0, fit.w, fit.h);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
        ctx.drawImage(dec.source, 0, 0, fit.w, fit.h);
        dec.release();
        return canvasToJpeg(c).then(function (blob) {
          c.width = c.height = 0;               // Android'de canvas belleğini hemen bırak
          return blob;
        });
      } catch (e) {
        dec.release();
        throw e;
      }
    });
  }

  function putRecord(rec) {
    // Önce Blob olarak dene; bazı eski WebView'lar Blob saklayamaz → ArrayBuffer yedeği.
    return tx('readwrite', function (st) { return st.add(rec); }).catch(function (err) {
      if (err && err.message === 'no-idb') throw err;
      return blobToBuffer(rec.blob).then(function (buf) {
        var r2 = { name: rec.name, buf: buf, type: rec.blob.type || 'image/jpeg', created: rec.created };
        return tx('readwrite', function (st) { return st.add(r2); });
      });
    });
  }

  function blobToBuffer(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function addImage(file, name) {
    requestPersist();
    if (!file || typeof Blob === 'undefined' || !(file instanceof Blob)) {
      return Promise.reject(new Error('Geçersiz dosya'));
    }
    var finalName = cleanName(name) || nameFromFile(file) || 'Resmim';
    return processFile(file).then(function (blob) {
      var rec = { name: finalName, blob: blob, created: Date.now() };
      return putRecord(rec).then(function (id) {
        return id;
      }).catch(function () {
        var mid = memNextId++;
        memImages[String(mid)] = { id: mid, name: rec.name, blob: rec.blob, created: rec.created };
        return mid;
      });
    });
  }

  function readAll() {
    var out = [];
    return tx('readonly', function (st) {
      if (st.getAll) {
        var r = st.getAll();
        r.addEventListener('success', function () { out = r.result || []; });
        return null;
      }
      var req = st.openCursor();      // getAll yoksa imleçle oku
      req.onsuccess = function () {
        var cur = req.result;
        if (cur) { out.push(cur.value); cur.continue(); }
      };
      return null;
    }).then(function () { return out; });
  }

  var listUrls = [];

  function listImages() {
    requestPersist();
    var old = listUrls;
    listUrls = [];
    return readAll().catch(function () { return []; }).then(function (recs) {
      var all = (recs || []).slice();
      for (var k in memImages) {
        if (Object.prototype.hasOwnProperty.call(memImages, k)) all.push(memImages[k]);
      }
      all.sort(function (a, b) { return (a.created || 0) - (b.created || 0) || (a.id - b.id); });
      var out = [];
      for (var i = 0; i < all.length; i++) {
        var r = all[i];
        var blob = recordBlob(r);
        var url = '';
        if (blob) {
          try { url = URL.createObjectURL(blob); listUrls.push(url); } catch (e) { url = ''; }
        }
        out.push({ id: r.id, name: r.name || '', created: r.created || 0, url: url });
      }
      // Önceki listenin URL'lerini biraz gecikmeyle bırak (eski <img>'ler yeniye geçsin)
      setTimeout(function () {
        for (var j = 0; j < old.length; j++) { try { URL.revokeObjectURL(old[j]); } catch (e) {} }
      }, 1500);
      return out;
    });
  }

  function renameImage(id, name) {
    var n = cleanName(name);
    if (isMemId(id)) {
      memImages[String(id)].name = n;
      return Promise.resolve();
    }
    return getRecord(id).then(function (rec) {
      if (!rec) return;
      rec.name = n;
      return tx('readwrite', function (st) { return st.put(rec); });
    }).then(function () {}).catch(function () {});
  }

  function deleteImage(id) {
    if (isMemId(id)) {
      delete memImages[String(id)];
      return Promise.resolve();
    }
    var key = Number(id);
    if (!isFinite(key)) return Promise.resolve();
    return tx('readwrite', function (st) { return st.delete(key); }).then(function () {}).catch(function () {});
  }

  var imageUrls = {}; // id -> son getImage URL'si

  function getImage(id) {
    return getRecord(id).then(function (rec) {
      var blob = recordBlob(rec);
      if (!blob) throw new Error('Resim bulunamadı');
      return loadImgFromBlob(blob).then(function (r) {
        var k = String(id);
        if (imageUrls[k]) { try { URL.revokeObjectURL(imageUrls[k]); } catch (e) {} }
        imageUrls[k] = r.url;
        return r.img;
      });
    });
  }

  return {
    getProgress: getProgress,
    saveLevelResult: saveLevelResult,
    resetProgress: resetProgress,
    unlockAll: unlockAll,
    getSettings: getSettings,
    saveSettings: saveSettings,
    addImage: addImage,
    listImages: listImages,
    renameImage: renameImage,
    deleteImage: deleteImage,
    getImage: getImage
  };
})();
