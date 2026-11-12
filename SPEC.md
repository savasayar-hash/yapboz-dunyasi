# Yapboz Dünyası — Plan ve Modül Sözleşmesi

4 yaş için eğitici yapboz oyunu. 100 seviye, 10 dünya × 10 seviye. Basitten (2 parça) karmaşığa (30 parça, gerçek yapboz şekilli).
Ebeveyn kendi fotoğraflarını yükleyebilir; oyun bunları parçalara ayırır.

## Teknik kararlar

- **Kurulumsuz web uygulaması**: düz HTML + CSS + JavaScript. Derleme yok, framework yok, npm bağımlılığı yok.
- **ES module KULLANILMAZ** (çift tıkla `file://` ile açılabilsin diye). Her dosya klasik `<script>` ve tek global isim alanı kullanır:
  ```js
  window.YB = window.YB || {};
  YB.Storage = (function(){ ... return { ... }; })();
  ```
- Hedef cihaz: tablet (öncelik), telefon, bilgisayar. Dokunma + fare için **Pointer Events**. Yatay ve dikey ekran desteklenir.
- Tüm sesler WebAudio ile sentezlenir (ses dosyası yok). Konuşma: `speechSynthesis`, `tr-TR`.
- Görseller: hazır eğitici resimler kod ile canvas üzerine çizilir (emoji + şekil + yazı). Harici resim dosyası yok.
- Tüm yapboz görselleri **1200×900 (4:3) canvas** olarak motora verilir.
- Arayüz metinleri Türkçe, büyük, az yazı çok simge. Dokunma hedefleri en az 64px.

## Dosya düzeni ve sahiplik (her ajan YALNIZCA kendi dosyalarını yazar)

| Ajan | Dosyalar |
|---|---|
| A — Arayüz / Uygulama | `index.html`, `css/style.css`, `js/app.js` (isterse `js/ui.js`) |
| B — Veri / İçerik | `js/storage.js`, `js/content.js`, `js/levels.js` |
| C — Ses / Efekt | `js/audio.js`, `js/fx.js` |
| D — Yapboz Motoru | `js/puzzle.js`, `tests/puzzle-test.html` |

`index.html` script sırası (A bunu birebir uygular):
```html
<script src="js/storage.js"></script>
<script src="js/content.js"></script>
<script src="js/levels.js"></script>
<script src="js/audio.js"></script>
<script src="js/fx.js"></script>
<script src="js/puzzle.js"></script>
<script src="js/ui.js"></script>   <!-- A kullanmazsa bu satırı kaldırır -->
<script src="js/app.js"></script>
```

---

## YB.Storage (`js/storage.js`) — Ajan B

localStorage anahtarları: `yapboz.v1.progress`, `yapboz.v1.settings`. IndexedDB: veritabanı `yapboz-db`, store `images` (keyPath `id`, autoIncrement).
localStorage/IndexedDB erişimi try/catch içinde; erişilemezse bellek içi yedekle çalışır, oyun asla çökmez.

```js
YB.Storage.getProgress()            // → { unlocked: 1..100, stars: {"1":3,...}, completed: {"1":true,...} }
YB.Storage.saveLevelResult(n, stars) // tamamlandı işaretler, yıldızı (büyük olanı) saklar, unlocked = max(unlocked, n+1) (en çok 100)
YB.Storage.resetProgress()
YB.Storage.unlockAll()               // unlocked = 100
YB.Storage.getSettings()             // → { sound:true, music:true, voice:true, imageMode:'mixed' }  // 'builtin'|'custom'|'mixed'
YB.Storage.saveSettings(partial)     // birleştirir, tam ayarı döndürür

// Resimler (hepsi Promise)
YB.Storage.addImage(file, name?)     // → Promise<id>. Dosyayı en uzun kenar 1600px olacak şekilde küçültür, JPEG 0.88 blob saklar. kayıt: {id, name, blob, created}
YB.Storage.listImages()              // → Promise<[{id, name, created, url}]>  (url = object URL, küçük resim için)
YB.Storage.renameImage(id, name)     // → Promise
YB.Storage.deleteImage(id)           // → Promise
YB.Storage.getImage(id)              // → Promise<HTMLImageElement> (yüklenmiş, decode edilmiş)
```

