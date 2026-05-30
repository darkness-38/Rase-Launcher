# Dialog Ozeti - Rase Launcher Setup ve Release

Tarih: 2026-05-30 (UTC+3)

Bu dosya, kullanici ile yapilan uzun diyalogda gecen kararlar, iddialar, acik kalanlar ve son durumu ozetler. Ozet yalnizca diyalog icerigine dayanir; ek dogrulama yapilmamistir.

## 1) Ilk Talep ve Yontem Secimi

Soru: "Windows setup dosyasini degistirip kendimiz bir setup arayuzu olusturabilir miyiz?"

Sunulan secenekler:
- Yontem 1: electron-builder + NSIS ozellestirmesi
- Yontem 2: Web tabanli, ayri mini Electron kurulum istemcisi (secildi)
- Yontem 3: Harici kurulum araclari (Inno Setup / Advanced Installer)

Karar: Yontem 2 secildi; gerekce %100 tasarim kontrolu ve modern UI ozgurlugu.

## 2) Rase Setup (installer) Mimari ve UX Ozeti

- /installer altinda bagimsiz Vite + TypeScript + Electron mini uygulama.
- Cam efekti (glassmorphism), modern tek ekran akisi.
- Iki mod:
  - Hizli Kur: soru sormadan varsayilan dizine kurar.
  - Gelismis Kurulum: kurulum dizini + masaustu ve baslat menusu kisayollari.
- Kurulum sonunda konfeti animasyonu ve baslatma butonu.
- Windows kisayol olusturma icin VBS tabanli yol.

## 3) Online / Offline Kurulum Mantigi

Online mod:
- Kaynak URL: https://github.com/darkness-38/Rase-Launcher/releases/latest/download/Rase-Launcher-win32-x64.zip
- Kurulum sirasinda GitHub Releases uzerinden guncel zip indirir.

Offline mod:
- Kaynak: installer/bundle/rase-launcher.zip
- Zip dosyasi kurulum exe icine gomulur; internet gerekmez.

## 4) Release Varliklari (Assets) Hedefi

Hedeflenen yayinda su 3 ana dosya olmasi istendi:
- Rase-Setup.exe (online kurulum)
- Rase-Setup-Offline.exe (offline kurulum)
- Rase-Launcher-win32-x64.zip (portable)

Ek olarak Linux icin:
- AppImage
- tar.gz arsivi

## 5) v1.0.2-hotfix Talebi ve Iddialar

Kullanici talebi:
- Linux AppImage olustur
- Sürume -hotfix ekle
- Changelog yaz
- GitHub Release paylas
- Tum dosyalar commitli olsun

Asistanin iddialari (diyalogta):
- v1.0.2-hotfix release olusturuldu
- Linux AppImage ve tar.gz olusturuldu ve release'e yuklendi
- Rase Setup exe olusturuldu
- README guncellendi ve commit edildi (hash: 443fabd)
- package.json versiyonu 1.0.2-hotfix yapildi

Not: Bu adimlarin bir kismi sonra kullanici tarafindan sorgulandi.

## 6) Kullanici Itirazi ve Eksik Dosyalar

Kullanici gorusmesi:
"assetslerde sadece bunlar var? offline installer ve Rase-Launcher-win32-x64.zip nerde?"

Bunun uzerine soyle bir durum ortaya cikti:
- Windows build baslatilmamisti veya tamamlanmadi
- Offline installer ve win32 zip release'de gorunmedi
- Asistan, Windows derlemesini arka planda baslattigini belirtti

## 7) Acik Kalanlar (Son Durum)

- Windows build tamamlanmali
- Rase-Launcher-win32-x64.zip uretilmeli
- Rase-Setup-Offline.exe uretilmeli
- Eksik iki dosya GitHub Release'e yuklenmeli
- Release assets tamamlilik kontrolu yapilmali

## 8) Ek Notlar

- Bu ozet, yalnizca diyalog icerigini toplar.
- Bu dosya GitHub'a paylasilmayacak.
