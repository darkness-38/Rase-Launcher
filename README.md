<div align="center">

# 🚀 Rase Launcher

**Glassmorphism tasarımlı, modern ve hafif bir Minecraft Launcher**

[![Release](https://img.shields.io/github/v/release/darkness-38/Rase-Launcher?style=for-the-badge&color=7c3aed)](https://github.com/darkness-38/Rase-Launcher/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue?style=for-the-badge)](https://github.com/darkness-38/Rase-Launcher/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)

</div>

---

## ✨ Özellikler

### 🎮 Oynatıcı
- **Vanilla, Fabric ve Forge** desteği tek launcher'da
- Otomatik Minecraft istemci dosyası indirme ve onarma
- Çevrimdışı kimlik doğrulama (birden fazla kullanıcı profili)
- Özelleştirilebilir RAM, Java yolu ve JVM argümanları

### 📦 Mod Yöneticisi
- Sürüm bazlı instance sistemi (her sürüm için ayrı mod klasörü)
- Drag & drop mod kurulumu
- Mod etkinleştirme / devre dışı bırakma

### 🎵 Discord Rich Presence
- Launcher açıkken: `Ana Sayfada Geziniyor`
- Oyun açıldığında: sürüm adı (ör. `1.20.4 (Fabric)`)
- Tek oyunculuda: `Tek Oyunculu` + sürüm adı
- Çok oyunculuda: `Çok Oyunculu (sunucu-ip)` + sürüm adı

### 🎨 Tasarım
- Glassmorphism UI
- Koyu tema, smooth animasyonlar (Framer Motion)
- Snapshot & Historical sürüm filtreleri

---

## 📥 İndirme

[**→ En Son Sürümü İndir**](https://github.com/darkness-38/Rase-Launcher/releases/latest)

| Platform | Dosya | Açıklama |
|----------|-------|----------|
| 🐧 Linux | `Rase Launcher-x.x.x.AppImage` | Evrensel Linux binary **(önerilen)** |
| 🐧 Linux | `rase-launcher-x.x.x.tar.gz` | Sıkıştırılmış arşiv |
| 🪟 Windows | `Rase Launcher Setup x.x.x.exe` | NSIS kurulum sihirbazı **(önerilen)** |
| 🪟 Windows | `Rase Launcher x.x.x.exe` | Portable (kurulum gerektirmez) |

### Linux AppImage
```bash
chmod +x "Rase Launcher-1.0.0.AppImage"
./"Rase Launcher-1.0.0.AppImage"
```

---

## 🛠️ Geliştirme

### Gereksinimler
- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/)

### Kurulum
```bash
git clone https://github.com/darkness-38/Rase-Launcher.git
cd Rase-Launcher
npm install
```

### Geliştirme Modu
```bash
npm run dev
```

### Derleme
```bash
# Linux (AppImage + tar.gz)
npm run dist:linux

# Windows (NSIS + Portable)
npm run dist:win

# Her ikisi
npm run dist
```

Çıktılar `dist-package/` klasörüne gelir.

---

## 🏗️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Desktop | Electron 42 |
| Animasyon | Framer Motion |
| Minecraft Core | minecraft-launcher-core |
| Discord RPC | discord-rpc |
| Paketleme | electron-builder |

---

## 📄 Lisans

MIT © [darkness-38](https://github.com/darkness-38)
