# Deferred tasks

## Before the next production deploy

- [ ] Fix the Mock EVOS sandbox checkout state machine so a cancelled order can
  never transition to `PAID` or `CONFIRMED`.
  - [x] Reject `simulate-success` after `CANCELLED` (and other terminal states).
  - [x] Reject cancellation after a terminal state.
  - [x] Hide or disable checkout controls that are invalid for the current state.
  - [x] Add regression coverage for `AWAITING_PAYMENT -> CANCELLED` followed by a
    payment attempt; the payment attempt must fail and the action must remain
    `CANCELLED` with `PENDING` payment status.
  - [x] Run the Mock EVOS E2E regression test locally after verification.
  - [ ] Deploy and run the sandbox E2E test against the deployed environment.

> Current evidence: the earlier live sandbox exercise reproduced the invalid
> `CANCELLED -> PAID/CONFIRMED` transition. The local implementation and
> regression test now reject it, but the task remains open until the same E2E
> scenario passes against the deployed `evos-sandbox.shopla.uz` service.

> This affects only the Mock EVOS sandbox. No real payment was processed.

## Before opening provider self-service onboarding publicly

- [x] Prevent provider impersonation and unreviewed publishing.
  - [x] Every new self-service provider starts as `DRAFT`; never as
    `ACTIVE`/discoverable.
  - [x] Require an authenticated provider account and record its ownership of the
    provider record.
  - [x] Require certification, review submission, and an internal/manual approval
    step before a self-service provider becomes `PUBLISHED`.
  - [x] Tighten MCP discovery so legacy `ACTIVE` records also require canonical
    `APPROVED + isPublished + isCertified` metadata before being returned.
  - [x] Reserve and protect recognised brand names/slugs:
    - Maintain a normalized reserved-brand registry containing canonical names,
      aliases, transliterations, domains, and protected slug patterns.
    - Block or hold exact and confusingly similar applications such as `evos`,
      `e-vos`, `ev0s`, and `official-evos`.
    - Never auto-reject a legitimate edge case: route brand-like matches to
      manual review with an audit reason.
    - Reserved brandni ochish hozircha public self-service orqali mumkin emas;
      faqat Operations alohida kelishuv asosida keyin qo‘shishi mumkin.
    - Add unit tests for normalization, homoglyph/lookalike detection and
      reserved slugs.
  - [x] Add abuse controls: rate limiting, audit trail, report/takedown workflow,
    and alerts for brand-like names.
  - [x] Add tests proving an unverified provider cannot be published or discovered
    through MCP.

> A public registration form alone is not provider verification. This is needed
> to prevent brand impersonation and spam before external onboarding is opened.

### Later — provider business ownership verification

- [ ] Domain/DNS, business document yoki signed API challenge orqali haqiqiy
  brand egasini tasdiqlash oqimini keyingi bosqichda loyihalash. Bu hozirgi
  sprint scope’iga kirmaydi; unga qadar reserved brandlar public registration
  orqali ochilmaydi.

## Product initiative: Zayuno Integration Studio

- [ ] Build an assisted provider-integration flow with the product promise:
  **"Integrate your business with AI in 30 minutes."**
  - Let a verified provider submit an API documentation URL or upload an
    OpenAPI specification (JSON/YAML).
  - Fetch and validate the specification safely; keep provider credentials
    private and never execute arbitrary instructions from documentation.
  - Analyse endpoints and propose a Provider Contract mapping, for example:
    - `GET /products` -> `get_catalog`
    - `POST /checkout/calculate` -> `quote_order`
    - `POST /orders` -> `create_action`
    - `GET /orders/{id}` -> `get_action`
    - `POST /orders/{id}/cancel` -> `cancel_action`
  - Generate an editable integration draft: authentication mapping, request and
    response transformations, location/catalog/quote/action endpoints, webhook
    configuration, and provider-owned checkout handoff.
  - Run sandbox certification and contract tests against the provider's test
    environment; show each result and failure clearly.
  - Require the verified provider owner to review and explicitly confirm the
    generated mapping before it can be enabled or submitted for review.
  - Keep the integration in `DRAFT`/`SANDBOX` until certification and platform
    approval succeed; never auto-publish a generated integration.
  - Preserve test logs, mapping revisions, approval history, and rollback
    capability for auditability.

