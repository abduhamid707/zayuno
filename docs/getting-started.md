# Zayuno’ga biznesingizni ulash

Mijoz istagini yozadi. Zayuno provider API’dan mos mahsulotni topadi, yakuniy narxni tekshiradi va **mijoz tasdiqlagandan keyin** buyurtma yuboradi. Siz katalog, narx, mavjudlik va buyurtma bajarilishini boshqarasiz.

Bu qo‘llanma biznes egasi, dasturchi va uning AI agenti uchun. Hozirgi mahsulot fokusi — ovqat buyurtmalari. Boshqa kategoriyalarga mos contract mavjudligi ularda providerlar yoki mijoz talabi allaqachon borligini anglatmaydi.

## 1. Qaysi yo‘ldan boshlaysiz?

| Sizning vazifangiz | Keyingi qadam |
| --- | --- |
| Biznes egasiman | [Hisob va biznes profilini yaratish](/?tab=onboarding) |
| Backend dasturchiman | [API Base URL & Endpoints](base-url.md), keyin [Provider reference](/docs/contract-reference/) |
| Codex, Claude yoki boshqa agent bilan quraman | [AI agent qo‘llanmasi](ai-agents.md), portalda **AI Kit** |
| API tayyor, xato chiqyapti | [Troubleshooting](troubleshooting-faq.md), keyin [API tekshiruvi](/?tab=certification) |

## 2. Uchta bosqich

1. **Profil.** Hisob oching, emailni tasdiqlang, biznes turi, xizmat ko‘rsatish usuli va support kontaktlarini kiriting.
2. **Integratsiya.** Backendda kerakli endpointlarni quring. HTTPS base URL, capability va credentiallarni ulang. O‘z test muhitingizda certification’ni bajaring.
3. **Review va nashr.** Dashboarddagi talablarni bajaring va ko‘rib chiqishga yuboring. Certification muvaffaqiyati avtomatik ravishda ommaga chiqarish degani emas.

[Mening biznesim](/?tab=apps) sahifasida saqlangan konfiguratsiya, certification, review va provider status alohida ko‘rinadi.

## 3. Qaysi server qaysi tomonda?

| Manzil | Kim boshqaradi | Nima uchun |
| --- | --- | --- |
| https://partners.zayuno.uz | Zayuno | Provider portal va docs |
| https://api.zayuno.uz/api/v1 | Zayuno | Core va account API |
| https://YOUR_HOST/zayuno | Siz | Portalga beriladigan **Provider API Base URL** |
| https://api.zayuno.uz/api/v1/webhooks/{providerSlug} | Zayuno | Siz yuboradigan imzolangan status eventlar |

Masalan base URL oxiriga "/health" qo‘shib Zayuno sizning serveringizni chaqiradi. Portal manzilini yoki Zayuno Core URL’ini o‘z base URL’ingiz sifatida kiritmang.

## 4. Capability profilini tanlang

- **DISCOVERY_READONLY:** topish va ko‘rsatish. METADATA, HEALTH, CATALOG talab qilinadi.
- **TRANSACTIONAL:** qo‘shimcha QUOTE, ACTION_CREATE, ACTION_STATUS, WEBHOOK talab qilinadi.
- **Joylashuvlar:** DELIVERY, PICKUP, ONSITE yoki HYBRID fulfillment’da faol locationlar kerak. REMOTE uchun bu universal talab emas.

Bular capability sonlari, endpoint sonlari emas. Masalan CATALOG katalog ro‘yxati va bitta offeringni olishni qamrab oladi. [To‘liq matritsa](capabilities.md).

## 5. Birinchi tekshiriladigan so‘rov

Avval developer [API key](authentication.md) yaratadi va backendda sozlaydi. Keyin o‘z serveringizga GET /health yuboring:

~~~bash
curl "https://YOUR_HOST/zayuno/health" \
  -H "x-provider-api-key: $PROVIDER_API_KEY"
~~~

Kutilyotgan JSON va qolgan route’lar [contractdan yaratilgan reference](/docs/contract-reference/#contract-health) ichida. Namuna qiymatlarni ishlab turgan serverdan olingan dalil deb qabul qilmang.

## 6. Sandbox va real tekshiruv farqi

**Sandbox** namunaviy provider orqali oqimni tushuntiradi. U sizning API’ingiz ishlayotganini isbotlamaydi.

**API tekshiruvi / Certification** ulangan provider adapterini tekshiradi. Transactional tekshiruv test buyurtma yaratishi mumkin; o‘zingiz boshqaradigan test katalog va test fulfillment muhitidan foydalaning.

**Nashr / ACTIVE** — review va faollashtirishdan keyingi alohida holat.

## 7. Dasturchiga topshirish

AI Kit’da framework va vazifani tanlab briefni nusxalang yoki Markdown yuklab oling. Agent resurslari:

- [llms.txt](/llms.txt) — nimadan boshlash va kerakli hujjatni topish.
- [llms-full.txt](/llms-full.txt) — barcha provider qo‘llanmalari.
- [OpenAPI](/openapi.json) — machine-readable schema va misollar.
- [Postman](/postman.json) — so‘rovlar to‘plami.

API kalit va webhook secretni briefga yozmang. Agentga muhit o‘zgaruvchisi nomi yetadi.
# Provider arizasini bosqichma-bosqich tayyorlash

Hisob va email tasdiqlangach, biznes nomi va kamida bitta to‘g‘ri telefon, Telegram username yoki email kiriting. Keyingi bosqichda public HTTPS API Base URL va provider serveringiz tekshiradigan credential kerak. Bo‘sh Base URL endi avtomatik sandbox yaratmaydi. API tayyor bo‘lmasa, AI Kit va OpenAPI orqali backendni tayyorlang; demo uchun alohida Sandbox bo‘limidan foydalaning.

Logo uchun HTTPS rasm manzilini kiriting yoki PNG/JPG/WebP fayl yuklang (5 MB gacha). Portal rasmni 384px gacha kichraytiradi; 96 KB chegarali raster data URL mavjud `logoUrl` maydonida saqlanadi. Logo ixtiyoriy.

API sozlamalarini saqlash → sertifikatlash → review tartibida davom eting. Ma’lumot yoki credential o‘zgarsa, qayta saqlash va sertifikatlash kerak; qadam havolasi yoki saqlangan brauzer drafti bu tekshiruvni chetlab o‘tmaydi.
