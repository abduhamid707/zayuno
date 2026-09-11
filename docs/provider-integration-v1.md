# Provider Integration v1

Zayuno provider API’dagi katalog, narx va actionlarni normalized contract orqali ishlatadi. Hozirgi mahsulot fokusi food ordering; umumiy contract boshqa kategoriyalar uchun ham kengaytirish imkonini beradi.

## Architectural boundaries

| Mas’ul tomon | Source of truth |
| --- | --- |
| Provider | Mahsulot ID, katalog, narx, mavjudlik, quote, fulfillment va provider checkout |
| Zayuno | Suhbat, discovery, tanlov, confirmation gate, action orchestration va provider status monitoringi |
| Mijoz | Yakuniy buyurtma tasdig‘i |

LLM narx yoki mavjudlikni uydirmasligi kerak. Buyurtmadan oldin amaldagi quote va mijoz tasdig‘i talab qilinadi. Retry yangi buyurtma yaratmasligi uchun idempotency key saqlanadi.

## Transaction lifecycle

~~~text
Intent → Discovery → Selection → Quote → Confirmation → Action → Fulfillment
~~~

- Intent — foydalanuvchi xohlagan natija.
- Discovery/selection — haqiqiy catalogdan ID va variant tanlash.
- Quote — server hisoblagan narx, fees, discounts, expiry.
- Confirmation — mijoz shu shartlarni tasdiqlaydi.
- Action — providerga idempotent yaratish so‘rovi.
- Fulfillment — provider statusi, webhook va kerak bo‘lsa checkout handoff.

## Integration surfaces

Provider o‘z HTTPS endpointlarini beradi. Har bir canonical request, response va yo‘nalish [generated Provider API reference](/docs/contract-reference/) va [OpenAPI](/openapi.json) orqali olinadi.

Zayuno Core management API boshqa surface: [Core API reference](api-reference.md). Provider Base URL’ga Core route’larni ko‘chirib qo‘ymang.

## Payment boundary

**ZAYUNO DOES NOT PROCESS PAYMENTS.** Joriy contractda provider to‘lov sahifasini nextAction orqali qaytaradi. Zayuno mijozni o‘sha sahifaga yo‘naltiradi; karta ma’lumotlarini qabul qiladigan provider checkout’ining o‘rnini bosmaydi.

Dashboarddagi paymentStatus provider xabariga asoslanadi (PROVIDER_REPORTED). Uni mustaqil bank settlement tekshiruvi deb ko‘rsatmang. [Payment handoff](payment-handoff.md).

## Provider lifecycle

DRAFT — sozlash; SANDBOX — test; ACTIVE — nashr qilingan; SUSPENDED — to‘xtatilgan; DISABLED — o‘chirilgan provider. Status o‘tishlarida API mavjud guardlarni qo‘llaydi.

Certification (metadata.isCertified) va review (metadata.reviewStatus) provider statusdan alohida. CERTIFIED va REVIEW provider status enum qiymatlari emas. [Nashr jarayoni](certification.md).

## Version va moslik

Contract v1.0.0 manbasi packages/contracts/src/provider-protocol.ts va Zod schema’lar. Yangi integratsiyalar canonical field nomlarini ishlatadi; legacy aliaslar faqat adapter migration boundary’da.

Hujjat va kod farqlansa schema, adapter va test bilan aniqlashtiring. [AI agent workflow](ai-agents.md) shunday tekshiruvga yo‘naltiradi.