## YB.Content (`js/content.js`) — Ajan B

```js
YB.Content.WORLDS  // 10 dünya: [{id, name, emoji, colors:{bg1,bg2,accent}}]
YB.Content.ITEMS   // tam 100 öğe, seviye sırasıyla: ITEMS[n-1] = n. seviyenin içeriği
// öğe: { id, world: 1..10, word:'İNEK', emoji:'🐄', say:'Bu bir inek! İnekler möö der ve bize süt verir.', kind:'emoji'|'color'|'shape'|'number'|'letter', extra:{...} }
YB.Content.getItem(n)                     // n: 1..100
YB.Content.render(item, w=1200, h=900)    // → HTMLCanvasElement (senkron). Renkli, zengin illüstrasyon.
YB.Content.cover(imgOrCanvas, w=1200, h=900) // → HTMLCanvasElement; ortadan kırparak 4:3'e sığdırır (özel fotoğraflar için)
```

Dünyalar ve öğeler (sıra sabittir):
1. **Çiftlik** 🐄: inek, köpek, kedi, tavuk, at, koyun, domuz, ördek, tavşan, keçi
2. **Meyveler** 🍎: elma, muz, çilek, üzüm, portakal, karpuz, armut, kiraz, ananas, şeftali
3. **Renkler** 🎨: kırmızı, mavi, sarı, yeşil, turuncu, mor, pembe, kahverengi, siyah, beyaz (renk lekesi + o renkte bir nesne emojisi)
4. **Şekiller** 🔷: daire, kare, üçgen, dikdörtgen, yıldız, kalp, oval, baklava, beşgen, altıgen (canvas path ile büyük şekil, yüzlü/sevimli)
5. **Sayılar** 🔢: 1..10 — rakam + o kadar nesne (1 güneş, 2 kelebek, 3 elma …). `say` içinde sayma: "Bir, iki, üç! Üç elma."
6. **Taşıtlar** 🚗: araba, otobüs, tren, uçak, gemi, bisiklet, helikopter, itfaiye, ambulans, roket
7. **Orman** 🦁: aslan, fil, zürafa, maymun, ayı, kaplan, zebra, tilki, baykuş, kirpi
8. **Deniz** 🐠: balık, ahtapot, yunus, balina, yengeç, kaplumbağa, denizyıldızı, penguen, köpekbalığı, deniz kabuğu
9. **Harfler** 🔤: A-Arı, B-Balon, C-Civciv, D-Dondurma, E-Elma, F-Fil, G-Güneş, K-Kelebek, O-Oyuncak, Ş-Şemsiye (büyük harf + emoji)
10. **Gökyüzü ve Doğa** 🌈: güneş, ay, yıldız, gökkuşağı, bulut, çiçek, ağaç, yağmur, kardan adam, dünya

