# 📋 Sürüm Geçmişi (Changelog)

Tüm Rase Launcher sürümlerinin güncellemeleri, hata düzeltmeleri ve yeni özellikleri bu dosyada listelenir.

---

## 🚀 [1.0.4-hotfix] - 2026-05-31

Bu hotfix güncellemesi ile Rase Launcher'a yepyeni "Sistem & Kumanda" sekmesi, sıfır gecikmeli asenkron müzik tanıma altyapısı, launcher içi interaktif medya oynatıcı arayüzü eklenmiş ve borderless fullscreen zorlaması ile otomatik QR pop-up'ları tamamen temizlenmiştir!

### 📊 Canlı Sistem & Kumanda Sekmesi
- Sol menüdeki **Sistem** bölümünün altına yepyeni **"Sistem & Kumanda"** sekmesi eklendi!
- **Dairesel Göstergeler:** Bilgisayarın anlık CPU ve RAM tüketimlerini gösteren pürüzsüz terracotta animasyonlu göstergeler.
- **Oyun İçi Metrikler:** Minecraft loglarından anlık FPS sayacı ve terracotta renkli oyun süresi göstergesi.
- **Telefon Bağlantısı:** QR kodu ve IP adresi bu sekmenin sağ kısmına taşındı. Ayarlar sekmesi tamamen sadeleştirildi.

### 🎵 Sıfır Gecikmeli Canlı Şarkı Bilgisi & Kontrolleri
- Windows (PowerShell SMTC) ve Linux (playerctl) üzerinden çalan şarkı verilerini milisaniyelik hassasiyetle okuyan Promise tabanlı asenkron `execPromise` altyapısı kuruldu.
- Hem telefona hem de launcher içerisine eklenen **Medya Oynatıcı** kartı ile çalınan şarkı adı, sanatçı, durup/başlayan dikey equalizer animasyonları ve ince terracotta ilerleme çizgisi saniye saniye senkronize olarak gösterilir.
- Launcher ve telefon ekranından ⏮, ⏸/▶, ⏭ interaktif butonlarıyla bilgisayardaki müzik doğrudan kontrol edilebilir.

### 🧹 Borderless Fullscreen Temizliği & Otomatik Popup İptali
- Vanilla, Forge ve Fabric sürümlerinde oyun açılışını zorlaştıran otomatik borderless fullscreen zorlaması kaldırıldı. Artık oyunlar kendi ayarlarınızla pürüzsüz başlar.
- Oyun açıldığında ekranı kaplayan otomatik QR Popup'ı kaldırıldı, bağlantı detayları tamamen yeni sekme altına taşındı.

### 🛠️ Kurulum Sihirbazı İyileştirmeleri
- **Rase-Setup.exe (Online):** 748 MB olan dosya boyutu, paketleme aşamasında offline zip dosyasının ayrıştırılmasıyla **~3.5 MB** seviyesine düşürüldü.
- **Rase-Setup-Offline.exe (Offline):** İnternet gerektirmeyen tümleşik kurulum paketi (748 MB) oluşturuldu.

---

## [1.0.3] - 2026-05-30

- Mobil kumanda bağlantı arayüzü eklendi.
- Launcher içi ses seviyesi mikseri desteği sağlandı.
- Hata düzeltmeleri ve kararlılık iyileştirmeleri yapıldı.
