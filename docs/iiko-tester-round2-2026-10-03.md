# iiko tester 2: tuzatish va review yozuvi

2026-10-03. Boshlang‘ich production commit: `b9fa3ea`. Review va release uchun tayyorlangan tuzatishlar; deploy dalili TASKS.mdda qayd qilinadi.

## Delivery coverage

Oldingi guard faqat `allowedItems` bo‘sh va rejection yo‘q bo‘lganda konfiguratsiyani tekshirgan. iiko manzilni geocode qilib, bo‘sh kartografiyada ham terminal va default duration qaytarganda quote `VERIFIED` bo‘lgan.

Yangi kod har quote uchun iiko konfiguratsiyasini o‘qiydi. Tanlangan tashkilot/filialga tegishli nomli hudud konfiguratsiyasi bo‘lmasa `DELIVERY_COVERAGE_NOT_CONFIGURED` qaytaradi. So‘ng `isAllowed=true`, tanlangan filial va konfiguratsiyadagi hudud nomi mos bo‘lishi kerak. Polygon mavjud bo‘lsa koordinata uning ichida yoki chegarasida bo‘lishi ham tekshiriladi. Default delivery duration va geocode o‘zicha coverage dalili bo‘la olmaydi.

Nomli restriction va manual address zone uchun iiko’ning mos hudud nomini qaytarishi talab qilinadi. Nomsiz/default restriction geografik tasdiq sifatida olinmaydi. Konfiguratsiya bo‘sh yoki selected branchga mos nomli hudud yo‘q bo‘lsa order yaratilmaydi.

Create bosqichi eski quote yoki quote chiqarilgandan keyin o‘zgargan hudud uchun yana tekshiradi. Oldin qabul qilingan deterministik order ID topilsa, reconciliation davom etadi. Yangidan yuboriladigan orderga tekshirilgan koordinata uzatiladi.