Çizim kuralı: dünya renklerinde gradyan arka plan, yumuşak dekor (bulut/daire/zemin), ortada büyük ana figür (~yüksekliğin %55'i, gölgeli), altta yuvarlak etiket içinde kelime. Her resim parçalara bölündüğünde parçalar birbirinden ayırt edilebilir olmalı (düz tek renk geniş alanlardan kaçın — dekor serpiştir).

## YB.Levels (`js/levels.js`) — Ajan B

```js
YB.Levels.COUNT // 100
YB.Levels.get(n) // → { n, world, cols, rows, shape:'rect'|'jigsaw', ghost:0..1, grid:bool, snap:0..1, seed:n, tutorial:bool, worldEnd:bool }
```
- `ghost`: tahtadaki silik hedef resmin opaklığı. `grid`: tahtada parça yuvalarının kesik çizgili hatları. `snap`: yakalama mesafesi (parça kısa kenarına oran). `tutorial`: el animasyonu. `worldEnd`: n % 10 === 0.

Zorluk tablosu (sabit):

| Seviye | cols×rows | shape | ghost | grid | snap |
|---|---|---|---|---|---|
| 1–3 | 2×1 | rect | 0.55 | ✓ | 0.5 |
| 4–6 | 3×1 | rect | 0.5 | ✓ | 0.5 |
| 7–15 | 2×2 | rect | 0.45 | ✓ | 0.45 |
| 16–20 | 3×2 | rect | 0.45 | ✓ | 0.45 |
| 21–25 | 3×2 | jigsaw | 0.4 | ✓ | 0.4 |
| 26–30 | 3×3 | rect | 0.4 | ✓ | 0.4 |
| 31–40 | 3×3 | jigsaw | 0.35 | ✓ | 0.4 |
| 41–50 | 4×3 | jigsaw | 0.3 | ✓ | 0.35 |
| 51–60 | 4×4 | jigsaw | 0.25 | ✗ | 0.35 |
| 61–70 | 5×4 | jigsaw | 0.2 | ✗ | 0.35 |
| 71–80 | 5×4 | jigsaw | 0.12 | ✗ | 0.3 |
| 81–90 | 6×4 | jigsaw | 0.08 | ✗ | 0.3 |
| 91–100 | 6×5 | jigsaw | 0.05 | ✗ | 0.3 |

`tutorial` = n ≤ 3.

## YB.Audio (`js/audio.js`) — Ajan C

```js
YB.Audio.unlock()              // ilk kullanıcı dokunuşunda çağrılır (AudioContext resume). Birden çok çağrı güvenli.
YB.Audio.play(name)            // 'click','pickup','drop','snap','wrong','hint','star','win','unlock','pop','whoosh','fanfare'
YB.Audio.music(on)             // true: hafif, neşeli, düşük sesli üretken arka plan müziği (pentatonik); false: durdur. Çağrı tekrarları güvenli.
YB.Audio.speak(text, {rate, pitch, interrupt=true}) // → Promise (bitince resolve). tr-TR ses seçer; yoksa sessizce resolve.
YB.Audio.cheer()               // rastgele övgü söyler: "Harika!", "Süper!", "Aferin sana!", "Çok güzel!", "Bravo!"
YB.Audio.setEnabled({sound, music, voice}) // kısmi
```
Ses yoksa / AudioContext oluşturulamazsa hiçbir fonksiyon hata fırlatmaz. Konuşurken müzik sesi kısılır (ducking).

## YB.FX (`js/fx.js`) — Ajan C

Kendi tam ekran `<canvas>` katmanını oluşturur (`position:fixed; inset:0; pointer-events:none; z-index:9999`), DPR uyumlu, iş yokken requestAnimationFrame döngüsü durur.
```js
YB.FX.burst(x, y, {color?, count?})   // client koordinatlarında yıldız/ışıltı patlaması (parça oturunca)
YB.FX.confetti({duration=3000})       // tam ekran konfeti yağmuru
YB.FX.fireworks({duration=4000})      // havai fişek (dünya sonu kutlaması)
YB.FX.floatText(x, y, text, {color?}) // yukarı süzülüp kaybolan büyük yazı ("Harika!")
YB.FX.clear()
```
`prefers-reduced-motion` açıksa parçacık sayısını azaltır.

## YB.Puzzle (`js/puzzle.js`) — Ajan D

```js
const p = YB.Puzzle.create(container, {
  image,            // HTMLCanvasElement 1200×900
  cols, rows,
  shape,            // 'rect' | 'jigsaw'
  ghost,            // 0..1 tahtadaki silik resim
  grid,             // bool, yuva çizgileri
  snap,             // 0..1
  seed,             // jigsaw diş deseni için deterministik tohum
  tutorial,         // bool: ilk parçayı yuvasına götüren el animasyonu (ilk dokunuşta kaybolur)
  onPickup(info),   // {index}
  onDrop(info),     // {index, snapped:false} — yanlış yere bırakıldı
  onSnap(info),     // {index, placed, total, x, y}  x,y = yuvanın client merkez koordinatı
  onComplete()      // tüm parçalar yerinde; bitiş animasyonu bittikten sonra çağrılır
});
p.hint()     // yerleşmemiş bir parçayı sallar/parlatır, yuvasını nabız gibi gösterir. → bool
p.destroy()  // dinleyicileri, observer'ları, DOM'u temizler
```

Davranış:
- `container` içine kendi DOM'unu kurar (container'ın boyutunu doldurur; ResizeObserver ile yeniden yerleşir, yerleşmiş parçalar yerinde kalır, dağınık parçalar oransal korunur).
- Tahta (4:3) alanın büyük kısmında ortalı; dağınık parçalar tahtanın etrafındaki boş alanlara (yatayda yanlara, dikeyde alta) **üst üste binmeden** mümkün olduğunca yerleştirilir. Parçalar asla tahtanın tam üstüne/doğru yerine dağıtılmaz.
- Her parça kendi canvas'ı (DPR uyumlu), jigsaw yolu ile kırpılmış, hafif 3B kenar (bevel) ve gölge. Sürüklerken büyür (1.08) ve gölge artar, en üste çıkar.
- Bırakınca doğru yuvaya `snap` mesafesindeyse yaylı animasyonla oturur ve kilitlenir; değilse bırakıldığı yerde kalır (alan dışına çıkamaz) ve `onDrop` çağrılır.
- Parça-parça birleştirme yok (4 yaş için sadece tahtaya oturtma).
- Son parça oturunca: kısa bekleme, tam resim parçaların üstünde belirir (dikişler kaybolur), parlama süpürmesi, sonra `onComplete`.
- Çoklu dokunuşta aynı anda tek parça sürüklenir. Sayfa kaydırma/yakınlaştırma engellenir (`touch-action:none`).
- Ses/efekt çağırmaz; sadece callback verir (bağımsız test edilebilir).

