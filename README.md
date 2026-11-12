# 🧩 Yapboz Dünyası

4 yaş için eğitici yapboz oyunu: 100 seviye, 10 dünya (Çiftlik, Meyveler, Renkler, Şekiller, Sayılar, Taşıtlar, Orman, Deniz, Harfler, Gökyüzü). 2 parçadan 30 parçalık gerçek yapboza kadar zorlaşır. Ebeveyn kendi fotoğraflarını yükleyebilir.

Kurulum, derleme ya da internet bağlantısı gerektirmez. Ayrıntılı mimari [SPEC.md](SPEC.md) dosyasında.

## Bilgisayarda deneme

```bash
python -m http.server 8765
```
Tarayıcıda http://localhost:8765 adresini açın.

## Android telefonda hızlı deneme (aynı Wi-Fi)

1. Bilgisayarda yukarıdaki komutu çalıştırın.
2. Telefonda Chrome ile `http://<bilgisayarın-IP-adresi>:8765` adresini açın.

Bu yöntemle oyun çalışır, ancak "uygulama olarak yükleme" ve çevrimdışı mod https gerektirdiği için devreye girmez.

## Android'e uygulama olarak yükleme (önerilen)

1. Klasörü https veren ücretsiz bir barındırmaya yükleyin: GitHub Pages ya da Netlify Drop (klasörü sürükle-bırak).
2. Telefonda Chrome ile adresi açın, sonra ⋮ → **Ana ekrana ekle / Uygulamayı yükle** seçin.
3. Oyun tam ekran açılır ve internet olmadan da çalışır.
   Güncellemeler, uygulama bir sonraki açıldığında kendiliğinden gelir.

İsterseniz PWABuilder.com ile aynı adresten Play Store'a uygun bir APK paketi de üretebilirsiniz.

## Ebeveyn paneli

Ana ekranın köşesindeki ⚙️ düğmesine dokunun ve toplama sorusunu cevaplayın. Panelde şunları yapabilirsiniz:

- fotoğraf yükleme (kamera veya galeri),
- resim modunu seçme (Eğitici / Resimlerim / Karışık),
- ses, müzik ve konuşmayı açıp kapatma,
- ilerlemeyi sıfırlama,
- tüm seviyeleri açma.

Fotoğraflar yalnızca o cihazda saklanır.

## Dosyalar

| Dosya | Görev |
|---|---|
| `js/puzzle.js` | Yapboz motoru: parçalara kesme, sürükle-bırak, yerine oturtma |
| `js/content.js` | 100 eğitici resim (kodla çizilir) ve seslendirme metinleri |
| `js/levels.js` | 100 seviyelik zorluk tablosu |
| `js/storage.js` | İlerleme, ayarlar, fotoğraf deposu (IndexedDB) |
| `js/audio.js` | Sentezlenmiş sesler, müzik, Türkçe konuşma |
| `js/fx.js` | Konfeti, havai fişek, parıltı efektleri |
| `js/app.js` | Ekranlar ve oyun akışı |
| `sw.js`, `manifest.webmanifest` | Uygulama olarak yükleme ve çevrimdışı çalışma |
| `tests/puzzle-test.html` | Motoru tek başına deneme sayfası |