> This is an assisted integration workflow, not permission for Zayuno to
> autonomously create live provider actions or publish a provider.

## Productize the existing Provider Starter CLI

- [ ] **Starter CLI — aslida mavjud, ammo mahsulot sifatida tugallanmagan.**
  Mavjud CLI va Express/FastAPI/Go starterlarini yangi boshidan yozmasdan,
  tashqi developer bemalol topib, o‘rnatib va ishlata oladigan mahsulotga
  aylantirish.
  - Public package nomi, versiyalash va release jarayonini yakunlash.
  - Bir qatorli install/init oqimini berish (`npx ...` yoki ekvivalent).
  - `readonly` va `transactional` profillar uchun interaktiv generator qo‘shish.
  - Generatsiyadan keyin local contract validation va certification smoke-test
    ishga tushirish.
  - Portal, Documentation, OpenAPI va AI Integration Kit ichidan CLI’ga aniq
    kirish nuqtalarini qo‘shish.
  - Toza muhitda install → generate → run → validate oqimini CI’da tekshirish.
  - Starter ichida real secret, production URL yoki fake provider data
    bo‘lmasligini release gate bilan tekshirish.

> Bu yangi CLI yaratish vazifasi emas. Repo ichidagi mavjud CLI imkoniyatlarini
> discoverable, publishable va support qilinadigan developer mahsulotiga
> aylantirish vazifasi.

## AI Agent Chat Simulator for Provider Testing

- [ ] Portal ichidagi Live Inspector va Certification imkoniyatlarini real
  chat asosidagi AI agent simulyatori bilan kengaytirish.
  - Provider o‘z servisini mijoz ko‘zi bilan tabiiy tilda sinay olsin: xizmatni
    topish, katalogni ko‘rish, parametrlarni aniqlashtirish, quote olish,
    tasdiqlash, action yaratish va statusni kuzatish.
  - Har bir chat javobi qaysi MCP tool/provider endpointini chaqirgani bilan
    Live Inspector trace’iga bog‘lansin.
  - Request/response, HTTP status, latency, validation xatosi va redacted
    payload bir timeline ichida ko‘rinsin.
  - AI uydirma ma’lumot ishlatmasin; faqat provider qaytargan canonical
    ma’lumotni customer-facing ko‘rinishda taqdim etsin.
  - Sandbox va production muhiti aniq ajratilsin; simulator hech qachon
    production action yoki haqiqiy to‘lovni tasodifan ishga tushirmasin.
  - Provider muvaffaqiyatsiz suhbatni certification reproducer yoki supportga
    yuboriladigan redacted diagnostic bundle sifatida eksport qila olsin.
  - Read-only va transactional profillar uchun tayyor chat ssenariylari hamda
    providerning o‘zi yozadigan custom test promptlari bo‘lsin.

> Maqsad: provider o‘z integratsiyasini faqat API testlari bilan emas, AI
> foydalanuvchisi qanday ko‘rishi va ishlatishi nuqtayi nazaridan ham tekshira
> olishi.

## End-of-project: Provider Health Incident Notifications

- [ ] Avtomatik provider health monitoring va vaqtincha discovery’dan yashirish
  mexanizmi barqaror ishlagach, provider hamda Operations uchun incident
  notification tizimini loyiha yakunida qo‘shish.
  - Provider ketma-ket health-check xatolaridan so‘ng `DOWN` holatiga o‘tganda
    bir marta xabar yuborish; har bir tekshiruvda takroriy spam yubormaslik.
  - Provider qayta barqaror ishlay boshlaganda `RECOVERED` xabarini yuborish.
  - Email asosiy kanal bo‘lsin; keyinchalik Telegram va provider webhook kanallari
    opt-in sifatida qo‘shilishi mumkin.
  - Xabarda provider nomi, muhit, hodisa boshlangan vaqt, oxirgi tekshiruv va
    xavfsiz qisqa sabab bo‘lsin; token, credential, request body, mijoz ma’lumoti
    yoki ichki stack trace yuborilmasin.
  - Notification preference, cooldown, deduplication, acknowledgement va incident
    history boshqaruvi bo‘lsin.
  - Notification yuborilmay qolishi provider health state, discovery visibility,
    auto-recovery yoki asosiy buyurtma oqimini bloklamasin.
  - DOWN → DEGRADED/RECOVERING → HEALTHY flapping holatlari uchun hysteresis va
    cooldown testlari yozilsin.

