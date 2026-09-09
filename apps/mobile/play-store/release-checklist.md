# Google Play release checklist

## Kodda tayyor

- Package ID: `uz.zayuno.mobile`
- Android target va compile SDK: API 36
- Production format: Android App Bundle (`.aab`)
- Release minification va resource shrinking yoqilgan
- Cleartext HTTP release buildda o‘chirilgan
- Automatic cloud backup o‘chirilgan
- Launcher, adaptive va themed iconlar sozlangan
- Play Store 512×512 icon va 1024×500 feature graphic tayyor
- Privacy policy: `https://zayuno.uz/privacy`
- Account deletion: `https://zayuno.uz/delete-account`
- Hisobni o‘chirish havolasi ilova ichidagi chatlar menyusida bor

## Play Console’da bajariladi

- Developer identity va payment profile verifikatsiyasini tugatish
- App access bo‘limida review uchun test account/instructions berish
- Ads deklaratsiyasini haqiqiy monetizatsiya holatiga mos to‘ldirish
- Data safety formasini production backend va uchinchi tomon SDKlari bilan qayta tekshirib to‘ldirish
- Content rating savolnomasini to‘ldirish
- Target audience va children policy javoblarini belgilash
- News, health, financial va boshqa maxsus deklaratsiyalar tegishli bo‘lmasa “No” deb belgilash
- Kamida 2 ta haqiqiy telefon screenshotini yuklash; tavsiya: 1080×1920 yoki 1440×2560
- `support@zayuno.uz` va public policy URLlar productionda ishlashini tekshirish
- Birinchi AAB’ni Internal testing track’ga chiqarib, pre-launch reportni tuzatish
- Production rolloutdan oldin `versionCode` remote auto-increment ishlayotganini tekshirish

## Build

```bash
cd apps/mobile
pnpm play:assets
pnpm play:check
eas build --platform android --profile production
eas submit --platform android --profile production
```

EAS loyihasi hali ulanmagan bo‘lsa, bir marta `eas init` bajariladi. Google Play’dagi birinchi upload qo‘lda qilinishi mumkin; keyingi submitlar service account orqali avtomatlashtiriladi.