## Uygulama akışı (`js/app.js`) — Ajan A

Ekranlar:
1. **Ana ekran**: animasyonlu başlık "Yapboz Dünyası", sevimli maskot, büyük ▶ Oyna düğmesi, 📒 Çıkartma Albümü, ⚙️ (ebeveyn) küçük köşe düğmesi.
2. **Harita**: 10 dünya dikey kaydırmalı; her dünya renkli başlık kartı + 10 seviye balonu zikzak yol üzerinde. Kilitli 🔒, açık (sıradaki nabız atar), tamamlanmış (öğenin emojisi + yıldızlar). Açılışta sıradaki seviyeye kayar.
3. **Oyun**: üst çubuk (🏠 harita, seviye no, 👁 önizleme [küçük tam resim], 💡 ipucu). Altında yapboz alanı. Parça oturunca `FX.burst` + `Audio.play('snap')`; yarıda ve bazen `Audio.cheer()`.
4. **Kazanma kartı**: `FX.confetti`, `Audio.play('win')`, büyük emoji/resim + kelime, yıldızlar tek tek gelir (`Audio.play('star')`), `Audio.speak(item.say)`. Düğmeler: ↻ tekrar, 🗺 harita, ▶ sonraki (büyük, nabız). Yıldız = 3 − (ipucu kullanıldıysa 1). Dünya sonu (`worldEnd`) ise ekstra `FX.fireworks` + "Dünya tamamlandı 🏆" kutlaması. 100. seviye büyük final.
5. **Çıkartma Albümü**: 100 kutu; tamamlananlar emojisiyle renkli, diğerleri gri "?".
6. **Ebeveyn kapısı**: "Ebeveyn için: 7 + 8 = ?" rakam tuş takımı (iki basamaklı toplam).
7. **Ebeveyn paneli**: resim yükle (`<input type=file accept="image/*" multiple>`, mobilde kamera da), küçük resimler + isim düzenle + sil; resim modu (Eğitici / Resimlerim / Karışık); ses / müzik / konuşma anahtarları; ilerlemeyi sıfırla; tüm seviyeleri aç.