> Hozirgi sprintga kirmaydi. Bu vazifa health monitor, vaqtincha discovery hiding
> va auto-recovery productionda ishonchli ishlagandan keyin bajariladi.

## Future product ideas: AI-native business discovery + action network

### Product positioning

- [ ] Evolve the long-term positioning from an action-only platform toward:
  **"Zayuno makes businesses discoverable and usable through AI."**
- [ ] Use a three-layer product model:
  1. **Discover** — find businesses, products, services, locations, availability.
  2. **Decide** — filter, compare, recommend, and quote.
  3. **Act** — order, book, pay, and track when the provider supports it.

### Capability-based providers

- [ ] Support two provider modes:
  - **Discovery provider:** structured business/service/product information;
    may only return results and links.
  - **Action provider:** supports transactions such as ordering, booking,
    payment handoff, and status tracking.
- [ ] Make all capabilities independently declared rather than requiring a
  full commerce implementation: `DISCOVERY`, `CATALOG`, `SEARCH`, `QUOTE`,
  `ORDER`, `PAYMENT`, `BOOKING`, `DELIVERY`, `STATUS`.
- [ ] Examples to validate later:
  - Doctor: `DISCOVERY + BOOKING`
  - Florist: `DISCOVERY + CATALOG + ORDER`
  - Shopla seller: `CATALOG + ORDER + PAYMENT + STATUS`
  - Non-transactional business: discovery data plus an external contact/shop
    link only.

### AI-visible business profiles

- [ ] Explore a paid business profile/listing model, potentially around
  **$10/month**, with structured name, categories, services, price range,
  experience, location, delivery coverage, hours, contacts, verification, and
  photos.
- [ ] Validate intent-based search examples such as a nearby experienced doctor
  under a consultation budget, or a flower bouquet under a delivery-inclusive
  budget.
- [ ] Differentiate from a general map listing through structured filtering,
  intent matching, recommendation, and optional action execution.

### Vertical and partnership roadmap (ideas only)

- [ ] Start go-to-market with **food + local commerce**; keep the architecture
  vertical-agnostic.
- [ ] Evaluate **Shopla seller -> Zayuno -> AI client** integration as an early
  second vertical. A seller with order APIs can support actions; otherwise
  Zayuno returns discoverable products and the seller's shop link.
- [ ] Later evaluate discovery-heavy verticals: florists, beauty salons,
  doctors, repair/services, and hotels.
- [ ] Keep merchant analytics as a separate possible product line, **Zayuno for
  Merchants**, rather than mixing it into consumer discovery initially:
  sales, SKU performance, stockout risk, conversion, and returns insights via
  explicitly authorised seller APIs.

> Strategy note: prioritise one narrow, real integration wedge before expanding
> into multiple verticals. These are product hypotheses, not committed scope.

## Future information architecture: public site, developer docs, provider portal

- [ ] Keep the public-facing responsibilities clearly separated as the product
  grows:
  - `zayuno.uz` — public landing, SEO content, product positioning, and public
    discovery entry points.
  - `developers.zayuno.uz` — API documentation, Provider Contract,
    Integration Studio, sandbox, certification, and technical onboarding.
  - `portal.zayuno.uz` or `partners.zayuno.uz` — provider operations: incoming
    actions/orders, catalog, locations, analytics, team access, billing, and
    operational settings.
- [ ] Until provider volume and roles justify a dedicated operations subdomain,
  keep this as a clearly named **Provider Portal** area inside
  `developers.zayuno.uz`, with navigation such as Overview, Integrate,
  Operations, Analytics, and Settings.
