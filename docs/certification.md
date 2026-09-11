# API tekshiruvi va nashr

Certification ulangan provider adapterini Provider Contract v1 bilan solishtiradi. U frontenddagi namuna oqimini bosib chiqishdan farq qiladi.

## 1. Qayerda test qilasiz?

| Vosita | Nima tekshiriladi | Natija nimani anglatadi |
| --- | --- | --- |
| Sandbox | Namunaviy providerda discovery → quote → action | Oqim qanday ishlashini tushunasiz |
| Certification | Siz sozlagan provider API | E’lon qilingan capabilitylarning contractga mosligi |
| Review | Ariza, certification va operatsion talablar | Nashrga ruxsat bo‘yicha qaror |
| Inspector | Provider so‘rovlari va trace’lar | Xatoni topish uchun dalil |

Transactional certification test action yaratishi mumkin. Backendda test katalog va test fulfillment tayyorlang.

## 2. Talab qilinadigan tekshiruvlar

DISCOVERY_READONLY profili uchun METADATA, HEALTH va CATALOG. TRANSACTIONAL uchun qo‘shimcha QUOTE, ACTION_CREATE, ACTION_STATUS va WEBHOOK.

DELIVERY, PICKUP, ONSITE, HYBRID fulfillment’da faol LOCATIONS ham talab qilinadi. Ixtiyoriy capability e’lon qilinsa u ham tekshiriladi. [Capability matritsasi](capabilities.md).

Tekshiruvlar metadata, health, catalog, required schema, quote hisob-kitobi, action idempotency, status va webhook verification kabi talablarni profilga qarab bajaradi. Barcha providerlarga bir xil “7 endpoint” qoidasi yo‘q.

## 3. Ish tartibi

1. Mening biznesim sahifasida HTTPS base URL, auth va capabilitylarni saqlang.
2. API tekshiruvi sahifasida provider slug va konfiguratsiyani tekshiring.
3. Testni ishga tushiring: POST /api/v1/providers/:slug/certify.
4. Har bir xato uchun endpoint, field path, expected/received va trace’ni o‘qing.
5. Backendni tuzating, qayta ishga tushiring. AI Kit’ning certification vazifasiga xato konteksti ham qo‘shiladi.
6. Muvaffaqiyatdan so‘ng review holatini dashboardda tekshiring va arizani yuboring.

API manzili, auth yoki capability o‘zgarsa oldingi certification bekor bo‘lishi mumkin. O‘zgargan konfiguratsiyani qayta tekshiring.

## 4. Statuslarni chalkashtirmang

Provider status: DRAFT, SANDBOX, ACTIVE, SUSPENDED, DISABLED.

Certification alohida metadata.isCertified maydoni; CERTIFIED degan provider status yo‘q. Review alohida metadata.reviewStatus orqali kuzatiladi: masalan PENDING_APPROVAL yoki CHANGES_REQUESTED. Certification o‘tishi avtomatik ACTIVE bo‘lish degani emas.

## 5. Xato chiqsa

- 401: [API key va HMAC](authentication.md).
- Quote math yoki expiry: [Quote](quotes.md).
- Schema/field path: [Provider reference](/docs/contract-reference/).
- Timeout va networking: [Troubleshooting](troubleshooting-faq.md).
- Review’da requiredChanges: [Provider operations](provider-operations.md).

Test bajarilmaganda yoki server javobi olinmaganda “passed” deb belgilamang. Natijani haqiqiy report bilan tasdiqlang.
