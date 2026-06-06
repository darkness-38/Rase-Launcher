<div align="center">

# 🚀 Rase Launcher

**Göz alıcı, cam efektli (glassmorphism) modern ve hafif bir Minecraft Launcher**

[![Release](https://img.shields.io/github/v/release/darkness-38/Rase-Launcher?style=for-the-badge&color=7c3aed)](https://github.com/darkness-38/Rase-Launcher/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue?style=for-the-badge)](https://github.com/darkness-38/Rase-Launcher/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)

</div>

---

## ✨ Özellikler

### 🎮 Güçlü Minecraft İstemcisi
- **Vanilla, Fabric ve Forge** desteği tek bir panelde.
- Otomatik Mojang istemci dosyası indirme, kontrol etme ve otomatik JRE (Java Runtime) kurma/onarımı.
- Çevrimdışı kimlik doğrulama (Çoklu kullanıcı profili yönetimi).
- Özelleştirilebilir RAM ayarları, Java yolları ve optimize edilmiş JVM argümanları.

### 🛍️ Entegre Modrinth Keşfet Mağazası
- Modrinth API ile doğrudan entegre **Keşfet** sekmesi.
- Mod paketleri (Modpacks), Modlar, Kaynak Paketleri (Resource Packs) ve Shader'ları doğrudan arayıp tek tıkla yükleme.
- **Sürüm Bazlı Instance Sistemi**: Yüklenen her mod veya paket seçili profilin/sürümün kendi klasörüne kurulur, ana oyunu asla bozmaz.

### 📊 Canlı Sistem Durumu & Telefon Kumandası (Web Dashboard)
- **Yeni Sistem & Kumanda Sekmesi:** Launcher üzerinde CPU yükü, RAM tüketimi dairesel animasyonlu barlarla anlık olarak izlenir, Minecraft açıkken FPS sayacı ve oyun süresi görüntülenebilir.
- **Canlı Medya Oynatıcı Kartı:** Launcher arayüzü ve telefon ekranından global play/pause/prev/next kontrolleri yapılabilir. Çalan şarkı adı, sanatçı, durup/başlayan dikey equalizer animasyonları ve ince terracotta ilerleme çizgisi saniyelik senkronize akmaktadır.
- **Telefon Kumandasını Bağla:** Launcher açıkken Sistem sekmesinde üretilen dinamik QR kodu telefondan taratarak LAN üzerinden bağlanabileceğiniz mobil optimize **Web Kumanda** paneli.
- **Uygulama Bazlı Ses Mikseri:** PulseAudio/Pipewire (Linux) ve PowerShell (Windows) entegrasyonu ile Minecraft (java), Chrome gibi arka planda ses çalan her uygulamayı telefondan ayrı ayrı susturabilme veya ses düzeyini değiştirebilme.

### 🖼️ Premium Ekran Görüntüsü (Screenshot) Galerisi
- Oyunda alınan **F2** ekran görüntülerini listeleyen şık, cam efektli galeri sekmesi.
- **Dinamik Filtreleme**: Görselleri Seçili Profil, Genel Sürümler (Vanilla) veya Tüm Klasörler arasında filtreleme.
- **Tam Ekran Lightbox**: Görsellere tıklayarak tam ekran inceleyebilir, yön tuşlarıyla (Sol/Sağ) gezinebilir ve doğrudan kalıcı olarak silebilirsiniz.

### 🛠️ Özel Web Tabanlı Kurulum Sihirbazı (`Rase Setup`)
- Projeye özel, ultra hafif Vite + TypeScript + Electron tabanlı **Rase Setup** uygulaması.
- **Hızlı Kur (1-Tık)** ve **Gelişmiş Kurulum** (klasör seçimi, masaüstü/başlat menüsü kısayol kontrolleri) desteği.
- Kurulum tamamlandığında göz alıcı **HTML5 Canvas konfeti patlama animasyonları**.
- **Çevrimiçi (Online)** ve **Çevrimdışı (Offline)** derleme seçenekleri.
- **Kritik Hata Giderimi**: Windows kurulumlarında `app.asar` dosyası ayıklanırken yaşanan kilitlenme ve yetki/chmod hataları tamamen düzeltildi.

### 🎵 Discord Zengin Varlık (Rich Presence) Desteği
- Launcher açıkken: `Ana Sayfada Geziniyor`
- Oyun açıldığında: seçili sürüm adı (ör. `1.21.1 (Fabric)`)
- Tek oyunculuda: `Tek Oyunculu`
- Çok oyunculuda: `Çok Oyunculu (sunucu-ip)`

---

## 📥 İndirme

[**→ En Son Sürümü İndir**](https://github.com/darkness-38/Rase-Launcher/releases/latest)

| Platform | Dosya Adı | Açıklama |
|----------|-----------|----------|
| 🪟 Windows | `Rase-Setup-Offline.exe` | **Çevrimdışı Kurulumcu (Önerilen)** - Her şey dahil tam paket, internet gerektirmez. |
| 🪟 Windows | `Rase-Launcher-win32-x64.zip` | Portable (Kurulum gerektirmeyen taşınabilir klasör) - **Tam İsim** |
| 🐧 Linux | `Rase.Launcher-1.0.6-hotfix.AppImage` | Evrensel Linux binary **(Önerilen)** |
| 🐧 Linux | `rase-launcher-1.0.6-hotfix.tar.gz` | Sıkıştırılmış Linux arşivi |

### Linux Üzerinde Çalıştırma
```bash
chmod +x "Rase.Launcher-1.0.6-hotfix.AppImage"
./"Rase.Launcher-1.0.6-hotfix.AppImage"
```

---

## 🛠️ Geliştirme ve Derleme

### Gereksinimler
- [Node.js](https://nodejs.org/) v18+ ve npm

### Proje Kurulumu
```bash
git clone https://github.com/darkness-38/Rase-Launcher.git
cd Rase-Launcher
npm install
```

### 1. Ana Launcher Geliştirme & Derleme
```bash
# Geliştirme (Dev) Modunda Çalıştırma
npm run dev

# Linux için Derleme (AppImage + tar.gz)
npm run dist:linux

# Windows için Derleme
npm run dist:win
```

### 2. Kurulum Sihirbazı (`Rase Setup`) Geliştirme & Derleme
Kurulum sihirbazı kodları `/installer` dizininde ayrı bir alt proje olarak yer alır:
```bash
cd installer
npm install

# Geliştirme Modunda Başlatma
npm run dev

# Çevrimiçi Kurulumcu Derleme (Lightweight Rase-Setup.exe)
npm run dist:online

# Çevrimdışı Kurulumcu Derleme (Tüm launcher zip paketini içine gömer)
npm run dist:offline
```

Derlenen tüm kurulumcular `/dist-package` ve `/installer/dist-package` klasörlerinde hazır hale gelir.

---

## 🏗️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Desktop Core | Electron 42 + Esbuild |
| Animasyonlar | Framer Motion |
| Minecraft Core | minecraft-launcher-core |
| Zip Ayıklayıcı | adm-zip |
| Paketleme | electron-builder |

---

## 📄 Lisans

MIT © [darkness-38](https://github.com/darkness-38)