Rasmiy schema tekshirildi: [iiko Cloud OpenAPI](https://api-ru.iiko.services/api-docs/docs). `location` geocoding koordinatasi; `allowedItems.zone` nullable; sozlangan polygon va restrictionlar alohida response’da.

## MCP telefon schema

Handwritten tool definition va production `GET https://mcp.zayuno.uz/tools`da `customer.phone` avvaldan mavjudligi tasdiqlandi. Tester ko‘rgan field yo‘qligini shu endpointda takrorlay olmadik; cached connector schema ehtimoli tekshirilmagan.

SDK registration converter avval nested objectni `z.record(z.any())`, arrayni `z.array(z.any())`ga aylantirib, ichki fieldlarning tasvirini yo‘qotgan. Endi nested properties va array item schema recursively saqlanadi. `customer.phone` tavsifi, destination city/region/country/postalCode/coordinates va universal locations address bir xil ko‘rinishda e’lon qilinadi. Ob’ektda schema’da ruxsat etilgan qo‘shimcha fieldlar oldingi kabi saqlanadi.

Haqiqiy SDK Client + InMemoryTransport `tools/list`dan telefon fieldini ko‘rdi va schema orqali tekshirilgan telefon/koordinatali quote inputni yubordi. Quote/create kontakt normalization o‘zgarmagan.

## Public quote va katalog

Shared `public-commerce.ts` API controller va MCP javoblarini aniq fieldlar ro‘yxatidan yig‘adi. Adapter, cache va DB ichki ma’lumotni saqlaydi. Public javobda `organizationId`, `terminalGroupId`, `iikoProductId`, internal coordinates, `etaSource`, terminal timezone, arbitrary `parameters`/metadata chiqmaydi. Variant va modifier option metadata ham olib tashlanadi; `FULL` yoki `select` bilan qayta ochib bo‘lmaydi.

Quote narx satrlari, variant/modifier identifikatorlari, fees/discounts, total/currency/expiry, talablari, provider supplied duration, payment method/instructions va active order warnings saqlanadi. Payment/warnings public top-level fieldlarga ko‘chirilgan. Quote presenter yangi va eski internal ko‘rinishni tushunadi.

Offering tanlov uchun zarur `id`, `offeringCode`, variant/option identifikatorlari saqlanadi. Ularning qiymati native product UUID bo‘lishi mumkin; tanlash uchun kerakli identifikatorlarni yashirish ushbu ishning maqsadi emas. Ichki IDlarning qo‘shimcha metadata nusxalari olib tashlangan.

## Tekshiruvlar

- Contracts/shared/provider-sdk/API/MCP build: PASS, 9 tasks.
- Mobile TypeScript: PASS.
- iiko reliability: PASS; timeout reconciliation, cash, status va qidiruv saqlangan.
- Native iiko adapter: 22/22 PASS.
- MCP contract: 11/11 PASS; HTTP barcha 15 tool va dirty response sinovlari.
- Yangi `test-iiko-delivery-public-boundary.ts`: PASS. Bo‘sh config/default rule, Tashkent/Samarqand/Nukus/Moscow/invalid manzil, null/unknown allowed zone, boshqa filial restrictioni, polygon tashqarisi, old quote create guard, public API/SDK javoblari, nested variants/options va select orqali metadata ochilmasligi tekshirildi.
- Umumiy review: 49/50 PASS, 121.72 soniya. `test-consumer-memory-personalization.ts` oldindan dirty bo‘lgan admin App.tsx ichida `Mijozlar nimani so‘rayapti` matnini kutgani uchun yiqildi. Shu fayl va mobile data-safety boshqa ishlarga tegishli; ular o‘zgartirilmadi. Butun review yashil deb aytilmaydi.
- Yakuniy SDK schema/coordinate qo‘shimchasidan keyin boundary suite qayta PASS; MCP build PASS.
- Live read-only: haqiqiy iiko `deliveryZones=0`, `restrictions=0`. Lokal yangi compiled adapter bilan Tashkent/Samarqand/Nukus/Moscow/invalid quote urinishlari barchasi `VALIDATION_ERROR / DELIVERY_COVERAGE_NOT_CONFIGURED` berdi. Katalog bir marta real o‘qilib, shu tekshiruv uchun adapterda qayta ishlatildi; configuration har safar real API orqali o‘qildi. Production quote/order yoki provider config yaratilmagan/o‘zgartirilmagan.

Umumiy review logi: Windows temp `zayuno-iiko-round2-review.log`.

## Keyingi review va tester qadami

Review bajarildi: selected branch/zone matching, manual zone behavior va create reconciliation tartibi tekshirildi. Nol maydonli polygon edge orqali tasdiqlanmasligi uchun qo‘shimcha guard yozildi; real polygon chegarasidagi manzil uchun musbat regressiya bor. Public quote requirements canonical schema orqali parse qilinadi; noma’lum nested ichki fieldlar ham olib tashlanadi. Narx, variant/modifier tanlovi, talablar, payment/warnings saqlanishi sinovda tasdiqlandi.

Workspace’da qolgan boshqa agentning admin/mobile ishlarini commitga qo‘shmasdan tekshirish uchun faqat `apps/admin/src/App.tsx` va `apps/mobile/play-store/data-safety-draft.md` o‘qishlari mavjud HEAD nusxalariga vaqtinchalik yo‘naltirildi. Avval yiqilgan consumer memory testi shu release nusxalari bilan PASS. Yakuniy barcha 50/50 review suite PASS (119.97 soniya), build 9/9 PASS. Release logi: Windows temp `zayuno-iiko-round2-release-review.log`. Ishchi fayllar o‘zgartirilmadi.

Selective push/deploydan keyin tester connectorni qayta ulab/tool schemani yangilab `customer.phone`ni tekshiradi. Bo‘sh konfiguratsiyada barcha besh manzil blocked bo‘lishi kerak. Operator haqiqiy delivery hududini sozlagach hudud ichidagi quote o‘tishi, tashqarisidagi quote rad etilishi tekshiriladi. So‘ng idempotency/parallel create, quote mutation, cancellation va status lifecycle stress testi bajariladi.