- [ ] When separating the portal, preserve existing documentation URLs and add
  redirects/navigation so technical integrators and business operators have a
  clear path without breaking links.

## Future product idea: visual catalog discovery and rich client UI

- [x] Extend the normalized catalog contract to support provider-supplied product
  media: HTTPS image URLs, alt text, ordering, thumbnails, optional aspect
  ratio, and safe fallback imagery (`MediaItemSchema`, `SafePublicHttpsUrlSchema`, `sortOfferingMedia`).
- [x] Validate, proxy or safely render external media as appropriate; prevent
  unsafe URLs, broken images, excessive payloads, and misleading product media (`SafePublicHttpsUrlSchema` security rules).
- [ ] Keep MCP responses universally usable: structured product data plus
  text/table/image-link fallback for clients that do not support custom UI.
- [ ] Build an optional Zayuno rich shopping/discovery UI for supported clients
  and the web experience:
  - responsive product cards and image galleries/carousels;
  - mobile-first grids and horizontal scrolling where appropriate;
  - search, category, budget, location and availability filters;
  - product detail, variants/add-ons, comparison, and quote handoff;
  - accessible loading, empty, error, and image-fallback states.
- [ ] Preserve a clear separation: MCP remains the universal data/action layer;
  the rich client UI is an optional presentation layer and must not be required
  to complete an action safely.

## Strategic review: Baxo stress-test xulosalari (2026-08)

> Tashqi holisona baholash natijalari. Bu yerda faqat actionable fikrlar.

### Supply-side risk — #1 prioritet (10/10)

- [ ] Supply-side riskni 8/10 dan **10/10** ga ko'tarish kerak. Bu texnik risk emas,
  bu **asosiy biznes riski**. Providerlar ulanmasa, Zayuno bo'sh katalog.
- [ ] Kodlashdan oldin **kamida 1-2 real providerdan "ha" olish** kerak:
  - Railway: Oson Pochta API + Sahiy Express hub access → rasmiy partnershipsiz
    impossible.
  - Hotel: lokal kichik hotellar (20-30 ta) qo'lda parse qilinishi mumkin,
    Booking.com API muammoli.
  - Restaurant: phone call API yoki custom webhook — og'ir.
  - Shopla/Uzum sellers: API yoki inventory sync kerak.
- [ ] MVP uchun "bor deb hisoblash" emas, **"qila olamiz deb isboti"** kerak.

### Execution timeline — haqiqiy baho (9/10)

- [ ] Har bir provider integratsiyasi uchun **6-9 oy minimal**, 3 oy emas:
  - API complexity: har bir provider 2-3 API + fallback logic.
  - Data sync: real-time availability = polling + caching + TTL strategy.
  - Error handling: railway delay → rebooked hotel → restaurant notification
    chain.
  - Testing: 100+ scenario'ni cover qilish kerak.

### GO / NO-GO validation signallari (tartib bo'yicha)

- [ ] **Signal 1:** 1 provider qo'shilish (railway YA restaurant) — test
  integratsiya (3-4 oy).
- [ ] **Signal 2:** 5-10 user "orders" — retention meter (ular yana qayt
  oladimi?).
- [ ] **Signal 3:** Provider: "okeyish bizga analytics + inventory kerak" — moat
  signal (network effect boshlandi).
- [ ] Faqat uchala signal bo'lgandan keyin **"GO++"** deyish mumkin.

### Shopla vs. Zayuno positioning — strategic decision

- [ ] **Hozir:** Shopla'ni prioritize qilish. Zayuno'ni 6-8 oydan keyin ishga
  tushirish.
- [ ] Shopla'dan technical foundation olish: provider schema, form fill,
  booking logic.
- [ ] **Tavsiya etilgan model:** Shopla = Zayuno'ning birinchi provideri,
  keyin multi-provider orchestration qo'shiladi.

### Hybrid distribution strategiya

- [ ] ChatGPT MCP directory birinchi kanal (yaxshi), lekin yagona bo'lmasin:
  - Plugin approval 1-2 hafta (compliance review).
  - Distribution = faqat ChatGPT Plus subscribers.