Seviye görseli seçimi:
- `item = YB.Content.getItem(n)`; resimler = `YB.Storage.listImages()`.
- `imageMode==='builtin'` ya da resim yoksa → `YB.Content.render(item)`.
- `'custom'` → resim `images[(n-1) % len]`, `YB.Content.cover(img)`.
- `'mixed'` → çift seviyelerde özel resim, tek seviyelerde eğitici.
- Özel resimde kazanma kartı: kelime = resim adı (yoksa "Resmim"), emoji 🖼️, söz: "Harika! {ad} resmini tamamladın!".

Genel: ilk dokunuşta `YB.Audio.unlock()` ve müzik ayarı açıksa `YB.Audio.music(true)`. Ekran geçişleri yumuşak (kayma/ölçek). Yazı tipi: Google Fonts "Baloo 2" + yedek `system-ui, 'Segoe UI Rounded', sans-serif` (çevrimdışı da düzgün görünmeli). Ekranlar `prefers-reduced-motion`'a saygı duyar.
Diğer modüller henüz yüklenmemiş/eksikse uygulama çökmemeli (savunmacı çağrılar, ör. `YB.FX && YB.FX.burst(...)`).

## Hedef platform: ANDROID TELEFON (öncelikli)

Uygulama Android telefonda Chrome üzerinden **PWA** olarak çalışacak (https'te barındırılır → "Ana ekrana ekle" → tam ekran, çevrimdışı çalışan uygulama). Tüm ajanlar için:
- Birincil hedef ekran **360×740 CSS px civarı telefon**, hem dikey hem yatay. Tablet/masaüstü ikincil.
- Orta seviye Android cihazda akıcı olmalı: CSS `filter` (drop-shadow, blur) ve `backdrop-filter` **sürüklenen/çok sayıda öğede kullanılmaz**; gölgeler parça canvas'ının içine bir kez çizilir. Animasyonlar yalnızca `transform` ve `opacity` ile.
- Dokunma: Pointer Events, `touch-action:none` oyun alanlarında; parmak parçayı örtmesin diye sürüklenen parça parmağın biraz üstünde tutulabilir (motor kararı).
- **Titreşim**: parça oturunca `navigator.vibrate(15)`, kazanınca `[30,40,30]` (destek yoksa yok say; ayarlardaki ses anahtarına bağlı).
- **Geri tuşu**: Android geri tuşu uygulamadan çıkmamalı, bir önceki ekrana dönmeli (History API: her ekran geçişinde `history.pushState`, `popstate`'te geri git; ana ekranda geri → hiçbir şey yapma ya da çıkış onayı).
- **Tam ekran / ekran açık**: oyuna girerken (yüklü PWA değilse) `document.documentElement.requestFullscreen()` dene; oyun sırasında `navigator.wakeLock.request('screen')` dene (hata sessiz).
- `100dvh` kullan (adres çubuğu sorunu), `env(safe-area-inset-*)` boşlukları.
- PWA dosyaları (Ajan A): `manifest.webmanifest` (name "Yapboz Dünyası", short_name "Yapboz", display "fullscreen", orientation "any", theme/background renkleri, ikonlar `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`) ve `sw.js` (uygulama kabuğunu önbelleğe alan, cache-first, sürüm sabitli service worker; sadece http/https'te kaydedilir, `file://`'da atlanır). İkon PNG'lerini koordinatör üretir.

## Çalıştırma
- Yerel sunucu: `python -m http.server 8765` → http://localhost:8765
- Telefonda: https barındırma (GitHub Pages / Netlify) → Chrome → ⋮ → "Ana ekrana ekle".
