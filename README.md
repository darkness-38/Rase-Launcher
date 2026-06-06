# 🌌 Rase Launcher (Archived & Discontinued)

```
      _______      ________ ______ 
     |  __ \ \    / /  ____|  ____|
     | |__) \ \  / /| |__  | |__   
     |  _  / \ \/ / |  __| |  __|  
     | | \ \  \  /  | |____| |____ 
     |_|  \_\  \/   |______|______|
```

> **"Bir `rm -rf` klasiği ve arşa ulaşan veda..."**

## ⚠️ Ne Oldu? (Küçük Bir Kaza)
Bu projenin en son ve en güncel kaynak kodları, yerel bilgisayardaki bir temizlik esnasında yanlışlıkla kalıcı olarak silinmiştir. 
* **GitHub'da duran bu repodaki kodlar eskidir/yanlıştır** ve son kararlı sürümü temsil etmemektedir.
* **Geliştirme süreci resmi olarak durdurulmuştur (Discontinued).** Artık yeni bir özellik eklenmeyecek veya güncelleme yapılmayacaktır.

---

## 🚀 Son Sürüm Hâlâ Aktif!
Kodlar gitmiş olsa da, derlenmiş ve paketlenmiş olan en son kararlı sürüm (**v1.1.0-hotfix**) sapasağlam duruyor! 

Uygulamayı hâlâ sorunsuz ve güncel bir şekilde kullanmak isterseniz:
👉 **[Releases (Yayınlar)](https://github.com/darkness-38/Rase-Launcher/releases)** kısmına giderek son kararlı sürümü (`.AppImage` veya `.exe`) indirip doğrudan çalıştırabilirsiniz.

---

## 🛠️ Kodları Kurtarmak & Devam Ettirmek İsteyen Yol Arkadaşları İçin

Eğer projenin gidişatını sevdiyseniz ve *"Ben bu işi burada bırakmam, kaldığı yerden devralıp geliştirmeye devam edeceğim"* diyorsanız, önünüzde uygulayabileceğiniz iki alternatif yol bulunuyor:

### 1. Sıfırdan & Eski Commit'lerden Başlamak (Temiz Başlangıç)
Reponun geçmiş commit geçmişine (örneğin `v1.0.6-hotfix` veya daha eski etiketlere/commit'lere) giderek stabil durumdaki eski kaynak kodlarını çekebilir ve projenizi bu temel üzerine inşa etmeye başlayabilirsiniz.

### 2. AppImage İçinden Kodları Geri Kazanmak (Tersine Mühendislik)
En son sürümde çalışan en güncel React bileşenlerimiz (JSX), stil kodlarımız (CSS) ve Electron backend lojiklerimiz derlenmiş ve paketlenmiş şekilde `.AppImage` dosyasının içinde muhafaza edilmektedir. Bu dosyaları dışarı aktarmak için terminalinizde şu komutları sırasıyla uygulayabilirsiniz:

```bash
# 1. İlk olarak indirdiğiniz AppImage dosyasını bir klasöre çıkartın
./Rase.Launcher-1.1.0-hotfix.AppImage --appimage-extract

# 2. Çıkan klasör içindeki app.asar arşivini npx aracılığıyla açın
npx @electron/asar extract squashfs-root/resources/app.asar kurtarilan-kodlar
```

Bu işlem bittiğinde oluşturulan `kurtarilan-kodlar` klasörü içerisinde:
* `dist-electron/main.cjs` dosyasında: En güncel Electron arka plan ve sistem entegrasyonu kodlarını bulabilirsiniz.
* `dist/assets/index-*.js` dosyasında: Sıkıştırılmış (minified) frontend ve React bileşeni mantıklarını bulabilirsiniz. Bir **code beautifier (kod güzelleştirici)** yazılım kullanarak bu dosyayı düzenli satırlara döküp kodları tamamen okunabilir hale getirebilir ve kendi projenize aktarabilirsiniz!

---

## 📜 Son Söz
Projeye ilgi gösteren, kullanan ve destek veren herkese teşekkürler. Kodların silinmesi can sıksa da, son sürümün çalışır vaziyette olması tek tesellimiz. 

*Bir başka projede, daha sık `git commit` atarak görüşmek üzere!* ☕

---
*R.I.P. Rase Launcher Source Code (2026)*
