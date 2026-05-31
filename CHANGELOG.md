# 📋 Sürüm Geçmişi (Changelog)

Tüm Rase Launcher sürümlerinin güncellemeleri, hata düzeltmeleri ve yeni özellikleri bu dosyada listelenir.

---

## 🚀 [1.0.5] - 2026-05-31

Bu güncelleme ile Rase Launcher'a özel, tescilli **Tek Tıkla Rase Paketi (.rase)** paylaşım ve kurulum altyapısı, göz alıcı cam efektli entegre kurulum arayüzü ve tam sürüm yükseltme özellikleri eklenmiştir!

### 📤 Tek Tıkla Rase Paketi (.rase) Dışa/İçe Aktarıcı
- **Profili Dışa Aktar (.rase):** Özel profil yöneticisindeki her profile terracotta renkli modern bir **Paylaş/Dışa Aktar (`ti-share`)** butonu eklendi. Profili anında tüm mod, doku ve config dosyalarıyla birlikte tek tıkla `.rase` paketi halinde kaydeder.
- **Glassmorphic Kurulum Sihirbazı:** Paketler & Modlar ekranına dropped veya seçilen `.rase` paketleri için, tam ekran `backdrop-filter: blur(16px)` cam efekti, terracotta parlayan arşiv animasyonu ve **canlı %0-100 ilerleme çubuğu** barındıran kurulum modalı eklendi.
- **Otomatik Profil Etkinleştirme:** Kurulum tamamlandığında yeni profil otomatik olarak settings listesine eklenir ve launcher **anında bu yeni profili aktif duruma getirir!**
- **İsim Çakışması Koruması:** Aynı isimli profiller içe aktarılırken isimlerin çakışmasını engellemek için `(İthal - X)` benzersiz takıları eklenir.

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
