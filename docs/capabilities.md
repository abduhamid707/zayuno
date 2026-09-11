# Capability profillari

Capability provider bajara oladigan operatsiyani bildiradi. U mahsulot kategoriyasi yoki provider type bilan bir xil narsa emas. Contract versiyasi: 1.0.0.

## Profil bo‘yicha talablar

| Capability | DISCOVERY_READONLY | TRANSACTIONAL | Provider route yoki yo‘nalish |
| --- | --- | --- | --- |
| METADATA | Talab qilinadi | Talab qilinadi | GET /provider-info |
| HEALTH | Talab qilinadi | Talab qilinadi | GET /health |
| CATALOG | Talab qilinadi | Talab qilinadi | GET /catalog; GET /offerings/:id |
| QUOTE | Yo‘q | Talab qilinadi | POST /quote |
| ACTION_CREATE | Yo‘q | Talab qilinadi | POST /actions |
| ACTION_STATUS | Yo‘q | Talab qilinadi | GET /actions/:id |
| WEBHOOK | Yo‘q | Talab qilinadi | Provider → Zayuno: POST /api/v1/webhooks/:providerSlug |
| LOCATIONS | Fulfillment’ga qarab | Fulfillment’ga qarab | GET /locations |
| SEARCH | Ixtiyoriy | Ixtiyoriy | GET /search |
| ACTION_CANCEL | Yo‘q | Ixtiyoriy | POST /actions/:id/cancel |
| PAYMENT_OPTIONS | Yo‘q | Ixtiyoriy | GET /actions/:id/payment-options |

Faqat mavjud imkoniyatlarni e’lon qiling. Capability e’lon qilinsa uning response schema’si ham tekshiriladi. [Generated reference](/docs/contract-reference/) har bir endpointning aniq request va response formatini beradi.

## Faol location qachon kerak?

DELIVERY, PICKUP, ONSITE va HYBRID fulfillment faol location talab qiladi. REMOTE uchun avtomatik location talabi yo‘q.

Fulfillment belgilanmagan bo‘lsa type bo‘yicha default ishlatiladi: DELIVERY → DELIVERY; RETAIL va BOOKINGS → ONSITE; boshqa type’lar → REMOTE. Aniq fulfillment berish afzal.

Physical biznes LOCATIONS’ni e’lon qilmasdan bu talabni chetlab o‘ta olmaydi. Metadata’dagi branch soni emas, GET /locations response’idagi faol locationlar tekshiriladi.

## Contract bilan moslashtirish

Backend implementation manbalari: packages/contracts/src/provider.ts va provider-protocol.ts. Runtime validation shu contractlarga tayanadi.

1. Kerakli profil va fulfillment’ni tanlang.
2. Portal va GET /provider-info’dagi capabilitylar bir-biriga mos bo‘lsin.
3. [OpenAPI](/openapi.json) orqali endpoint schema’larini tekshiring.
4. Test muhitida [certification](certification.md) bajaring.
5. Konfiguratsiya o‘zgargandan keyin qayta certification qiling.