- [ ] **Parallel kanallar:** Telegram bot + Uzum app mini-program + SMS bot.
- [ ] Platform dependency'ni kamaytirish uchun Zayuno native mini-app loyihasi.

### Qayta baholangan ratinglar

| Metrika | Ichki baho | Tashqi baho | Delta |
|---------|-----------|-------------|-------|
| Texnik feasibility | 9/10 | 8/10 | API integration underestimated |
| User value | 8/10 | 8/10 | ✓ |
| Originality (global) | 4/10 | 5/10 | Form + orchestration + Uzbek = 5 |
| Uzbek opportunity | 8/10 | 9/10 | Monopoly window bor |
| Moat potential | 8/10 | 7/10 | Network effect 3 yildan keyin |
| Execution difficulty | 8/10 | 9/10 | Supply pipeline underbayed |

### Kuchli tomonlar (tasdiqlangan)

- **Discover → Decide → Act framework** haqiqiy va to'g'ri abstraktsiya.
- **Form-filling use case** genuinely defensible: 20-field form → AI dialog =
  conversion 30-40% ortadi (60-70% checkout drop kamaytirish).
- **Merchant-side AI moat** imkoniyati bor: analytics + sell + discover →
  recurring revenue.
- **Central Asia monopoly window** haqiqiy: local commerce network + Uzbek
  language + payment bilan birinchi bo'lish ustunligi.

### Nihoyat xulosa

> **GO+, lekin network tasdiqlanguncha "wow" demi.**
> Supply risk > technical risk. Ish boshlashdan oldin Oson Pochta + 1-2
> restaurant/clinic'dan "ha" olish kerak.

## Aniqlangan joriy muammolar

### 1. Developer Portal (`developers.zayuno.uz`) kirish va autentifikatsiya muammosi
- [x] Saytga kirganda barcha ommaviy bo‘limlar (Overview, Docs, Sandbox) public/protected zone ajratilishi orqali ochiq (`apps/provider-portal/src/App.tsx`).
- [x] Login oynasida yangi dasturchilar yoki mehmonlar uchun ro‘yxatdan o‘tish (Sign Up / Register) formasi mavjud.
- [x] Ommaviy bo‘lishi kerak bo‘lgan dokumentatsiya va arxitektura ma’lumotlari ro‘yxatdan o‘tmagan tashqi dasturchilar va hamkorlar uchun to‘liq ochiq.

#### Provider registration journey — savolsiz, bosqichma-bosqich oqim

> Provider application form already exists after login. The missing part is a
> clear public entry path, account creation/verification, and an explicit status
> journey before and after that form.

- [x] Public sahifada aniq `Provider bo‘lish` CTA va `Qanday ishlaydi?` sahifasi:
  talablar, kerakli API endpointlar, xavfsizlik talablari, jarayon bosqichlari,
  taxminiy review vaqti va sandbox/production farqi.
- [x] `Account yaratish -> emailni tasdiqlash -> provider application`
  oqimini yaratish; mavjud provider owner loginiga tabiiy ravishda olib kirish (`EmailVerificationService` with persistent DB tokens).
- [x] Application wizard bosqichlarini aniq ajratish:
  1. Business profile va support kontaktlari.
  2. Brand/slug tanlash va reserved-brand tekshiruvi.
  3. API base URL, auth usuli va capability tanlash.
  4. Endpoint mapping va credentiallarni bir marta xavfsiz ko‘rsatish.
  5. Sandbox testlari va certification natijalari.
  6. Reviewga yuborish va Operations qarorini kuzatish.
