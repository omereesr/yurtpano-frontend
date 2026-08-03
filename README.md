# YurtPano Frontend

React + Vite ile yazildi. Backend'in `http://localhost:3000` adresinde
calisiyor olmasi gerekir (yurtpano-backend projesi).

## Kurulum (Windows / PowerShell)

```powershell
cd yurtpano-frontend
npm install
npm run dev
```

Terminalde cikan adresi (genelde `http://localhost:5173`) tarayicida ac.

## Onemli

- Backend'i once ayri bir PowerShell penceresinde calistir (`npm run dev`
  ile yurtpano-backend klasorunde), sonra bu frontend'i baska bir pencerede
  calistir. Ikisinin ayni anda ayakta olmasi gerekiyor.
- Backend farkli bir adreste calisiyorsa (orn. prod'da) `.env` dosyasi
  olustur ve `VITE_BACKEND_URL=https://senin-backend-adresin.com` yaz -
  koda dokunmana gerek yok, `.env.example`'i kopyalayip duzenlemen yeterli.
- Kayit olurken yurdunu artik kod yazarak degil, backend'deki listeden
  (dropdown) secerek belirtiyorsun. Backend `node prisma/seed.js`
  calistirilmis olmali ki liste dolu gelsin.
- Giris (login) telefon **veya** e-posta ile yapilabilir.

## Ekranlar

- **Giris / Kayit**: telefon + SMS OTP dogrulama + yurt secimi + sifre.
- **Ortak Siparis**: kisi KAPASITESI bazli (TL degil) siparis ac, katil/ayril,
  kontenjan doldukca otomatik kapanir. Katilanlarin profili gorunur.
- **Sosyallesme**: esya/ders notu/calisma arkadasi/etkinlik-oyun kategorilerinde
  ilan ac, cozulunce isaretle.
- **Yolculuk**: hedef + saat + koltuk sayisi ile ilan ac, koltuk kap/ayril.
- **Ikinci El**: fiyat ile ilan ac, satildi isaretle.
- **Mesajlar**: Sohbetler/Istekler ayrimi, gercek zamanli (Socket.io) mesajlasma,
  zaman damgasi, mesaj silme. Herhangi bir karttan "Mesaj Gonder" ile baslar.
- **Profilim**: universite/bolum, blok+kat, sosyal medya, sifre/e-posta
  degistirme, DM bildirim ac/kapa, hesap dondurma.
- **Yonetim** (sadece admin): kullanici banlama/reaktif etme, yurt ekleme/silme,
  istatistikler.

## Kurulum notu (bu turda eklenen bagimlilik)

`socket.io-client` yeni eklendi, `npm install` calistirmani gerektirir:

```powershell
npm install
npm run dev
```

## Canliya alma (deploy) - Vercel uzerinden

1. Kodunu bir GitHub reposuna push'la.
2. vercel.com'da ucretsiz hesap ac, "Add New" -> "Project" -> repo'nu sec.
3. Vercel, Vite projesini otomatik tanir (Framework: Vite). Build
   ayarlarina dokunmana gerek yok.
4. "Environment Variables" kismina ekle:
   - `VITE_BACKEND_URL` -> backend'ini deploy ettigin adres
     (orn. `https://yurtpano-backend.onrender.com`)
5. Deploy et. Vercel sana bir adres verir (orn. `https://yurtpano.vercel.app`) -
   bu adresi backend'deki `FRONTEND_URL` ortam degiskenine yaz (CORS icin,
   bkz. yurtpano-backend README).

**Alternatif:** Netlify de ayni sekilde calisir (Environment variables ->
`VITE_BACKEND_URL`).

## PWA (Ana Ekrana Ekle) - bu turda eklendi

Uygulama artik gercek bir PWA: `public/manifest.webmanifest`, `public/sw.js`
(service worker) ve `public/icons/` altinda gerekli ikonlar var. Bunlarin
hepsi `index.html`'e bagli - kod tarafinda ekstra bir sey yapmana gerek yok,
sadece deploy etmen yeterli.

**Android/Chrome:** Site birkac kriteri (HTTPS, manifest, service worker)
karsilayinca tarayici otomatik "Ana ekrana ekle" onerebilir. Ayrica
uygulama icinde kendi kontrolumuzdeki bir "Yukle" karti da var
(`InstallPrompt` bileseni) - bu, tarayicinin `beforeinstallprompt` olayini
yakalayip kendi zamanimizda gosteriyor.

**iOS Safari:** Apple bu API'yi desteklemiyor - iOS kullanicilari elle
"Paylas" > "Ana Ekrana Ekle" yolunu kullanmali. `apple-touch-icon` ve ilgili
meta etiketleri zaten `index.html`'de tanimli, dogru ikonla eklenir.

**Ikonlar hakkinda:** `public/icons/` altindaki ikonlar basit, marka
renklerine (teal + amber "pin dot") uygun bir "ev/yurt" motifi. Istersen
gercek bir logo tasarlatip ayni dosya isimleriyle (192/512/maskable/apple-touch)
degistirebilirsin, baska hicbir yeri degistirmen gerekmez.

**Test etmek icin:** Chrome DevTools > Application > Manifest sekmesinden
manifest'in dogru okundugunu, Service Workers sekmesinden `sw.js`'in kayitli
oldugunu gorebilirsin. Telefonda Chrome'da siteyi actiginda adres cubugunun
yanindaki menude (⋮) "Ana ekrana ekle" secenegi cikmali.

## Sonraki adimlar (frontend tarafinda)

1. **Gercek push bildirimleri**: PWA temeli hazir (`sw.js` icinde `push`/
   `notificationclick` dinleyicileri dormant halde duruyor), ama gercek
   bildirim gonderebilmek icin: VAPID anahtar cifti, kullanicinin
   aboneligini (subscription) veritabaninda saklama, ve backend'in ilgili
   olaylarda (yeni mesaj, birisi ilana katildi vb.) push gondermesi
   gerekiyor. Ayri bir is turu.
2. Mesajlarda "okundu" bilgisi - zaten eklendi (bkz. onceki notlar).
3. Gercek profil fotografi yukleme (su an sadece bas harf avatari).
