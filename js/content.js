/* Yapboz Dünyası — eğitici içerik ve canvas illüstrasyonları (YB.Content) */
window.YB = window.YB || {};
YB.Content = (function () {
  'use strict';

  var FONT = '"Baloo 2", "Segoe UI", system-ui, sans-serif';
  var EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var TAU = Math.PI * 2;
  var CONFETTI = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45', '#FF8FAB', '#2EC4B6'];

  /* ======================= DÜNYALAR ======================= */
  var WORLDS = [
    { id: 1,  name: 'Çiftlik',          emoji: '🐄', theme: 'farm',     colors: { bg1: '#BDE8FF', bg2: '#EAF9C8', accent: '#5DB833' } },
    { id: 2,  name: 'Meyveler',         emoji: '🍎', theme: 'fruit',    colors: { bg1: '#FFE1EA', bg2: '#FFF4D2', accent: '#FF5E6C' } },
    { id: 3,  name: 'Renkler',          emoji: '🎨', theme: 'colors',   colors: { bg1: '#E8E2FF', bg2: '#FFEFF7', accent: '#8B5CF6' } },
    { id: 4,  name: 'Şekiller',         emoji: '🔷', theme: 'shapes',   colors: { bg1: '#D4F1FF', bg2: '#FFF5DC', accent: '#FF9F1C' } },
    { id: 5,  name: 'Sayılar',          emoji: '🔢', theme: 'numbers',  colors: { bg1: '#FFF2BF', bg2: '#FFDDE8', accent: '#FF4F8B' } },
    { id: 6,  name: 'Taşıtlar',         emoji: '🚗', theme: 'vehicles', colors: { bg1: '#C9E8FF', bg2: '#EEF5FB', accent: '#2D7FF9' } },
    { id: 7,  name: 'Orman',            emoji: '🦁', theme: 'forest',   colors: { bg1: '#D6F4CB', bg2: '#FFF0C4', accent: '#2E9E5B' } },
    { id: 8,  name: 'Deniz',            emoji: '🐠', theme: 'sea',      colors: { bg1: '#9EE6FF', bg2: '#2F86DB', accent: '#00B4D8' } },
    { id: 9,  name: 'Harfler',          emoji: '🔤', theme: 'letters',  colors: { bg1: '#FFE6CF', bg2: '#E2F6FF', accent: '#FF7A45' } },
    { id: 10, name: 'Gökyüzü ve Doğa',  emoji: '🌈', theme: 'sky',      colors: { bg1: '#B5D5FF', bg2: '#FFE2F0', accent: '#7C5CFF' } }
  ];

  /* ======================= ÖĞELER ======================= */
  var ITEMS = [];
  function add(world, kind, word, emoji, say, extra) {
    var n = ITEMS.length + 1;
    ITEMS.push({ id: n, world: world, word: word, emoji: emoji, say: say, kind: kind, extra: extra || {} });
  }

  // 1 — Çiftlik
  add(1, 'emoji', 'İNEK',   '🐄', 'Bu bir inek! İnekler möö der ve bize süt verir.');
  add(1, 'emoji', 'KÖPEK',  '🐶', 'Bu bir köpek! Köpekler hav hav der ve evimizi korur.');
  add(1, 'emoji', 'KEDİ',   '🐱', 'Bu bir kedi! Kediler miyav der ve mırıl mırıl uyur.');
  add(1, 'emoji', 'TAVUK',  '🐔', 'Bu bir tavuk! Tavuklar gıt gıt gıdak der ve bize yumurta verir.');
  add(1, 'emoji', 'AT',     '🐴', 'Bu bir at! Atlar kişner ve dörtnala çok hızlı koşar.');
  add(1, 'emoji', 'KOYUN',  '🐑', 'Bu bir koyun! Koyunlar mee der, yünlerinden sıcacık kazaklar yapılır.');
  add(1, 'emoji', 'DOMUZ',  '🐷', 'Bu bir domuz! Domuzlar çamurda yuvarlanmayı çok sever.');
  add(1, 'emoji', 'ÖRDEK',  '🦆', 'Bu bir ördek! Ördekler vak vak der ve suda yüzer.');
  add(1, 'emoji', 'TAVŞAN', '🐰', 'Bu bir tavşan! Tavşanlar havuç yer ve hop hop zıplar.');
  add(1, 'emoji', 'KEÇİ',   '🐐', 'Bu bir keçi! Keçiler mee der ve kayalara tırmanmayı sever.');

  // 2 — Meyveler
  add(2, 'emoji', 'ELMA',     '🍎', 'Bu bir elma! Elma kıpkırmızı ve çıtır çıtırdır.');
  add(2, 'emoji', 'MUZ',      '🍌', 'Bu bir muz! Muz sarıdır, kabuğunu soyup yeriz.');
  add(2, 'emoji', 'ÇİLEK',    '🍓', 'Bu bir çilek! Çilek kırmızıdır, üstünde minicik tohumlar var.');
  add(2, 'emoji', 'ÜZÜM',     '🍇', 'Bunlar üzüm! Üzüm salkım salkım olur, taneleri tatlıdır.');
  add(2, 'emoji', 'PORTAKAL', '🍊', 'Bu bir portakal! Portakal turuncudur, suyu çok lezzetlidir.');
  add(2, 'emoji', 'KARPUZ',   '🍉', 'Bu bir karpuz! Dışı yeşil, içi kırmızı. Yazın bizi serinletir.');
  add(2, 'emoji', 'ARMUT',    '🍐', 'Bu bir armut! Armut sulu ve tatlı bir meyvedir.');
  add(2, 'emoji', 'KİRAZ',    '🍒', 'Bunlar kiraz! Kirazlar ağaçta ikiz ikiz sallanır.');
  add(2, 'emoji', 'ANANAS',   '🍍', 'Bu bir ananas! Ananasın başında yeşil yaprakları var.');
  add(2, 'emoji', 'ŞEFTALİ',  '🍑', 'Bu bir şeftali! Şeftalinin kabuğu yumuşacık ve tüylüdür.');

  // 3 — Renkler
  add(3, 'color', 'KIRMIZI',    '🍎', 'Bu kırmızı! Elma da kırmızı, çilek de kırmızı.',          { hex: '#E53935', exampleEmoji: '🍎' });
  add(3, 'color', 'MAVİ',       '🐳', 'Bu mavi! Gökyüzü de mavi, deniz de mavi.',                { hex: '#1E88E5', exampleEmoji: '🐳' });
  add(3, 'color', 'SARI',       '🐥', 'Bu sarı! Güneş sarı, civciv de sarı.',                    { hex: '#FDD835', exampleEmoji: '🐥' });
  add(3, 'color', 'YEŞİL',      '🐸', 'Bu yeşil! Kurbağa yeşil, yapraklar da yeşil.',            { hex: '#43A047', exampleEmoji: '🐸' });
  add(3, 'color', 'TURUNCU',    '🥕', 'Bu turuncu! Havuç turuncu, portakal da turuncu.',         { hex: '#FB8C00', exampleEmoji: '🥕' });
  add(3, 'color', 'MOR',        '🍇', 'Bu mor! Üzüm mor, patlıcan da mor.',                      { hex: '#8E24AA', exampleEmoji: '🍇' });
  add(3, 'color', 'PEMBE',      '🌸', 'Bu pembe! Çiçekler pembe, pamuk şeker de pembe.',         { hex: '#F06292', exampleEmoji: '🌸' });
  add(3, 'color', 'KAHVERENGİ', '🐻', 'Bu kahverengi! Ayıcık kahverengi, çikolata da kahverengi.', { hex: '#795548', exampleEmoji: '🐻' });
  add(3, 'color', 'SİYAH',      '🎩', 'Bu siyah! Gece siyahtır, sihirbazın şapkası da siyah.',   { hex: '#212121', exampleEmoji: '🎩' });
  add(3, 'color', 'BEYAZ',      '🦢', 'Bu beyaz! Kar beyaz, kuğu da bembeyaz.',                  { hex: '#FFFFFF', exampleEmoji: '🦢' });

  // 4 — Şekiller
  add(4, 'shape', 'DAİRE',      '🔵', 'Bu bir daire! Dairenin hiç köşesi yok, top gibi yuvarlak.',       { shape: 'circle',    sides: 0, color: '#FF5A5F' });
  add(4, 'shape', 'KARE',       '🟥', 'Bu bir kare! Karenin dört kenarı var, hepsi eşit.',               { shape: 'square',    sides: 4, color: '#3D8BFF' });
  add(4, 'shape', 'ÜÇGEN',      '🔺', 'Bu bir üçgen! Üçgenin üç kenarı ve üç köşesi var.',               { shape: 'triangle',  sides: 3, color: '#34C759' });
  add(4, 'shape', 'DİKDÖRTGEN', '🚪', 'Bu bir dikdörtgen! Dört kenarı var, kapılar da dikdörtgendir.',   { shape: 'rectangle', sides: 4, color: '#FF9F1C' });
  add(4, 'shape', 'YILDIZ',     '⭐', 'Bu bir yıldız! Yıldızın beş sivri ucu var.',                      { shape: 'star',      sides: 0, color: '#FFC300' });
  add(4, 'shape', 'KALP',       '❤️', 'Bu bir kalp! Kalp sevgi demektir. Seni çok seviyoruz!',            { shape: 'heart',     sides: 0, color: '#FF4D8D' });
  add(4, 'shape', 'OVAL',       '🥚', 'Bu bir oval! Oval, yumurta gibi uzunca ve yuvarlaktır.',          { shape: 'oval',      sides: 0, color: '#A259FF' });
  add(4, 'shape', 'BAKLAVA',    '🔶', 'Bu bir baklava dilimi! Dört kenarı var, uçurtmaya benzer.',       { shape: 'diamond',   sides: 4, color: '#00B8C9' });
  add(4, 'shape', 'BEŞGEN',     '🏠', 'Bu bir beşgen! Beşgenin beş kenarı ve beş köşesi var.',           { shape: 'pentagon',  sides: 5, color: '#FF7043' });
  add(4, 'shape', 'ALTIGEN',    '🐝', 'Bu bir altıgen! Altı kenarı var, arı peteği de altıgendir.',      { shape: 'hexagon',   sides: 6, color: '#7CB342' });

  // 5 — Sayılar
  var NUM_WORDS = ['BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ', 'ON'];
  var NUM_SAY = ['Bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
  var NUM_KEYCAP = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  var NUM_OBJ = [
    ['☀️', 'güneş'], ['🦋', 'kelebek'], ['🍎', 'elma'], ['🎈', 'balon'], ['⭐', 'yıldız'],
    ['🐞', 'uğur böceği'], ['🌸', 'çiçek'], ['🐥', 'civciv'], ['🍓', 'çilek'], ['🐟', 'balık']
  ];
  for (var ni = 0; ni < 10; ni++) {
    var cnt = ni + 1;
    var countStr = NUM_SAY.slice(0, cnt).join(', ');
    var numName = NUM_SAY[ni].charAt(0).toLocaleUpperCase('tr-TR') + NUM_SAY[ni].slice(1);
    var sayN = cnt === 1
      ? 'Bir! Bir ' + NUM_OBJ[ni][1] + '.'
      : countStr + '! ' + numName + ' ' + NUM_OBJ[ni][1] + '.';
    add(5, 'number', NUM_WORDS[ni], NUM_KEYCAP[ni], sayN, { count: cnt, emoji: NUM_OBJ[ni][0] });
  }

  // 6 — Taşıtlar
  add(6, 'emoji', 'ARABA',      '🚗', 'Bu bir araba! Arabalar düt düt diye korna çalar.');
  add(6, 'emoji', 'OTOBÜS',     '🚌', 'Bu bir otobüs! Otobüse pek çok kişi birlikte biner.');
  add(6, 'emoji', 'TREN',       '🚂', 'Bu bir tren! Tren raylarda çuf çuf gider.');
  add(6, 'emoji', 'UÇAK',       '✈️', 'Bu bir uçak! Uçaklar bulutların üstünde uçar.');
  add(6, 'emoji', 'GEMİ',       '🚢', 'Bu bir gemi! Gemiler denizde yüzer.');
  add(6, 'emoji', 'BİSİKLET',   '🚲', 'Bu bir bisiklet! İki tekerleği var, pedal çevirerek gideriz.');
  add(6, 'emoji', 'HELİKOPTER', '🚁', 'Bu bir helikopter! Pervanesi fır fır döner.');
  add(6, 'emoji', 'İTFAİYE',    '🚒', 'Bu bir itfaiye! İtfaiyeciler yangınları söndürür.');
  add(6, 'emoji', 'AMBULANS',   '🚑', 'Bu bir ambulans! Ambulans hastalara yardıma koşar.');
  add(6, 'emoji', 'ROKET',      '🚀', 'Bu bir roket! Roketler uzaya uçar. Üç, iki, bir, haydi!');

  // 7 — Orman
  add(7, 'emoji', 'ASLAN',   '🦁', 'Bu bir aslan! Aslanlar kükrer, ormanın kralıdır.');
  add(7, 'emoji', 'FİL',     '🐘', 'Bu bir fil! Fillerin upuzun bir hortumu var.');
  add(7, 'emoji', 'ZÜRAFA',  '🦒', 'Bu bir zürafa! Zürafanın boynu çok uzundur.');
  add(7, 'emoji', 'MAYMUN',  '🐵', 'Bu bir maymun! Maymunlar muz yer ve daldan dala atlar.');
  add(7, 'emoji', 'AYI',     '🐻', 'Bu bir ayı! Ayılar balı çok sever, kışın uyur.');
  add(7, 'emoji', 'KAPLAN',  '🐯', 'Bu bir kaplan! Kaplanın turuncu tüyleri ve siyah çizgileri var.');
  add(7, 'emoji', 'ZEBRA',   '🦓', 'Bu bir zebra! Zebranın siyah beyaz çizgileri var.');
  add(7, 'emoji', 'TİLKİ',   '🦊', 'Bu bir tilki! Tilkinin kabarık, turuncu bir kuyruğu var.');
  add(7, 'emoji', 'BAYKUŞ',  '🦉', 'Bu bir baykuş! Baykuşlar gece uyanır ve hu hu der.');
  add(7, 'emoji', 'KİRPİ',   '🦔', 'Bu bir kirpi! Kirpinin sırtı diken dikendir.');

  // 8 — Deniz
  add(8, 'emoji', 'BALIK',        '🐠', 'Bu bir balık! Balıklar suda yüzer, blup blup!');
  add(8, 'emoji', 'AHTAPOT',      '🐙', 'Bu bir ahtapot! Ahtapotun sekiz kolu var.');
  add(8, 'emoji', 'YUNUS',        '🐬', 'Bu bir yunus! Yunuslar çok akıllıdır ve sudan zıplar.');
  add(8, 'emoji', 'BALİNA',       '🐋', 'Bu bir balina! Balina dünyanın en büyük hayvanıdır.');
  add(8, 'emoji', 'YENGEÇ',       '🦀', 'Bu bir yengeç! Yengeçler yan yan yürür.');
  add(8, 'emoji', 'KAPLUMBAĞA',   '🐢', 'Bu bir kaplumbağa! Kaplumbağa evini sırtında taşır.');
  add(8, 'emoji', 'DENİZYILDIZI', '⭐', 'Bu bir denizyıldızı! Denizyıldızının beş kolu var.', { draw: 'starfish' });
  add(8, 'emoji', 'PENGUEN',      '🐧', 'Bu bir penguen! Penguenler uçamaz ama çok güzel yüzer.');
  add(8, 'emoji', 'KÖPEKBALIĞI',  '🦈', 'Bu bir köpekbalığı! Köpekbalığının sivri dişleri var.');
  add(8, 'emoji', 'DENİZ KABUĞU', '🐚', 'Bu bir deniz kabuğu! Kulağına tutarsan denizin sesini duyarsın.');

  // 9 — Harfler
  add(9, 'letter', 'ARI',      '🐝', 'A, Arı! Arı vız vız uçar ve bal yapar.',            { letter: 'A', lower: 'a' });
  add(9, 'letter', 'BALON',    '🎈', 'B, Balon! Balonlar havada süzülür.',                { letter: 'B', lower: 'b' });
  add(9, 'letter', 'CİVCİV',   '🐥', 'C, Civciv! Civciv cik cik öter.',                    { letter: 'C', lower: 'c' });
  add(9, 'letter', 'DONDURMA', '🍦', 'D, Dondurma! Dondurma soğuk ve tatlıdır.',           { letter: 'D', lower: 'd' });
  add(9, 'letter', 'ELMA',     '🍎', 'E, Elma! Elma çok sağlıklı bir meyvedir.',           { letter: 'E', lower: 'e' });
  add(9, 'letter', 'FİL',      '🐘', 'F, Fil! Filin kocaman kulakları var.',               { letter: 'F', lower: 'f' });
  add(9, 'letter', 'GÜNEŞ',    '☀️', 'G, Güneş! Güneş bizi ısıtır ve aydınlatır.',         { letter: 'G', lower: 'g' });
  add(9, 'letter', 'KELEBEK',  '🦋', 'K, Kelebek! Kelebeklerin rengarenk kanatları var.',  { letter: 'K', lower: 'k' });
  add(9, 'letter', 'OYUNCAK',  '🧸', 'O, Oyuncak! Oyuncaklarla oynamak çok eğlenceli.',    { letter: 'O', lower: 'o' });
  add(9, 'letter', 'ŞEMSİYE',  '☂️', 'Ş, Şemsiye! Yağmur yağınca şemsiyemizi açarız.',     { letter: 'Ş', lower: 'ş' });

  // 10 — Gökyüzü ve Doğa
  add(10, 'emoji', 'GÜNEŞ',       '☀️', 'Bu güneş! Güneş gündüz parlar ve bizi ısıtır.', { noSun: true });
  add(10, 'emoji', 'AY',          '🌙', 'Bu ay! Ay geceleri gökyüzünde parlar.', { night: true });
  add(10, 'emoji', 'YILDIZ',      '🌟', 'Bu bir yıldız! Yıldızlar gece gökyüzünde parıl parıl parlar.', { night: true });
  add(10, 'emoji', 'GÖKKUŞAĞI',   '🌈', 'Bu bir gökkuşağı! Yağmurdan sonra rengarenk gökkuşağı çıkar.', { noRainbow: true });
  add(10, 'emoji', 'BULUT',       '☁️', 'Bu bir bulut! Bulutlar pamuk gibi yumuşacık görünür.');
  add(10, 'emoji', 'ÇİÇEK',       '🌷', 'Bu bir çiçek! Çiçekler güzel kokar, arılar onları çok sever.');
  add(10, 'emoji', 'AĞAÇ',        '🌳', 'Bu bir ağaç! Ağaçlar bize gölge ve temiz hava verir.');
  add(10, 'emoji', 'YAĞMUR',      '🌧️', 'Bu yağmur! Yağmur damlaları şıp şıp yağar, çiçekler büyür.', { rain: true, noSun: true });
  add(10, 'emoji', 'KARDAN ADAM', '⛄', 'Bu bir kardan adam! Kışın kardan adam yaparız, burnu havuçtan.', { snow: true });
  add(10, 'emoji', 'DÜNYA',       '🌍', 'Bu Dünya! Hepimiz bu güzel gezegende yaşıyoruz.', { night: true, space: true });

  function getItem(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 1) n = 1;
    if (n > ITEMS.length) n = ITEMS.length;
    return ITEMS[n - 1];
  }

  function getWorld(id) {
    id = Math.round(Number(id));
    if (!isFinite(id) || id < 1) id = 1;
    if (id > WORLDS.length) id = WORLDS.length;
    return WORLDS[id - 1];
  }

  /* ======================= YARDIMCILAR ======================= */
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    function f() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      f: f,
      range: function (lo, hi) { return lo + (hi - lo) * f(); },
      int: function (lo, hi) { return lo + Math.floor((hi - lo + 1) * f()); },
      pick: function (arr) { return arr[Math.floor(f() * arr.length) % arr.length]; }
    };
  }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    if (!isFinite(v)) v = 0;
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }
  function mix(hex, toHex, k) {
    var a = hexToRgb(hex), b = hexToRgb(toHex);
    var r = Math.round(a.r + (b.r - a.r) * k), g = Math.round(a.g + (b.g - a.g) * k), bl = Math.round(a.b + (b.b - a.b) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function lighten(hex, k) { return mix(hex, '#ffffff', k); }
  function darken(hex, k) { return mix(hex, '#000000', k); }
  function rgba(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }
  function luminance(hex) { var c = hexToRgb(hex); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255; }

  function circlePath(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function polygonPath(ctx, cx, cy, r, n, rot) {
    for (var i = 0; i < n; i++) {
      var a = rot + i * TAU / n;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function starPath(ctx, cx, cy, ro, ri, n, rot) {
    for (var i = 0; i < n * 2; i++) {
      var r = (i % 2 === 0) ? ro : ri;
      var a = rot + i * Math.PI / n;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function heartPath(ctx, cx, cy, r) {
    var top = cy - r * 0.55;
    ctx.moveTo(cx, top + r * 0.25);
    ctx.bezierCurveTo(cx, top - r * 0.25, cx - r * 1.15, top - r * 0.35, cx - r * 1.15, top + r * 0.45);
    ctx.bezierCurveTo(cx - r * 1.15, top + r * 1.05, cx - r * 0.45, top + r * 1.35, cx, top + r * 1.75);
    ctx.bezierCurveTo(cx + r * 0.45, top + r * 1.35, cx + r * 1.15, top + r * 1.05, cx + r * 1.15, top + r * 0.45);
    ctx.bezierCurveTo(cx + r * 1.15, top - r * 0.35, cx, top - r * 0.25, cx, top + r * 0.25);
    ctx.closePath();
  }

  // Yumuşak, düzensiz leke yolu (kapalı, kuadratik eğrilerle)
  function blobPath(ctx, cx, cy, r, rnd, n, wobble) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = i * TAU / n + rnd.range(-0.12, 0.12);
      var rr = r * (1 - wobble / 2 + wobble * rnd.f());
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    var m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (var j = 0; j < n; j++) {
      var p = pts[j], q = pts[(j + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function setShadow(ctx, s, blur, dy, alpha) {
    ctx.shadowColor = 'rgba(0,0,0,' + (alpha == null ? 0.22 : alpha) + ')';
    ctx.shadowBlur = blur * s;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = dy * s;
  }
  function noShadow(ctx) {
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Emojiyi (x,y) merkezli ve yaklaşık `size` piksel boyunda çizer
  function drawEmoji(ctx, emoji, x, y, size) {
    ctx.font = Math.round(size) + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    var m = ctx.measureText(emoji);
    var asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    var yy = (typeof asc === 'number' && typeof desc === 'number' && (asc + desc) > 0)
      ? y + (asc - desc) / 2
      : y + size * 0.36;
    ctx.fillText(emoji, x, yy);
  }

  // Kalın, dış çizgili, dikey ortalı yazı
  function drawBigText(ctx, text, x, y, size, fill, stroke, strokeW, maxW) {
    ctx.font = '800 ' + Math.round(size) + 'px ' + FONT;
    if (maxW) {
      var tw = ctx.measureText(text).width;
      if (tw > maxW) { size = size * maxW / tw; ctx.font = '800 ' + Math.round(size) + 'px ' + FONT; }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var m = ctx.measureText(text);
    var asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    var yy = (typeof asc === 'number' && (asc + desc) > 0) ? y + (asc - desc) / 2 : y + size * 0.35;
    ctx.lineJoin = 'round';
    if (stroke && strokeW) {
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, yy);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, yy);
    return { size: size, baseline: yy, width: m.width };
  }

  function sparkle(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  /* ======================= DEKOR ======================= */
  function cloud(ctx, x, y, sz, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    circlePath(ctx, x, y, sz * 0.42);
    circlePath(ctx, x + sz * 0.45, y - sz * 0.22, sz * 0.52);
    circlePath(ctx, x + sz * 0.95, y - sz * 0.05, sz * 0.44);
    circlePath(ctx, x + sz * 1.3, y + sz * 0.08, sz * 0.32);
    roundRect(ctx, x - sz * 0.1, y, sz * 1.5, sz * 0.4, sz * 0.2);
    ctx.fill();
    ctx.restore();
  }

  function sun(ctx, x, y, r, s) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,200,40,0.75)';
    ctx.lineWidth = 10 * s;
    ctx.lineCap = 'round';
    for (var i = 0; i < 12; i++) {
      var a = i * TAU / 12;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
      ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
      ctx.stroke();
    }
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#FFF7B0');
    g.addColorStop(1, '#FFC93C');
    ctx.fillStyle = g;
    ctx.beginPath(); circlePath(ctx, x, y, r); ctx.fill();
    ctx.restore();
  }

  // Dalgalı tepe; y(x) fonksiyonunu döndürür
  function hill(ctx, w, h, baseY, amp, freq, phase, color) {
    function yAt(x) { return baseY + Math.sin(x / w * Math.PI * freq + phase) * amp; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (var x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yAt(x));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    return yAt;
  }

  function grassTufts(ctx, w, h, s, yAt, rnd, n, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * s;
    ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = rnd.range(0, w);
      var y = yAt(x) + rnd.range(10, Math.max(12, h - yAt(x) - 10)) * 1;
      var hh = rnd.range(14, 26) * s;
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 5 * s, y);
        ctx.quadraticCurveTo(x + k * 6 * s, y - hh * 0.6, x + k * 11 * s, y - hh);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function flower(ctx, x, y, r, petal, center) {
    ctx.fillStyle = petal;
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = i * TAU / 5;
      circlePath(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75);
    }
    ctx.fill();
    ctx.fillStyle = center;
    ctx.beginPath(); circlePath(ctx, x, y, r * 0.6); ctx.fill();
  }

  function flowers(ctx, w, h, s, rnd, n, yMin, yMax) {
    var petals = ['#FF8FAB', '#FFFFFF', '#FFD93D', '#C77DFF', '#FF9F45', '#7FD6FF'];
    for (var i = 0; i < n; i++) {
      flower(ctx, rnd.range(0, w), rnd.range(yMin, yMax), rnd.range(7, 13) * s, rnd.pick(petals), '#FFB703');
    }
  }

  function tree(ctx, x, baseY, sz, rnd) {
    ctx.fillStyle = '#8D5A3B';
    roundRectFill(ctx, x - sz * 0.09, baseY - sz * 0.75, sz * 0.18, sz * 0.78, sz * 0.05);
    var greens = ['#3FAE5A', '#4CC06A', '#2E9E4F', '#5BC26E'];
    ctx.fillStyle = rnd.pick(greens);
    ctx.beginPath();
    circlePath(ctx, x, baseY - sz * 0.95, sz * 0.42);
    circlePath(ctx, x - sz * 0.32, baseY - sz * 0.72, sz * 0.32);
    circlePath(ctx, x + sz * 0.32, baseY - sz * 0.72, sz * 0.32);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); circlePath(ctx, x - sz * 0.12, baseY - sz * 1.08, sz * 0.14); ctx.fill();
  }

  function roundRectFill(ctx, x, y, w, h, r) { ctx.beginPath(); roundRect(ctx, x, y, w, h, r); ctx.fill(); }

  function confetti(ctx, w, h, s, rnd, n, palette) {
    ctx.save();
    for (var i = 0; i < n; i++) {
      var x = rnd.range(0, w), y = rnd.range(0, h * 0.97);
      var col = rnd.pick(palette);
      ctx.globalAlpha = rnd.range(0.55, 0.9);
      var t = rnd.f();
      if (t < 0.4) {
        ctx.fillStyle = col;
        ctx.beginPath(); circlePath(ctx, x, y, rnd.range(5, 11) * s); ctx.fill();
      } else if (t < 0.75) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd.range(0, TAU));
        ctx.fillStyle = col;
        roundRectFill(ctx, -9 * s, -4 * s, 18 * s, 8 * s, 4 * s);
        ctx.restore();
      } else {
        sparkle(ctx, x, y, rnd.range(9, 16) * s, col);
      }
    }
    ctx.restore();
  }

  function bokeh(ctx, w, h, s, rnd, n, color) {
    ctx.save();
    for (var i = 0; i < n; i++) {
      ctx.globalAlpha = rnd.range(0.1, 0.22);
      ctx.fillStyle = color;
      ctx.beginPath(); circlePath(ctx, rnd.range(0, w), rnd.range(0, h * 0.8), rnd.range(40, 130) * s); ctx.fill();
    }
    ctx.restore();
  }

  function scatterGlyphs(ctx, w, h, s, rnd, n, chars, alpha) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(rnd.range(0, w), rnd.range(0, h * 0.95));
      ctx.rotate(rnd.range(-0.5, 0.5));
      ctx.globalAlpha = alpha;
      ctx.font = '800 ' + Math.round(rnd.range(56, 110) * s) + 'px ' + FONT;
      ctx.fillStyle = rnd.pick(CONFETTI);
      ctx.fillText(rnd.pick(chars), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function bunting(ctx, w, h, s, rnd) {
    var y0 = 26 * s, sag = 40 * s;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,90,70,0.6)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(w / 2, y0 + sag * 2, w, y0);
    ctx.stroke();
    var n = 16;
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var x = t * w;
      var y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
      ctx.fillStyle = CONFETTI[i % CONFETTI.length];
      ctx.beginPath();
      ctx.moveTo(x - 22 * s, y);
      ctx.lineTo(x + 22 * s, y);
      ctx.lineTo(x, y + 46 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function bubbles(ctx, w, h, s, rnd, n) {
    ctx.save();
    for (var i = 0; i < n; i++) {
      var x = rnd.range(0, w), y = rnd.range(0, h * 0.85), r = rnd.range(6, 26) * s;
      ctx.globalAlpha = rnd.range(0.45, 0.8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); circlePath(ctx, x, y, r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); circlePath(ctx, x - r * 0.35, y - r * 0.35, r * 0.22); ctx.fill();
    }
    ctx.restore();
  }

  function seaweed(ctx, x, baseY, height, s, color, rnd) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    var seg = 5, amp = rnd.range(14, 26) * s, ph = rnd.range(0, TAU);
    for (var i = 1; i <= seg; i++) {
      var yy = baseY - height * i / seg;
      var xx = x + Math.sin(ph + i * 1.3) * amp;
      ctx.quadraticCurveTo(x + Math.sin(ph + i * 1.3 - 0.65) * amp * 1.4, yy + height / seg / 2, xx, yy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function stars(ctx, w, h, s, rnd, n) {
    ctx.save();
    for (var i = 0; i < n; i++) {
      var x = rnd.range(0, w), y = rnd.range(0, h * 0.8);
      ctx.globalAlpha = rnd.range(0.5, 1);
      if (rnd.f() < 0.35) sparkle(ctx, x, y, rnd.range(10, 20) * s, rnd.pick(['#FFF6B0', '#FFFFFF', '#FFD6F5']));
      else { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); circlePath(ctx, x, y, rnd.range(2, 5) * s); ctx.fill(); }
    }
    ctx.restore();
  }

  function rainbowArcs(ctx, cx, cy, r, band, s, alpha) {
    var cols = ['#FF5E5E', '#FF9F45', '#FFD93D', '#6BCB77', '#4D96FF', '#7C5CFF', '#C77DFF'];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = band;
    for (var i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i];
      ctx.beginPath();
      ctx.arc(cx, cy, r - i * band, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- dünya temaları ---------- */
  var THEMES = {
    farm: function (ctx, w, h, s, rnd) {
      sun(ctx, w * 0.9, h * 0.12, 54 * s, s);
      for (var i = 0; i < 3; i++) cloud(ctx, rnd.range(0.02, 0.7) * w, rnd.range(0.08, 0.26) * h, rnd.range(90, 140) * s, 0.9);
      hill(ctx, w, h, h * 0.66, 26 * s, 3, rnd.range(0, 6), '#A6DD72');
      // çit
      ctx.save();
      ctx.fillStyle = '#F6E5C8';
      ctx.strokeStyle = '#C8A372';
      ctx.lineWidth = 3 * s;
      var fy = h * 0.70;
      for (var x = 10 * s; x < w; x += 64 * s) {
        ctx.beginPath(); roundRect(ctx, x, fy - 70 * s, 22 * s, 82 * s, 8 * s); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); roundRect(ctx, 0, fy - 52 * s, w, 14 * s, 6 * s); ctx.fill(); ctx.stroke();
      ctx.beginPath(); roundRect(ctx, 0, fy - 22 * s, w, 14 * s, 6 * s); ctx.fill(); ctx.stroke();
      ctx.restore();
      var yAt = hill(ctx, w, h, h * 0.76, 18 * s, 2, rnd.range(0, 6), '#7CC94E');
      grassTufts(ctx, w, h, s, yAt, rnd, 40, '#5AA83A');
      flowers(ctx, w, h, s, rnd, 18, h * 0.8, h * 0.98);
    },
    fruit: function (ctx, w, h, s, rnd) {
      var dots = ['#FFC3D0', '#FFE29A', '#C9F2C7', '#FFD3B0', '#D9CCFF'];
      ctx.save();
      for (var i = 0; i < 34; i++) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = rnd.pick(dots);
        ctx.beginPath(); circlePath(ctx, rnd.range(0, w), rnd.range(0, h * 0.72), rnd.range(14, 34) * s); ctx.fill();
      }
      ctx.restore();
      // yapraklar
      for (var j = 0; j < 10; j++) {
        ctx.save();
        ctx.translate(rnd.range(0, w), rnd.range(0, h * 0.7));
        ctx.rotate(rnd.range(0, TAU));
        ctx.fillStyle = rnd.pick(['#7BC96F', '#5DB85A', '#9AD77F']);
        ctx.beginPath(); ctx.ellipse(0, 0, 30 * s, 13 * s, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * s;
        ctx.beginPath(); ctx.moveTo(-26 * s, 0); ctx.lineTo(26 * s, 0); ctx.stroke();
        ctx.restore();
      }
      // piknik örtüsü
      var top = h * 0.74, sq = 60 * s;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, top, w, h - top);
      ctx.fillStyle = 'rgba(255,94,108,0.55)';
      for (var cx = 0; cx < w; cx += sq) ctx.fillRect(cx, top, sq / 2, h - top);
      for (var cy = top; cy < h; cy += sq) ctx.fillRect(0, cy, w, sq / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, top, w, 8 * s);
      ctx.restore();
    },
    colors: function (ctx, w, h, s, rnd) {
      rainbowArcs(ctx, w / 2, h * 1.02, h * 0.98, 30 * s, s, 0.22);
      for (var i = 0; i < 18; i++) {
        var col = rnd.pick(CONFETTI), x = rnd.range(0, w), y = rnd.range(0, h * 0.95), r = rnd.range(14, 34) * s;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = col;
        ctx.beginPath(); blobPath(ctx, x, y, r, rnd, 9, 0.45); ctx.fill();
        for (var d = 0; d < 3; d++) {
          var a = rnd.range(0, TAU), dd = r * rnd.range(1.3, 1.9);
          ctx.beginPath(); circlePath(ctx, x + Math.cos(a) * dd, y + Math.sin(a) * dd, r * rnd.range(0.12, 0.25)); ctx.fill();
        }
        ctx.restore();
      }
    },
    shapes: function (ctx, w, h, s, rnd) {
      var kinds = ['c', 's', 't', 'st'];
      for (var i = 0; i < 30; i++) {
        var k = rnd.pick(kinds), sz = rnd.range(18, 40) * s;
        ctx.save();
        ctx.translate(rnd.range(0, w), rnd.range(0, h * 0.96));
        ctx.rotate(rnd.range(0, TAU));
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = lighten(rnd.pick(CONFETTI), 0.25);
        ctx.beginPath();
        if (k === 'c') circlePath(ctx, 0, 0, sz);
        else if (k === 's') roundRect(ctx, -sz, -sz, sz * 2, sz * 2, sz * 0.25);
        else if (k === 't') polygonPath(ctx, 0, 0, sz * 1.15, 3, -Math.PI / 2);
        else starPath(ctx, 0, 0, sz * 1.2, sz * 0.55, 5, -Math.PI / 2);
        ctx.fill();
        ctx.restore();
      }
      hill(ctx, w, h, h * 0.84, 14 * s, 3, rnd.range(0, 6), 'rgba(255,214,150,0.55)');
    },
    numbers: function (ctx, w, h, s, rnd) {
      scatterGlyphs(ctx, w, h, s, rnd, 28, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], 0.28);
      bunting(ctx, w, h, s, rnd);
      hill(ctx, w, h, h * 0.86, 12 * s, 2, rnd.range(0, 6), 'rgba(255,255,255,0.45)');
    },
    vehicles: function (ctx, w, h, s, rnd) {
      sun(ctx, w * 0.1, h * 0.12, 46 * s, s);
      for (var i = 0; i < 3; i++) cloud(ctx, rnd.range(0.2, 0.85) * w, rnd.range(0.07, 0.22) * h, rnd.range(80, 130) * s, 0.9);
      // şehir silueti
      var base = h * 0.76, x = 0;
      var bcol = ['#B9D3F0', '#C8B8F0', '#F7C6D9', '#BFE6C8', '#FFE1A8', '#A9DDF3'];
      while (x < w) {
        var bw = rnd.range(70, 130) * s, bh = rnd.range(0.14, 0.34) * h;
        ctx.fillStyle = rnd.pick(bcol);
        roundRectFill(ctx, x, base - bh, bw - 6 * s, bh + 4 * s, 8 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (var wy = base - bh + 18 * s; wy < base - 26 * s; wy += 34 * s) {
          for (var wx = x + 14 * s; wx < x + bw - 30 * s; wx += 28 * s) {
            roundRectFill(ctx, wx, wy, 14 * s, 18 * s, 3 * s);
          }
        }
        x += bw;
      }
      // yol
      ctx.fillStyle = '#8A93A3';
      ctx.fillRect(0, base, w, 14 * s);
      ctx.fillStyle = '#5F6878';
      ctx.fillRect(0, base + 14 * s, w, h - base);
      ctx.fillStyle = '#FFFFFF';
      var ly = base + (h - base) * 0.48;
      for (var dx = 10 * s; dx < w; dx += 100 * s) roundRectFill(ctx, dx, ly, 60 * s, 10 * s, 5 * s);
    },
    forest: function (ctx, w, h, s, rnd) {
      var back = hill(ctx, w, h, h * 0.6, 30 * s, 3, rnd.range(0, 6), '#A9DE94');
      for (var i = 0; i < 9; i++) {
        var tx = (i + rnd.range(0.1, 0.9)) * w / 9;
        tree(ctx, tx, back(tx) + 30 * s, rnd.range(120, 170) * s, rnd);
      }
      var mid = hill(ctx, w, h, h * 0.75, 20 * s, 2, rnd.range(0, 6), '#6CC072');
      grassTufts(ctx, w, h, s, mid, rnd, 30, '#4E9F55');
      // mantarlar
      for (var m = 0; m < 6; m++) {
        var mx = rnd.range(0, w), my = rnd.range(h * 0.82, h * 0.97), ms = rnd.range(14, 22) * s;
        ctx.fillStyle = '#FFF4E0';
        roundRectFill(ctx, mx - ms * 0.3, my - ms * 0.4, ms * 0.6, ms * 0.9, ms * 0.2);
        ctx.fillStyle = '#FF5A5F';
        ctx.beginPath(); ctx.arc(mx, my - ms * 0.35, ms, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); circlePath(ctx, mx - ms * 0.4, my - ms * 0.75, ms * 0.17); circlePath(ctx, mx + ms * 0.35, my - ms * 0.6, ms * 0.14); ctx.fill();
      }
      flowers(ctx, w, h, s, rnd, 12, h * 0.8, h * 0.98);
    },
    sea: function (ctx, w, h, s, rnd) {
      // ışık hüzmeleri
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (var i = 0; i < 5; i++) {
        var x = rnd.range(0, w), bw = rnd.range(40, 90) * s;
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x + bw, 0);
        ctx.lineTo(x + bw * 2.4 - w * 0.12, h * 0.85); ctx.lineTo(x + bw * 0.4 - w * 0.12, h * 0.85);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // su yüzeyi dalgası
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (var wx = 0; wx <= w + 20; wx += 20) ctx.lineTo(wx, 34 * s + Math.sin(wx / (60 * s)) * 10 * s);
      ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
      // kum
      var sand = hill(ctx, w, h, h * 0.83, 16 * s, 3, rnd.range(0, 6), '#F6D7A7');
      for (var k = 0; k < 9; k++) {
        var sx = (k + rnd.range(0.1, 0.9)) * w / 9;
        seaweed(ctx, sx, sand(sx) + 10 * s, rnd.range(0.14, 0.3) * h, s, rnd.pick(['#2FBF71', '#1E9E5A', '#46D18A']), rnd);
      }
      ctx.save();
      for (var p = 0; p < 22; p++) {
        var px = rnd.range(0, w);
        ctx.fillStyle = rnd.pick(['#E7BE85', '#D9A86C', '#FFE9C7', '#F4A6A6']);
        ctx.beginPath(); ctx.ellipse(px, rnd.range(sand(px) + 18 * s, h * 0.99), rnd.range(6, 14) * s, rnd.range(4, 8) * s, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
      bubbles(ctx, w, h, s, rnd, 30);
    },
    letters: function (ctx, w, h, s, rnd) {
      ctx.save();
      ctx.strokeStyle = 'rgba(77,150,255,0.22)';
      ctx.lineWidth = 3 * s;
      for (var y = 70 * s; y < h; y += 64 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,94,108,0.3)';
      ctx.beginPath(); ctx.moveTo(90 * s, 0); ctx.lineTo(90 * s, h); ctx.stroke();
      ctx.restore();
      scatterGlyphs(ctx, w, h, s, rnd, 30, 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split(''), 0.3);
    },
    sky: function (ctx, w, h, s, rnd, item) {
      var ex = item.extra || {};
      if (ex.night) {
        stars(ctx, w, h, s, rnd, ex.space ? 120 : 80);
        if (!ex.space) {
          for (var c = 0; c < 2; c++) cloud(ctx, rnd.range(0.05, 0.75) * w, rnd.range(0.12, 0.3) * h, rnd.range(90, 130) * s, 0.18);
          var ny = hill(ctx, w, h, h * 0.8, 18 * s, 3, rnd.range(0, 6), '#3B3F8F');
          grassTufts(ctx, w, h, s, ny, rnd, 24, '#5A5FB5');
        } else {
          ctx.save();
          ctx.globalAlpha = 0.25;
          var neb = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, h * 0.5);
          neb.addColorStop(0, '#FF8FD0'); neb.addColorStop(1, 'rgba(255,143,208,0)');
          ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
          var neb2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, h * 0.5);
          neb2.addColorStop(0, '#7FD6FF'); neb2.addColorStop(1, 'rgba(127,214,255,0)');
          ctx.fillStyle = neb2; ctx.fillRect(0, 0, w, h);
          ctx.restore();
          // küçük gezegen
          ctx.fillStyle = '#FFB86B';
          ctx.beginPath(); circlePath(ctx, w * 0.88, h * 0.16, 34 * s); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 6 * s;
          ctx.beginPath(); ctx.ellipse(w * 0.88, h * 0.16, 58 * s, 14 * s, -0.3, 0, TAU); ctx.stroke();
        }
        return;
      }
      if (!ex.noSun && !ex.snow) sun(ctx, w * 0.9, h * 0.13, 52 * s, s);
      if (!ex.noRainbow && !ex.rain && !ex.snow) rainbowArcs(ctx, w * 0.12, h * 0.75, h * 0.42, 18 * s, s, 0.3);
      var nc = ex.rain ? 5 : 4;
      for (var i = 0; i < nc; i++) {
        cloud(ctx, rnd.range(0, 0.8) * w, rnd.range(0.05, 0.3) * h, rnd.range(90, 150) * s, ex.rain ? 0.75 : 0.9);
      }
      if (ex.rain) {
        ctx.save();
        ctx.strokeStyle = 'rgba(60,130,230,0.55)';
        ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
        for (var r = 0; r < 70; r++) {
          var rx = rnd.range(0, w), ry = rnd.range(h * 0.15, h * 0.9);
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 8 * s, ry + 26 * s); ctx.stroke();
        }
        ctx.restore();
      }
      var groundCol = ex.snow ? '#F4F9FF' : '#8ED46A';
      var y2 = hill(ctx, w, h, h * 0.78, 22 * s, 2.5, rnd.range(0, 6), ex.snow ? '#DDEBFA' : '#A8E07F');
      var y3 = hill(ctx, w, h, h * 0.84, 14 * s, 3.5, rnd.range(0, 6), groundCol);
      if (ex.snow) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        for (var f = 0; f < 90; f++) {
          ctx.globalAlpha = rnd.range(0.6, 1);
          ctx.beginPath(); circlePath(ctx, rnd.range(0, w), rnd.range(0, h * 0.95), rnd.range(3, 9) * s); ctx.fill();
        }
        ctx.restore();
      } else {
        grassTufts(ctx, w, h, s, y3, rnd, 30, '#5DAE45');
        flowers(ctx, w, h, s, rnd, 16, h * 0.86, h * 0.98);
        if (ex.rain) {
          ctx.fillStyle = 'rgba(90,160,240,0.45)';
          for (var pd = 0; pd < 4; pd++) {
            ctx.beginPath(); ctx.ellipse(rnd.range(0, w), rnd.range(h * 0.88, h * 0.96), rnd.range(40, 70) * s, 10 * s, 0, 0, TAU); ctx.fill();
          }
        }
      }
      void y2;
    }
  };

  /* ======================= ANA FİGÜRLER ======================= */
  function halo(ctx, cx, cy, r, alpha) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
    g.addColorStop(0.6, 'rgba(255,255,255,' + (alpha * 0.5) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); circlePath(ctx, cx, cy, r); ctx.fill();
  }

  function groundShadow(ctx, cx, cy, rx, ry, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,' + alpha + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); circlePath(ctx, 0, 0, rx); ctx.fill();
    ctx.restore();
  }

  function face(ctx, cx, cy, r, dark) {
    var ink = dark ? '#FFFFFF' : '#33264A';
    var ex = r * 0.38, ey = cy - r * 0.08, er = r * 0.2;
    // gözler
    for (var k = -1; k <= 1; k += 2) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(cx + k * ex, ey, er, er * 1.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2A1F3D';
      ctx.beginPath(); circlePath(ctx, cx + k * ex, ey + er * 0.18, er * 0.62); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); circlePath(ctx, cx + k * ex - er * 0.22, ey - er * 0.15, er * 0.24); ctx.fill();
    }
    // yanaklar
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - ex * 1.55, ey + r * 0.26, r * 0.13, r * 0.08, 0, 0, TAU);
    ctx.ellipse(cx + ex * 1.55, ey + r * 0.26, r * 0.13, r * 0.08, 0, 0, TAU);
    ctx.fill();
    // gülümseme
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(3, r * 0.085);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, ey + r * 0.14, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  function figureEmoji(ctx, w, h, s, item, rnd, world) {
    var cx = w / 2, cy = h * 0.44, size = h * 0.56;
    halo(ctx, cx, cy, h * 0.4, world.theme === 'sea' || (item.extra && item.extra.night) ? 0.35 : 0.6);
    groundShadow(ctx, cx, cy + size * 0.46, size * 0.38, size * 0.07, 0.18);
    if (item.extra && item.extra.draw === 'starfish') {
      drawStarfish(ctx, cx, cy, h * 0.27, s, rnd);
      return;
    }
    ctx.save();
    setShadow(ctx, s, 30, 16, 0.25);
    drawEmoji(ctx, item.emoji, cx, cy, size);
    ctx.restore();
  }

  function drawStarfish(ctx, cx, cy, R, s, rnd) {
    var ro = R * 1.15, ri = R * 0.5, rot = -Math.PI / 2;
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = (i % 2 === 0) ? ro : ri;
      var a = rot + i * Math.PI / 5;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    function path() {
      ctx.beginPath();
      // ince yuvarlak uçlar: köşe noktalarını kontrol noktası, kenar ortalarını bağlantı yap
      var m0 = [(pts[9][0] + pts[0][0]) / 2, (pts[9][1] + pts[0][1]) / 2];
      ctx.moveTo(m0[0], m0[1]);
      for (var j = 0; j < 10; j++) {
        var p = pts[j], q = pts[(j + 1) % 10];
        if (j % 2 === 0) ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        else ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.closePath();
    }
    ctx.save();
    setShadow(ctx, s, 30, 16, 0.25);
    var g = ctx.createLinearGradient(0, cy - ro, 0, cy + ro);
    g.addColorStop(0, '#FFB36B'); g.addColorStop(1, '#FF7A3D');
    ctx.fillStyle = g;
    path(); ctx.fill();
    noShadow(ctx);
    ctx.lineWidth = 14 * s; ctx.strokeStyle = '#FFFFFF'; ctx.lineJoin = 'round';
    path(); ctx.stroke();
    // noktalar
    ctx.fillStyle = '#FFE0B8';
    for (var k = 0; k < 5; k++) {
      var a = rot + k * TAU / 5;
      for (var d = 1; d <= 3; d++) {
        var dist = R * (0.42 + d * 0.17);
        ctx.beginPath(); circlePath(ctx, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, R * (0.07 - d * 0.012)); ctx.fill();
      }
    }
    face(ctx, cx, cy + R * 0.05, R * 0.55, false);
    ctx.restore();
    void rnd;
  }

  function figureColor(ctx, w, h, s, item, rnd) {
    var hex = (item.extra && item.extra.hex) || '#E53935';
    var isWhite = luminance(hex) > 0.92;
    var dark = luminance(hex) < 0.35;
    var cx = w * 0.46, cy = h * 0.43, R = h * 0.27;
    halo(ctx, cx, cy, h * 0.42, 0.55);
    groundShadow(ctx, cx, cy + R * 1.15, R * 0.9, R * 0.14, 0.16);
    // leke + damlacıklar
    var blobRnd = makeRng(item.id * 31 + 7);
    var drops = [];
    for (var i = 0; i < 6; i++) {
      var a = blobRnd.range(0, TAU), dd = R * blobRnd.range(1.12, 1.4);
      drops.push([cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, R * blobRnd.range(0.06, 0.14)]);
    }
    var shapeSeed = item.id * 97 + 3;
    function path() {
      ctx.beginPath();
      blobPath(ctx, cx, cy, R, makeRng(shapeSeed), 13, 0.3);
      for (var j = 0; j < drops.length; j++) circlePath(ctx, drops[j][0], drops[j][1], drops[j][2]);
    }
    ctx.save();
    setShadow(ctx, s, 30, 14, 0.25);
    ctx.fillStyle = hex;
    path(); ctx.fill();
    noShadow(ctx);
    ctx.lineJoin = 'round';
    ctx.lineWidth = (isWhite ? 7 : 10) * s;
    ctx.strokeStyle = isWhite ? '#8C97A8' : '#FFFFFF';
    path(); ctx.stroke();
    // parlaklık
    ctx.fillStyle = isWhite ? 'rgba(200,215,235,0.45)' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(cx - R * 0.35, cy - R * 0.45, R * 0.32, R * 0.16, -0.5, 0, TAU); ctx.fill();
    if (isWhite) {
      ctx.fillStyle = 'rgba(150,170,200,0.18)';
      ctx.beginPath(); ctx.ellipse(cx + R * 0.2, cy + R * 0.45, R * 0.55, R * 0.25, 0, 0, TAU); ctx.fill();
    }
    face(ctx, cx, cy + R * 0.05, R * 0.6, dark);
    ctx.restore();
    // örnek nesne rozeti
    var bx = cx + R * 1.2, by = cy + R * 0.62, br = h * 0.12;
    ctx.save();
    setShadow(ctx, s, 20, 8, 0.2);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); circlePath(ctx, bx, by, br); ctx.fill();
    noShadow(ctx);
    ctx.lineWidth = 10 * s;
    ctx.strokeStyle = isWhite ? '#B8C2D0' : hex;
    ctx.beginPath(); circlePath(ctx, bx, by, br - 5 * s); ctx.stroke();
    drawEmoji(ctx, (item.extra && item.extra.exampleEmoji) || item.emoji, bx, by, br * 1.25);
    ctx.restore();
    void rnd;
  }

  function shapePath(ctx, shape, cx, cy, R) {
    ctx.beginPath();
    switch (shape) {
      case 'square': roundRect(ctx, cx - R * 0.9, cy - R * 0.9, R * 1.8, R * 1.8, R * 0.12); break;
      case 'triangle': polygonPath(ctx, cx, cy + R * 0.18, R * 1.22, 3, -Math.PI / 2); break;
      case 'rectangle': roundRect(ctx, cx - R * 1.4, cy - R * 0.78, R * 2.8, R * 1.56, R * 0.1); break;
      case 'star': starPath(ctx, cx, cy + R * 0.06, R * 1.2, R * 0.52, 5, -Math.PI / 2); break;
      case 'heart': heartPath(ctx, cx, cy - R * 0.05, R * 0.95); break;
      case 'oval': ctx.ellipse(cx, cy, R * 1.35, R * 0.88, 0, 0, TAU); break;
      case 'diamond':
        ctx.moveTo(cx, cy - R * 1.2); ctx.lineTo(cx + R * 0.9, cy); ctx.lineTo(cx, cy + R * 1.2); ctx.lineTo(cx - R * 0.9, cy); ctx.closePath(); break;
      case 'pentagon': polygonPath(ctx, cx, cy + R * 0.06, R * 1.12, 5, -Math.PI / 2); break;
      case 'hexagon': polygonPath(ctx, cx, cy, R * 1.1, 6, -Math.PI / 2); break;
      default: circlePath(ctx, cx, cy, R); break;
    }
  }

  var FACE_POS = { // [dy oranı, yüz boyu oranı]
    circle: [0, 0.62], square: [0, 0.62], triangle: [0.38, 0.48], rectangle: [0, 0.6], star: [0.12, 0.42],
    heart: [-0.05, 0.55], oval: [0, 0.6], diamond: [0, 0.5], pentagon: [0.1, 0.6], hexagon: [0, 0.62]
  };

  function figureShape(ctx, w, h, s, item, rnd, world) {
    var ex = item.extra || {};
    var shape = ex.shape || 'circle';
    var col = ex.color || world.colors.accent;
    var cx = w / 2, cy = h * 0.43, R = h * 0.25;
    halo(ctx, cx, cy, h * 0.42, 0.55);
    groundShadow(ctx, cx, cy + R * 1.3, R * 1.1, R * 0.15, 0.16);
    ctx.save();
    var g = ctx.createLinearGradient(0, cy - R * 1.2, 0, cy + R * 1.2);
    g.addColorStop(0, lighten(col, 0.3));
    g.addColorStop(1, darken(col, 0.05));
    setShadow(ctx, s, 30, 16, 0.25);
    ctx.fillStyle = g;
    shapePath(ctx, shape, cx, cy, R); ctx.fill();
    noShadow(ctx);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18 * s;
    ctx.strokeStyle = '#FFFFFF';
    shapePath(ctx, shape, cx, cy, R); ctx.stroke();
    // parlaklık (şeklin içine kırpılmış)
    ctx.save();
    shapePath(ctx, shape, cx, cy, R); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(cx - R * 0.45, cy - R * 0.6, R * 0.55, R * 0.22, -0.45, 0, TAU); ctx.fill();
    ctx.restore();
    // köşe noktaları (kenar sayısını göstermek için)
    if (ex.sides >= 3) drawCornerDots(ctx, shape, cx, cy, R, s);
    var fp = FACE_POS[shape] || FACE_POS.circle;
    face(ctx, cx, cy + R * fp[0], R * fp[1], luminance(col) < 0.35);
    ctx.restore();
    void rnd;
  }

  function drawCornerDots(ctx, shape, cx, cy, R, s) {
    var pts = [];
    var i;
    if (shape === 'square') pts = [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]].map(function (p) { return [cx + p[0] * R, cy + p[1] * R]; });
    else if (shape === 'rectangle') pts = [[-1.4, -0.78], [1.4, -0.78], [1.4, 0.78], [-1.4, 0.78]].map(function (p) { return [cx + p[0] * R, cy + p[1] * R]; });
    else if (shape === 'diamond') pts = [[0, -1.2], [0.9, 0], [0, 1.2], [-0.9, 0]].map(function (p) { return [cx + p[0] * R, cy + p[1] * R]; });
    else {
      var n = shape === 'triangle' ? 3 : shape === 'pentagon' ? 5 : 6;
      var rr = shape === 'triangle' ? R * 1.22 : shape === 'pentagon' ? R * 1.12 : R * 1.1;
      var oy = shape === 'triangle' ? R * 0.18 : shape === 'pentagon' ? R * 0.06 : 0;
      for (i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * TAU / n;
        pts.push([cx + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr]);
      }
    }
    for (i = 0; i < pts.length; i++) {
      ctx.fillStyle = CONFETTI[i % CONFETTI.length];
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6 * s;
      ctx.beginPath(); circlePath(ctx, pts[i][0], pts[i][1], 17 * s); ctx.fill(); ctx.stroke();
    }
  }

  var NUM_COLORS = ['#FF5E6C', '#FF9F1C', '#FFC300', '#34C759', '#2EC4B6', '#3D8BFF', '#7C5CFF', '#C77DFF', '#FF4F8B', '#FF7043'];
  var GRID_COLS = [1, 2, 3, 2, 3, 3, 4, 4, 3, 5];

  function figureNumber(ctx, w, h, s, item, rnd) {
    var ex = item.extra || {};
    var count = Math.max(1, Math.min(10, ex.count || 1));
    var col = NUM_COLORS[(count - 1) % NUM_COLORS.length];
    // rakam
    var nx = w * 0.23, ny = h * 0.42;
    halo(ctx, nx, ny, h * 0.36, 0.6);
    groundShadow(ctx, nx, h * 0.73, w * 0.13, h * 0.025, 0.16);
    ctx.save();
    setShadow(ctx, s, 26, 14, 0.25);
    drawBigText(ctx, String(count), nx, ny, h * 0.6, col, '#FFFFFF', 0, w * 0.34);
    noShadow(ctx);
    drawBigText(ctx, String(count), nx, ny, h * 0.6, col, '#FFFFFF', 22 * s, w * 0.34);
    // rakam üstü parlaklık
    ctx.restore();
    // nesneler
    var x0 = w * 0.44, x1 = w * 0.97, y0 = h * 0.08, y1 = h * 0.76;
    var cols = GRID_COLS[count - 1], rows = Math.ceil(count / cols);
    var cell = Math.min((x1 - x0) / cols, (y1 - y0) / rows);
    var esz = Math.min(cell * 0.74, h * 0.3);
    var gridH = cell * rows;
    var oy = y0 + ((y1 - y0) - gridH) / 2;
    var idx = 0;
    for (var r = 0; r < rows; r++) {
      var inRow = Math.min(cols, count - idx);
      var rowW = inRow * cell;
      var ox = x0 + ((x1 - x0) - rowW) / 2;
      for (var c = 0; c < inRow; c++) {
        var ex_ = ox + cell * (c + 0.5), ey_ = oy + cell * (r + 0.5);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); circlePath(ctx, ex_, ey_, cell * 0.44); ctx.fill();
        setShadow(ctx, s, 14, 6, 0.2);
        drawEmoji(ctx, ex.emoji || '⭐', ex_, ey_, esz);
        ctx.restore();
        idx++;
      }
    }
    void rnd;
  }

  var LETTER_COLORS = [['#FF5E6C', '#3D8BFF'], ['#7C5CFF', '#FF9F1C'], ['#2EC4B6', '#FF4F8B'], ['#FF9F1C', '#7C5CFF'], ['#34C759', '#FF5E6C']];

  function figureLetter(ctx, w, h, s, item, rnd) {
    var ex = item.extra || {};
    var up = ex.letter || item.word.charAt(0);
    var low = ex.lower || up.toLocaleLowerCase('tr-TR');
    var pal = LETTER_COLORS[(item.id - 1) % LETTER_COLORS.length];
    var cy = h * 0.43, lx = w * 0.3;
    halo(ctx, lx, cy, h * 0.4, 0.6);
    // büyük + küçük harf yan yana, ortak taban çizgisi
    var upSize = h * 0.58, lowSize = h * 0.44;
    ctx.save();
    ctx.font = '800 ' + Math.round(upSize) + 'px ' + FONT;
    var upW = ctx.measureText(up).width;
    var mU = ctx.measureText(up);
    ctx.font = '800 ' + Math.round(lowSize) + 'px ' + FONT;
    var lowW = ctx.measureText(low).width;
    var gap = 18 * s;
    var total = upW + gap + lowW;
    var maxW = w * 0.46;
    var k = total > maxW ? maxW / total : 1;
    upSize *= k; lowSize *= k; upW *= k; lowW *= k; gap *= k; total *= k;
    var asc = (typeof mU.actualBoundingBoxAscent === 'number' && mU.actualBoundingBoxAscent > 0) ? mU.actualBoundingBoxAscent * k : upSize * 0.7;
    var baseline = cy + asc / 2;
    var left = lx - total / 2;
    groundShadow(ctx, lx, baseline + 22 * s, total * 0.45, h * 0.025, 0.16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    var parts = [[up, upSize, left, pal[0]], [low, lowSize, left + upW + gap, pal[1]]];
    for (var i = 0; i < parts.length; i++) {
      ctx.font = '800 ' + Math.round(parts[i][1]) + 'px ' + FONT;
      setShadow(ctx, s, 24, 12, 0.25);
      ctx.fillStyle = parts[i][3];
      ctx.fillText(parts[i][0], parts[i][2], baseline);
      noShadow(ctx);
      ctx.lineWidth = 20 * s;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeText(parts[i][0], parts[i][2], baseline);
      ctx.fillText(parts[i][0], parts[i][2], baseline);
    }
    ctx.restore();
    // emoji
    var exx = w * 0.78, eyy = h * 0.42, esz = h * 0.36;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); circlePath(ctx, exx, eyy, esz * 0.62); ctx.fill();
    ctx.lineWidth = 10 * s; ctx.strokeStyle = pal[0];
    ctx.beginPath(); circlePath(ctx, exx, eyy, esz * 0.62); ctx.stroke();
    setShadow(ctx, s, 24, 12, 0.25);
    drawEmoji(ctx, item.emoji, exx, eyy, esz);
    ctx.restore();
    void rnd;
  }

  /* ======================= ETİKET ======================= */
  function drawLabel(ctx, w, h, s, item, world) {
    var text = item.word;
    var fs = 84 * s;
    ctx.save();
    ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT;
    var tw = ctx.measureText(text).width;
    var swatch = item.kind === 'color' ? 64 * s : 0;
    var maxTW = w * 0.82 - swatch;
    if (tw > maxTW) { fs *= maxTW / tw; ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT; tw = ctx.measureText(text).width; }
    var padX = 54 * s, pillH = 122 * s;
    var pw = tw + padX * 2 + swatch;
    var px = (w - pw) / 2, py = h - pillH - 30 * s;
    setShadow(ctx, s, 22, 8, 0.22);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); roundRect(ctx, px, py, pw, pillH, pillH / 2); ctx.fill();
    noShadow(ctx);
    ctx.lineWidth = 7 * s;
    ctx.strokeStyle = rgba(world.colors.accent, 0.85);
    ctx.beginPath(); roundRect(ctx, px + 3.5 * s, py + 3.5 * s, pw - 7 * s, pillH - 7 * s, (pillH - 7 * s) / 2); ctx.stroke();
    var midY = py + pillH / 2;
    if (swatch) {
      var hex = item.extra.hex;
      ctx.fillStyle = hex;
      ctx.beginPath(); circlePath(ctx, px + padX + 20 * s, midY, 24 * s); ctx.fill();
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = luminance(hex) > 0.9 ? '#8C97A8' : darken(hex, 0.15);
      ctx.stroke();
    }
    ctx.font = '800 ' + Math.round(fs) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var mH = ctx.measureText('H');
    var capH = (typeof mH.actualBoundingBoxAscent === 'number' && mH.actualBoundingBoxAscent > 0) ? mH.actualBoundingBoxAscent : fs * 0.7;
    ctx.fillStyle = '#2C2A4A';
    ctx.fillText(text, px + swatch + padX + tw / 2, midY + capH / 2);
    ctx.restore();
  }

  /* ======================= RENDER ======================= */
  function render(item, w, h) {
    if (typeof item === 'number' || typeof item === 'string') item = getItem(item);
    if (!item || !item.word) item = ITEMS[0];
    w = Math.max(1, Math.round(w || 1200));
    h = Math.max(1, Math.round(h || 900));
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    var s = Math.min(w / 1200, h / 900);
    var world = WORLDS[(item.world || 1) - 1] || WORLDS[0];
    var rnd = makeRng((item.id || 1) * 7919 + 104729);
    var ex = item.extra || {};

    try {
      // arka plan gradyanı
      var bg1 = world.colors.bg1, bg2 = world.colors.bg2;
      if (ex.night) { bg1 = ex.space ? '#0E1440' : '#1C2566'; bg2 = ex.space ? '#3A2A80' : '#5B4BB7'; }
      if (ex.rain) { bg1 = '#AFC6E0'; bg2 = '#E3ECF5'; }
      if (ex.snow) { bg1 = '#BFD9F5'; bg2 = '#F2F7FF'; }
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, bg1);
      g.addColorStop(1, bg2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      bokeh(ctx, w, h, s, rnd, 7, '#FFFFFF');
      var theme = THEMES[world.theme];
      if (theme) { ctx.save(); theme(ctx, w, h, s, rnd, item); ctx.restore(); }
      confetti(ctx, w, h, s, rnd, world.theme === 'sea' ? 24 : (ex.night ? 20 : 48), CONFETTI);

      ctx.save();
      switch (item.kind) {
        case 'color': figureColor(ctx, w, h, s, item, rnd, world); break;
        case 'shape': figureShape(ctx, w, h, s, item, rnd, world); break;
        case 'number': figureNumber(ctx, w, h, s, item, rnd, world); break;
        case 'letter': figureLetter(ctx, w, h, s, item, rnd, world); break;
        default: figureEmoji(ctx, w, h, s, item, rnd, world); break;
      }
      ctx.restore();

      drawLabel(ctx, w, h, s, item, world);
    } catch (e) {
      try { console.warn('YB.Content.render hata:', e); } catch (e2) {}
    }
    return canvas;
  }

  /* ---------- önbellek (son ~3 seviye) ---------- */
  var CACHE_MAX = 3;
  var cache = []; // [{key, canvas}]

  function renderCached(n, w, h) {
    var item = getItem(n);
    w = Math.round(w || 1200); h = Math.round(h || 900);
    var key = item.id + ':' + w + 'x' + h;
    for (var i = 0; i < cache.length; i++) {
      if (cache[i].key === key) {
        var hit = cache.splice(i, 1)[0];
        cache.unshift(hit);
        return hit.canvas;
      }
    }
    var c = render(item, w, h);
    cache.unshift({ key: key, canvas: c });
    while (cache.length > CACHE_MAX) {
      var old = cache.pop();
      try { old.canvas.width = old.canvas.height = 0; } catch (e) {}
    }
    return c;
  }

  function clearCache() {
    while (cache.length) {
      var old = cache.pop();
      try { old.canvas.width = old.canvas.height = 0; } catch (e) {}
    }
  }

  /* ---------- özel fotoğraf: ortadan kırp ---------- */
  function cover(src, w, h) {
    w = Math.max(1, Math.round(w || 1200));
    h = Math.max(1, Math.round(h || 900));
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    var sw = 0, sh = 0;
    if (src) {
      sw = src.naturalWidth || src.videoWidth || src.width || 0;
      sh = src.naturalHeight || src.videoHeight || src.height || 0;
    }
    if (!sw || !sh) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#BDE8FF'); g.addColorStop(1, '#FFE2F0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      drawEmoji(ctx, '🖼️', w / 2, h / 2, h * 0.4);
      return canvas;
    }
    var k = Math.max(w / sw, h / sh);
    var dw = sw * k, dh = sh * k;
    ctx.imageSmoothingEnabled = true;
    try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    try { ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); } catch (e) { /* yoksay */ }
    return canvas;
  }

  return {
    WORLDS: WORLDS,
    ITEMS: ITEMS,
    getItem: getItem,
    getWorld: getWorld,
    render: render,
    renderCached: renderCached,
    clearCache: clearCache,
    cover: cover
  };
})();