- [x] Har bir status uchun foydalanuvchiga keyingi qadamni ko‘rsatish:
  `DRAFT`, `CERTIFICATION_FAILED`, `READY_FOR_REVIEW`, `PENDING_APPROVAL`,
  `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- [x] Success va error holatlari uchun aniq matn, field-level validation,
  credentialni qayta ko‘rib bo‘lmasligi haqida ogohlantirish va downloadable
  onboarding checklist qo‘shish.
- [x] Journey E2E testi: yangi tashqi provider account yaratishdan boshlab
  `DRAFT -> certified -> review -> approved/discoverable` holatigacha; shu bilan
  birga unverified provider discoveryga chiqmasligini isbotlash (`tests/test-provider-onboarding-journey.ts`, `tests/test-http-boundary-regression.ts`).

### 2. Interactive Sandbox Action Simulator muammosi
- [x] Simulator bosqichlaridagi barcha API so‘rovlari (`/find`, `/quotes`, `/actions`, `/webhooks`) to‘g‘ri autentifikatsiya va credentiallar bilan muvaffaqiyatli ishlaydi (`tests/test-sandbox-simulator-e2e.ts`).
- [x] Frontend kodida API javobi muvaffaqiyati (`res.ok`) tekshiriladi va xatoliklar aniq ko‘rsatiladi.
- [x] Webhook simulyatsiyasi bosqichida backenddagi HMAC-SHA256 tekshiruviga mos keluvchi haqiqiy imzo hisoblanadi.

## Yangi strategik va texnik vazifalar (Prioritet)

### 3. AI Discovery: Bo‘sh yoki yopiq providerlarni AI’dan yashirish (Smart Filtering)
- [x] `find_providers` va `list_providers` chaqirilganda, katalogi/mahsulotlari bo‘sh (`offerings: []`) bo‘lgan, filialsiz yoki vaqtincha xizmat ko‘rsatmayotgan providerlarni AI agentga qaytarmaslik (`isProviderDiscoveryReady`).
- [x] AI agent faqat `status === 'ACTIVE' && metadata.reviewStatus === 'APPROVED' && metadata.isPublished === true && metadata.isCertified === true` bo‘lgan providerlarni ko‘rsin; bo‘sh/unready providerlar AI uchun butunlay ko‘rinmas (invisible) bo‘lsin (`isProviderPublished` canonical gate).
- [x] Readiness qoidalarini capability-aware qilish:
  - `LOCATIONS` capability e’lon qilgan yoki fizik filialga bog‘liq delivery, pickup, booking provider uchun kamida bitta faol location talab qilinadi.
  - Digital service, remote consultation, online recruitment yoki faqat discovery provider uchun filial talab qilinmaydi.
- [x] Centralized Reserved Brand Registry & Protection: `EVOS`, `UZUM`, `YANDEX`, `KORZINKA`, `PAYME`, `CLICK`, `OSON`, `ZAYUNO` va boshqa brendlar uchun homoglyph/lookalike/alias himoyasi (`RESERVED_BRAND_PROTECTED`), internal operations onboarding yo‘li saqlangan.

### 4. Unmet Demand Aggregator: Mijozlar talablarini yig‘uvchi analitika tizimi
- [x] Foydalanuvchilar AI orqali qidirgan, lekin Zayuno’da hali mavjud bo‘lmagan xizmatlar, mahsulotlar va hududlarni (`unmet_demand`) avtomatik log qilib borish.
- [x] Admin panelda eng ko‘p so‘ralayotgan yetishmovchiliklar reytingini (Top Missing Services / Categories / Locations) ko‘rsatuvchi analitika bo‘limi yaratish.
- [x] Yangi providerlar bilan shartnoma tuzishda real foydalanuvchi talablariga tayanish (masalan: 1-o‘rinda poyezd chiptasi, 2-o‘rinda 24/7 dorixona, 3-o‘rinda gul yetkazish).

### 5. Live Provider API & Payload Inspector (Jonli tekshiruv va Debugger)
- [x] Developer Portal va Admin panelda har bir so‘rov (`GET /actions/:id`, `GET /catalog`, `POST /quotes`, `POST /webhooks`) nima jo‘natayotgani va nima qaytarayotganini bittalab ko‘rish uchun Live Inspector (Payload Debugger) yaratish.
- [x] Provider dasturchilari o‘z API’larini ulaganda xatoliklarni, field nomuvofiqliklarini va status o‘zgarishlarini jonli JSON ko‘rinishida tekshira olsin.
- [x] Inspector va operational log xavfsizligini yakunlash:
  - [x] Admin operational events va export javoblarida password, secret, token,
    API key, card/CVV/OTP, telefon, email, customer va address maydonlarini
    `[REDACTED]` bilan almashtiruvchi redaction mavjud.
  - [x] Eski/raw `/admin/logs/integration` va `/admin/logs/webhooks` endpointlari
    ham ayni redactor orqali javob qaytarsin; raw Prisma yozuvini to‘g‘ridan-to‘g‘ri
    clientga bermasin.
  - [x] Imkon qadar sensitive qiymatlarni bazaga yozishdan oldin redakt qilish yoki
    faqat allowlist qilingan diagnostika maydonlarini saqlash.
  - [x] Nested object, array, header, free-text token, telefon/email va eksportlar
    uchun regression testlar qo‘shish.

### 6. Customer Support & Escalation Channels (Mijozlar uchun Support va Bog‘lanish kanallari)
- [x] Har bir provider metadata va action javobida mijozlar qo‘llab-quvvatlash xizmati kontaktlarini (`supportContact`: telefon raqami, Telegram username/bot, email, ish vaqti, supportUrl, locale) standartlashtirib qaytarish (`StructuredSupportContactSchema`, `normalizeSupportContact`, `sanitizePublicSupportContact`).
- [ ] AI agent uchun qo‘llab-quvvatlash mantiqi va ko‘rsatmasi: agar mijoz "buyurtmam kelmadi", "kechikmoqda", "ovqat sovuq", "bekor qilmoqchiman" yoki shikoyat qilsa, AI agent darhol tegishli providerning rasmiy support kontaktlarini (telefon, Telegram, email) taqdim etsin va mijozni to‘g‘ri operatorga yo‘naltirsin.
- [x] Action status va timeline javoblarida bevosita mijoz qo‘llab-quvvatlash xizmati bilan bog‘lanish maydonlarini (`supportContact`) uzatish.

### 7. Developer FAQ & Troubleshooting Guide (Integratsiyadagi ko‘p uchraydigan muammolar qo‘llanmasi)
- [x] Dokumentatsiyaga va Developer Portalga `14. Troubleshooting & Developer FAQ` bo‘limini kiritish:
  - **CORS va Preflight:** Developer Portal / Sandbox simulyatoridan so‘rov yuborilganda `Access-Control-Allow-Origin` va `Access-Control-Allow-Headers` sozlamalari.
  - **HMAC Signature Mismatch:** Webhook imzosini hisoblashda `rawBody` (asl JSON matni)dan foydalanish va whitespace/formatting xatolarining oldini olish.
  - **Latency va Timeout cheklovlari:** AI agentlarning 15–30 soniyalik kutish limitiga mos ravishda provider API’lari 1–2 soniya ichida javob qaytarishi zarurligi.
  - **Kotirovka matematikasi (Quote Math):** `subtotal + fees - discount == total` formulasi bo‘yicha har bir tiyinning qat’iy mos kelishi.
  - **Idempotency kafolati:** Takroriy `idempotencyKey` kelganda yangi buyurtma ochmasdan avvalgi natijani qaytarish (mijozdan ikki marta pul yechishni oldini olish).
  - **HTTPS & SSL sertifikati:** Faqat rasmiy CA sertifikatiga ega bo‘lgan xavfsiz `https://` endpointlarni qabul qilish talabi.

