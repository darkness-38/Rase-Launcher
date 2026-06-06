# 🌌 Rase Launcher

<p align="center">
  <img src="https://img.shields.io/badge/Project%20Status-Archived-red?style=for-the-badge&logo=git" alt="Status" />
  <img src="https://img.shields.io/badge/Latest%20Version-v1.1.0--hotfix-orange?style=for-the-badge&logo=github" alt="Version" />
  <img src="https://img.shields.io/badge/Made%20With-Electron%20%26%20React-cyan?style=for-the-badge&logo=electron" alt="Technologies" />
  <img src="https://img.shields.io/badge/Platform-Linux%20%2F%20Windows-blue?style=for-the-badge" alt="Platforms" />
</p>

```
      _______      ________ ______ 
     |  __ \ \    / /  ____|  ____|
     | |__) \ \  / /| |__  | |__   
     |  _  / \ \/ / |  __| |  __|  
     | | \ \  \  /  | |____| |____ 
     |_|  \_\  \/   |______|______|
```

> ⚠️ **ÖNEMLİ DUYURU / ARCHIVE NOTICE**  
> Bu proje resmi olarak arşivlenmiştir ve aktif olarak geliştirilmemektedir. Kaynak kodları trajik bir kaza sonucu silinmiştir. Detaylar aşağıdadır.

---

## 🎬 Trajik Hikaye: Bir `rm -rf` Dramı 😢
Her şey güzel gidiyordu... Yeni özellikler, performans optimizasyonları ve JVM argümanları ayarları tamamlanmış, en son kararlı sürüm başarıyla derlenip paketlenmişti. 

Ancak yerel diskte yapılan "ufak" bir temizlik sırasında yanlışlıkla tüm geliştirme dizini kalıcı olarak silindi. İşin acı tarafı, en son kod değişiklikleri henüz GitHub'a gönderilmemişti (push edilmemişti).

* **Sonuç:** Repoda duran eski kodlar en güncel sürümle uyuşmamaktadır ve eksiktir. 
* **Karar:** Projeyi bu noktada dondurmaya ve açık kaynak topluluğuna emanet etmeye karar verdik.

---

## 📊 Repo Durum Tablosu

| Dosya / Bileşen | Durum | Açıklama |
| :--- | :--- | :--- |
| **Geliştirici Kodları (`src/`, `electron/`)** | ❌ **SİLİNDİ** | Yerel diskten tamamen silinmiştir. Repoda eski halleri duruyordu, karışıklık olmaması adına temizlendi. |
| **En Son Paket (`v1.1.0-hotfix`)** |  **AKTİF** | Derlenmiş ve paketlenmiş kararlı uygulama dosyası hâlâ kullanılabilir durumdadır. |
| **Geliştirme Durumu** | 🛑 **DURDURULDU** | Yeni güncelleme veya hata düzeltmesi yapılmayacaktır. |

---

## 🚀 Son Sürüm Hâlâ Hayatta! nası indirip kurarım?
Kodlar uçmuş olsa da, derlenmiş olan en son kararlı sürüm (**v1.1.0-hotfix**) sapasağlam çalışıyor. Uygulamayı kullanmaya devam etmek için:

1. **[Releases / Sürümler](https://github.com/darkness-38/Rase-Launcher/releases)** sayfasına gidin.
2. İşletim sisteminize uygun olan dosyayı indirin:
   * **Linux kullanıcıları için:** `.AppImage` (Çalıştırılabilir yapıp doğrudan açabilirsiniz).
   * **Windows kullanıcıları için:** `.exe` kurulum veya taşınabilir dosyası.
3. Çift tıklayarak Minecraft maceralarınıza kaldığınız yerden devam edin!

---

## 🛠️ Kodları Kurtarmak & Devam Ettirmek İsteyen Yol Arkadaşları İçin
Eğer *"Ben bu projeyi çok sevdim, kaldığı yerden devam ettireceğim veya kendi launcher'ımı yapacağım"* diyorsanız, önünüzde iki harika yol var:

### 1. Sıfırdan Başlamak (Clean Start)
Bu reponun geçmiş commit'lerine giderek (örn: `v1.0.6-hotfix` veya daha öncesi) eski kaynak kodlarını çekebilir ve projenizi bu temel üzerine inşa edebilirsiniz.

### 2. AppImage İçinden Kodları Kurtarmak (Decompile/Reverse Engineering)
En güncel kodlarımız (JSX, CSS ve Electron arka plan lojikleri) derlenmiş olarak `.AppImage` dosyasının içindedir. Bu kodları şu adımlarla kurtarabilirsiniz:

```bash
# 1. AppImage dosyasını klasöre çıkartın
./Rase.Launcher-1.1.0-hotfix.AppImage --appimage-extract

# 2. Çıkan klasördeki app.asar dosyasını npx yardımıyla açın
npx @electron/asar extract squashfs-root/resources/app.asar kurtarilan-kodlar
```

`kurtarilan-kodlar` klasörünün içinde:
* `dist-electron/main.cjs` dosyasında en güncel **Electron arka plan lojiğini**,
* `dist/assets/index-*.js` dosyasında ise sıkıştırılmış (minified) **React bileşenlerini** bulabilirsiniz. Bir kod güzelleştirici (beautifier) kullanarak bu kodları tamamen okunabilir yapıp projenize kopyalayabilirsiniz!

---

## ❤️ Teşekkürler
Bu süreçte projeyi kullanan, hata bildiren ve destek olan tüm Minecraft severlere sonsuz teşekkürler. 

*Bir başka projede, daha sık `git push` atarak görüşmek üzere! Kendinize iyi bakın.* 👋

---
<p align="center">
  <i>R.I.P. Rase Launcher Source Code (2026)</i>
</p>
