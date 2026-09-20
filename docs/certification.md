# API tekshiruvi va universal sertifikatlash (v2 Strict)

Certification ulangan provider backendini universal Provider Contract v1 va Strict qoidalari bilan sinovdan o‘tkazadi. Bu oddiy namunaviy oqim emas, balki real xavfsizlik, narx matematikasi, invaryantlar va webhook yetib borishining avtomatlashtirilgan tekshiruvidir.

## 1. Test turlari va qayerda tekshiriladi?

| Vosita | Nima tekshiriladi | Natija nimani anglatadi |
| --- | --- | --- |
| Sandbox | Namunaviy providerda discovery → quote → action | Oqim qanday ishlashini tushunish uchun vizual simulyator |
| Certification v2 (Strict) | Siz sozlagan haqiqiy provider API | E’lon qilingan barcha capability, manifest va invaryantlarning to‘liq mosligi |
| Review | Ariza, v2 hisoboti va operatsion talablar | Jonli tizimga (ACTIVE) chiqarish bo‘yicha qaror |
| Inspector | Provider so‘rovlari va trace’lar | Har bir so‘rov va javobni tahlil qilish vositasi |

Transactional certification haqiqiy test buyurtmasi (action) yaratadi va providerdan imzolangan webhook kutadi. Backendda test katalog va xavfsiz test muhitini sozlang.

## 2. Universal Manifest talablari (`GET /provider-info`)

Zayuno har bir providerga bir xil qattiq talablarni (masalan, barchaga telefon yoki ism majburlashni) yuklamaydi. Provider o‘z talablarini `GET /provider-info` dagi `manifest` orqali e’lon qiladi:

1. **Xavfsiz test muhiti (Majburiy):**
   ```json
   "manifest": {
     "version": 1,
     "certification": {
       "safeTestEnvironment": true
     }
   }
   ```
   *Agar `manifest.certification.safeTestEnvironment: true` bo‘lmasa, strict certification xavfsizlik nuqtai nazaridan to‘xtatiladi.*

2. **Mijoz talablari (`customerRequirements`):**
   - Agar xizmat mijoz kontaktini talab qilmasa (masalan, digital API token): `"customerRequirements": {}`.
   - Agar faqat email kerak bo‘lsa (masalan, SaaS litsenziyasi): `"customerRequirements": { "email": "REQUIRED" }`.
   - Agar telefon va ism kerak bo‘lsa: `"customerRequirements": { "name": "REQUIRED", "phone": "REQUIRED" }`.

3. **Kirish rejimi (`requirements.QUOTE.inputMode` va `ACTION_CREATE.inputMode`):**
   - Katalog va offering asosida bo‘lsa: `"OFFERING"`.
   - Faqat parametrlar asosida bo‘lsa (masalan, kommunal to‘lovlar, hisob raqami): `"PARAMETERS"`. Bu holatda `"parametersSchema"` e’lon qilinishi shart.

4. **Namunaviy test parametrlari (`certificationInput`):**
   Provider certification runnerga test paytida qaysi namunaviy parametrlar (`customer`, `parameters`, `locations`) bilan so‘rov yuborish kerakligini ko‘rsatadi:
   ```json
   "certificationInput": {
     "customer": { "phone": "+998901234567" },
     "parameters": { "accountNumber": "ACC-123456" }
   }
   ```

## 3. Qat’iy tekshiruvlar va rad etish sabablarini ajratish

Certification testlari salbiy holatlarni (adversarial probes) yuborib, backendning to‘g‘ri rad etishini tekshiradi:

- **Noto‘g‘ri sabab bilan rad etish taqiqlangan (Rejection Reason Discrimination):**
  Yetishmayotgan majburiy maydon tekshirilayotganda backend aynan shu maydon xatoligi bo‘yicha 400 yoki 422 qaytarishi shart (`errorCode: 'VALIDATION_ERROR'` yoki field path ko‘rsatilgan holda). Agar backend begona sabab bilan (masalan, `QUOTE_EXPIRED`, `QUOTE_NOT_FOUND` yoki `ACTION_NOT_CONFIRMED`) rad etsa, test yiqiladi.
- **Idempotency kaliti to‘qnashuvi:**
  Bir xil `idempotencyKey` bilan o‘zgargan payload yuborilganda backend HTTP 409 statusi va `errorCode: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'` qaytarishi shart.
- **Quote amal qilish muddati (TTL):**
  Kotirovka kamida 5 soniya amal qilishi kerak, toki action yaratish probe'lari quote muddati o‘tib ketmasdan avval bajarilsin. Muddati o‘tgan quote bilan buyurtma berilganda 410 `QUOTE_EXPIRED` qaytishi kerak.
- **Faqat tasdiqlangan buyurtmalar (`userConfirmed: true`):**
  `userConfirmed: false` bo‘lgan so‘rovlar qat’iy rad etilishi shart (`ACTION_NOT_CONFIRMED`).

## 4. Webhook va buyurtma holati o‘tishi (DB Execution Evidence)

Transactional providerlar uchun lokal HMAC algoritmini bilish yetarli emas. Test action yaratilgach:
1. Provider backend Zayunoning webhook endpointiga imzolangan so‘rov yuborishi shart:
   `POST https://api.zayuno.uz/api/v1/webhooks/{providerSlug}`
2. Headerda `x-zayuno-signature` (HMAC-SHA256 hex digest) bo‘lishi lozim.
3. Event formati: `eventType: 'action.status_updated'`, `actionId` joriy test action ID'siga teng bo‘lishi shart.
4. Zayuno webhookni qabul qilib, bazadagi buyurtma statusini muvaffaqiyatli yangilashi (`isProcessed: true`) shart. Agar buyurtma bazada topilmasa yoki status o‘tmasa, certification rad etiladi.

## 5. Sertifikat versiyasi va eskirgan hisobotlar

- Faqat **`certificationVersion: 2`** va **`mode: 'STRICT'`** bo‘lgan hisobotgina "TAYYOR (PRODUCTION READY)" deb hisoblanadi.
- Eski (v1) yoki STANDARD hisobotlar Portalda `QAYTA SERTIFIKATLASH TALAB ETILADI (ESKI HISOBOT)` deb ko‘rsatiladi va moderatorga topshirish (`submit-review`) bloklanadi.

## 6. Xatoliklarni diagnostika qilish

Xato chiqsa, xatolik kodi va field path'ni tekshiring:
- `safeTestEnvironment`: Manifestda `certification: { safeTestEnvironment: true }` borligini tekshiring.
- `disallowed error code`: Majburiy maydon yetishmaganda quote expiry emas, validatsiya xatosi qaytaring.
- `webhook-delivery`: Provider action yaratilgandan so‘ng `/api/v1/webhooks/:providerSlug` ga `action.status_updated` webhook yuborganini tekshiring.
- Batafsil yechimlar: [Troubleshooting & FAQ](troubleshooting-faq.md).