### 8. Future Vertical: Job Search & Recruitment Integration (hh.uz / Ish va Xodim qidirish)
- [ ] Zayuno platformasiga `RECRUITMENT` / `JOB_SEARCH` toifasini kiritish va standartlashtirish:
  - **`SEARCH`**: Maosh, tajriba, ko‘nikmalar (skills), shahar va masofaviy/gibrid rejimi bo‘yicha vakansiyalarni qidirish.
  - **`CATALOG` / `OFFERINGS`**: Vakansiya talablari, kompaniya ma’lumotlari, maosh chegaralari.
  - **`FORM_FILL` / `APPLY`**: Nomzodning rezyumesi va kontaktlarini biriktirib vakansiyaga avtomatik ariza topshirish.
  - **`ACTION_STATUS`**: Ariza holatini kuzatish (`APPLIED` &rarr; `VIEWED` &rarr; `INVITED` &rarr; `REJECTED`).
- [ ] AI foydalanuvchilari uchun: *"Menga Toshkentda 10-15 mln oylikli Python dasturchi ishini topib, rezyumemni yuborishga tayyorla"* kabi tabiiy tildagi talablarni orkestratsiya qilish.
- [ ] Ish beruvchilar (HR / Recruiter AI) uchun: talablar asosida nomzodlar bazasidan eng moslarini saralab berish.

