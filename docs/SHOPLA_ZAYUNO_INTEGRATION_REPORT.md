# Shopla ↔ Zayuno universal provider integratsiyasi — yakuniy hisobot

**Sana:** 2026-09-12  
**Holat:** pushga tayyor, production konfiguratsiyasi talab qilinadi  
**Push:** bajarildi — Zayuno `851c4a7`, Shopla backend `12b3253`, Shopla seller panel `fa3d054`  
**Deploy:** ushbu taskda bajarilmadi

## Natija

Shopla'da moderatsiyadan o'tgan sotuvchi seller paneldagi bitta tugma bilan do'konini Zayuno review va certification jarayoniga yubora oladi. Shopla katalog, narx, variant, qoldiq, buyurtma va payment holati uchun haqiqat manbai bo'lib qoladi. Zayuno provider review/certificationdan o'tmaguncha do'konni mijozlarga nashr qilmaydi.

Yakuniy oqim:

1. Seller **Zayunoga ulanish** tugmasini bosadi.
2. Shopla do'kon uchun barqaror `shopla-<shopId>` slug va serverdan-serverga API key yaratadi.
3. Shopla imzolangan partner sync orqali Zayunoda `DRAFT / PENDING_CERTIFICATION` provider yaratadi yoki mavjudini yangilaydi.
4. Zayuno admin provider contractini tekshiradi, certification ishlatadi va keyin nashr qiladi.
5. AI katalogni qidiradi, haqiqiy qoldiq va yetkazish bo'yicha 15 daqiqalik quote oladi.
6. Foydalanuvchi tasdiqlagach Shopla omborni band qiladi, bitta idempotent order yaratadi va Payme checkout URL qaytaradi.
7. Payme server callback'i Shopla orderini `PAID` qiladi; Zayuno `GET /actions/:id` orqali `CONFIRMED` holatini oladi.

## Production uchun yopilgan himoyalar

- Quote MongoDB'da TTL bilan saqlanadi. Action faqat o'sha provider, mahsulot, miqdor, filial va manzil uchun olingan quote bilan yaratiladi.
- Action oldidan narx, qoldiq va yetkazish qayta hisoblanadi. O'zgarish bo'lsa yangi quote va qayta tasdiq talab qilinadi.
- Idempotency do'kon miqyosida MongoDB unique partial index bilan himoyalangan; boshqa payload bilan bir xil key `409` qaytaradi.
- Payment konfiguratsiyasi mijoz yaratish, ombor band qilish va order yozishdan oldin tekshiriladi.
- Payme merchant/secretlar koddagi fallbacklardan olib tashlandi. Seller API key frontendga qaytarilmaydi.
- Partner sync secret majburiy va constant-time solishtiriladi. Shop ID/slug egaligi, revision va ruxsat etilgan Shopla originlari tekshiriladi.
- Sync xatosi saqlanadi va background retry ishlaydi. Eski revision yangi holatni bosib ketmaydi.
- Disconnect yangi quote/orderlarni to'xtatadi, mavjud action va payment statusini o'qish imkonini saqlaydi.
- Certification quote va action uchun bir xil input, `quantity: 1` va UUIDv4 idempotency key ishlatadi.

## O'zgargan qismlar

### Zayuno

- `apps/api/src/modules/providers/providers.controller.ts`
- `apps/api/src/modules/providers/providers.service.ts`
- `packages/provider-sdk/src/certification.ts`
- `.env.example`
- `tests/test-shopla-zayuno-e2e.ts`
- `docs/SHOPLA_ZAYUNO_INTEGRATION_ARCHITECTURE.md`
- `docs/SHOPLA_ZAYUNO_INTEGRATION_AGENT_PROMPT.md`

### Shopla backend

- `src/modules/zayuno-provider/*`
- `src/modules/shops/shops.service.ts`
- `src/modules/shops/shops.controller.ts`
- `src/modules/shops/schemas/shop.schema.ts`
- `src/modules/orders/schemas/order.schema.ts`
- `src/common/interceptors/transform.interceptor.ts`
- `src/config/index.ts`
- `src/app.module.ts`
- `.env.example`
- `scripts/seed-e2e-shop.js`

### Shopla seller panel

- `src/features/settings/ZayunoConnectionSection.jsx`
- `src/api/shops.js`
- `src/pages/SettingsPage.jsx`

## Tekshiruv dalillari

- Shopla Zayuno provider + seller ulanish testlari: **21/21 PASS**.
- Payme CreateTransaction, receiver split, idempotent callback va PerformTransaction: **2/2 PASS**.
- Zayuno provider certification guardlari: **PASS**.
- Zayuno provider operation guardraillari: **PASS**.
- `@zayuno/provider-sdk` TypeScript build: **PASS**.
- `@zayuno/api` Nest build: **PASS**.
- Shopla `brend-market` Nest build: **PASS**.
- Shopla `brend-admin` Vite production build: **PASS**.
- Avvalgi real local Shopla + MongoDB + Zayuno adapter oqimi: **18/18 PASS**. Unda health → catalog → quote → action → Payme URL → status → cancel va stock release tekshirilgan. Keyingi hardening o'zgarishlari yuqoridagi unit, payment integration va build tekshiruvlari bilan qayta tekshirildi.

Test paytidagi Telegram/MinIO loglari tashqi test konfiguratsiyasiga tegishli; Payme testlari muvaffaqiyatli o'tdi. Mongoose mavjud sxemalardagi duplicate-index warninglarini chiqardi, ammo test natijasiga ta'sir qilmadi.

## Deploy konfiguratsiyasi

Ikkala backendda bir xil kuchli random qiymat:

- `ZAYUNO_PARTNER_SECRET`

Shopla backend:

- `ZAYUNO_API_URL=https://<zayuno-api-host>`
- `SHOPLA_PUBLIC_API_URL=https://<shopla-api-host>`
- `PAYME_MERCHANT_ID`
- `PAYME_MERCHANT_KEY`
- `PAYME_SHOPLA_RECEIVER_ID`
- kerak bo'lsa `PAYME_DELIVERY_RECEIVER_ID`

Zayuno backend:

- `SHOPLA_PARTNER_ORIGINS=https://<shopla-api-host>`

Deploydan keyin MongoDB yangi quote TTL va shop-scoped idempotency indexlarini yaratishi kerak. Eski duplicate idempotency qiymatlari bo'lsa, index creation logini tekshirish kerak.

## Chegara

Kod Payme checkout URL va Payme server callback/status oqimini tekshiradi. Production merchant bilan haqiqiy pul yechish bu lokal testda bajarilmadi; uni sandbox yoki kichik real tranzaksiya bilan deploydan keyingi smoke testda tasdiqlash kerak.