### 9. Future Vertical: AI Co-Founder & Talent Matchmaker (Startapchilar va Hammuassislarni topish)
- [ ] Dasturchilar, dizaynerlar va startapchilar uchun AI-Native mutaxassis profillarini yaratish va o‘zaro moslashtirish (Matching) tizimi:
  - **`SEARCH`**: Semantik chuqur qidiruv — texnologik stek (Next.js, Flutter, NestJS, Python/AI), soha tajribasi (Fintech, Medtech, AI, E-commerce), qiziqqan roli (CTO, Lead Dev, Co-founder), ulush (equity) yoki maosh shartlari.
  - **`CATALOG` / `OFFERINGS`**: Dasturchi/mutaxassis profili, portfolio, GitHub loyihalari, tajriba darajasi va bandlik holati (full-time, part-time).
  - **`ACTION_CREATE` / `INTRO`**: "Intro Request" (Tanishuv so‘rovi) — asoschi tomonidan startap g‘oyasi va shartlari bilan birga yuboriladigan taklif.
  - **`NEXTACTION` / `BOOKING`**: Cal.com yoki Google Meet orqali bir zumda tanishuv video-qo‘ng‘irog‘ini (Call) belgilash havolasi.
- [ ] Asoschilar (Founders) uchun: *"Bizga Medtech sohasida Flutter va NestJS biladigan, Toshkentdagi equityga ishlaydigan CTO / Co-founder topib ber"* kabi tabiiy talablarni tahlil qilib, eng mos 2–3 ta nomzodni tavsiya qilish.
- [ ] Dasturchilar uchun: spam xabarlarsiz, faqat o‘z shartlariga 100% mos keladigan jiddiy startap loyihalaridan takliflar olish (AI Agent filtri).

### 10. Future Vertical: Freight & Cargo Logistics Integration (Yuk tashish va Logistika platformalari)
- [ ] Zayuno platformasiga `FREIGHT_LOGISTICS` / `CARGO` toifasini kiritish va standartlashtirish:
  - **`LOCATIONS` / `ROUTING`**: Yuk ortish manzili &rarr; Yetkazish manzili (koordinatalar, shahar/viloyatlararo masofa hisobi).
  - **`QUOTE`**: Yuk vazni (kg/tonna), hajmi ($m^3$), transport turi (Labo, Porter, Gazel, Isuzu, Fura/TIR), yuk ortuvchi (gruzchik) xizmati va sug‘urta bo‘yicha aniq kotirovka hisoblash.
  - **`ACTION_CREATE`**: Haydovchiga buyurtma yuborish, yuk ortish vaqtini belgilash va dispetcher tizimi orqali transportni band qilish.
  - **`ACTION_STATUS` / `LIVE_TRACKING`**: Real-vaqtda status kuzatuvi (`TRUCK_ASSIGNED` &rarr; `LOADED` &rarr; `IN_TRANSIT` [Live GPS havola] &rarr; `DELIVERED`).
  - **`PAYMENT`**: Payme/Click yoki yuridik shaxslar uchun hisob-faktura (Invoys) orqali to‘lov handoff.
- [ ] AI foydalanuvchilari uchun: *"Toshkentdan Farg‘onaga 800 kg tovarim bor, ertaga soat 10:00 da olib ketadigan Porter yoki Labo top va narxini ayt"* kabi logistika ehtiyojlarini orkestratsiya qilish.
- [ ] Logistika hamkorlari integratsiyasi: BTS Express, Oson Pochta, Fargo Express, EMU, Starex, shahar ichi yuk agregatorlari (Yandex Cargo/Labo) va viloyatlararo yuk terminallari API/Webhooklari bilan bog‘lanish.
