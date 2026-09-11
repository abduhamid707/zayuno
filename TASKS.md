# Deferred tasks

## Joriy ish — provider portal UX va developer/agent docs, 2026-09-10

- [x] Portal navigation, onboarding, docs, AI kit va real API contractni audit qilish.
- [x] Tushunarli workspace: overview/dashboard, bitta aniq keyingi qadam, sodda navigation va responsive UI.
- [x] Developer docs: qidiruv, deep link, quickstart, endpoint/credential farqlari va troubleshootingni yangilash.
- [x] AI agentlar uchun kanonik machine-readable docs, copy/download handoff va discoverability.
- [x] Tegishli contract testlari, typecheck/build va desktop/mobile browser flow tekshiruvi (39/39 testlar o'tdi).
- [x] Yakuniy o'zgargan fayllar, dalillar va release holatini yozish.

## Joriy ish — Dashboard UI/UX va Developer Docs’ni super darajaga olib chiqish, 2026-09-11

- [x] Foydalanuvchiga nima bo'layotganini (v10 APK o'rnatilishi, portal audit va hozirgi holat) to'liq tushuntirib berish.
- [x] Provider Dashboard UI/UX ni "udar" darajaga chiqarish:
  - [x] Biznes egasi uchun: qulay, sodda, professional ko'rinish; aniq holat indikatorlari va bitta asosiy keyingi qadam.
  - [x] Dasturchilar uchun: API sozlamalari, credentiallar, webhook HMAC boshqaruvi, terminal cURL snippet va Live Inspector qulayligi.
  - [x] Buyurtmalar va KPI ko'rsatkichlari: zamonaviy SaaS kartalari, filtrlar va buyurtma detallari.
- [x] Dasturchilar va AI agentlar (Codex, Claude, ChatGPT, Cursor) uchun tajribani mukammallashtirish:
  - [x] AI Integration Kit: bir bosish bilan Claude, ChatGPT, Cursor uchun tayyor kontekst va prompt.
  - [x] `/llms.txt`, `/llms-full.txt`, `openapi.json`, `postman.json` eksportlarini boyitish va osonlashtirish.
- [x] Developer Docs’ni to'liq ko'rib chiqish va yangilash:
  - [x] Barcha contract o'zgarishlari, misollar (cURL, TS, Python), tayyor AI Agent promptlari va troubleshooting qo'llanmasini mukammal qilish.
  - [x] Docs qidiruv va ko'rinishini qulay, chiroyli va o'qishga zavqli qilish (tezkor chiplar: GET /health, POST /quote, Webhook HMAC, 401, AI Agent prompt, Idempotency).
- [x] Build, typecheck va 39/39 regression testlarni to'liq tekshirish va tasdiqlash (100% PASS).
- [x] O'zgarishlarni commit qilib origin/main ga push qilish.

**Scope:** `apps/provider-portal` va `docs/` arxitekturasi. Maqsad: biznes egasi o'z statusini va keyingi qadamini yaqqol tushunsin, dasturchi va AI agentlar (Claude, Codex, Cursor, ChatGPT) esa bir qarashda API contractini tushunib, tezkor integratsiya qila olsin.
**Holat:** Dashboard UI/UX modern SaaS darajasiga ko'tarildi. Shriftlar kattalashtirildi, zamonaviy gradient va kartalar qo'yildi. Dashboardda AI agent bilan 5 daqiqada integratsiya qilish banneri va Base URL uchun avtomatik cURL tekshirish terminali qo'shildi. DocsViewer'ga tezkor qidiruv chiplari o'rnatildi. Docs va AI Agent qo'llanmasiga (`docs/ai-agents.md`) to'g'ridan-to'g'ri nusxalab ishlatishga tayyor Claude Code/Cursor/Codex promptlari kiritildi.
**Tekshiruv:**
- `pnpm --filter @zayuno/provider-portal build` (`tsc --noEmit && vite build`) → **PASS** (5.88s, 0 xato).
- `pnpm exec tsx tests/test-provider-portal-docs.ts` → **PASS**.
- `pnpm test:review` (`tsx tests/run-all-review-tests.ts`) → **39 / 39 test suites PASSED** (100% clean pass).
**Keyingi qadam:** CI orqali avtomatik deployment monitoringi.

## Joriy ish — Pro System Health & Infrastructure Monitoring va AI Agent Incident Snapshot, 2026-09-11

- [x] Backend: `@zayuno/observability` paketida p95, p99, error rate va request rate hisoblash metodlarini kengaytirish.
- [x] Backend: `SystemHealthService` va `GET /api/v1/admin/system/health` endpointini yaratish:
  - [x] Hardware/OS: CPU %, RAM % (total, used, free), Node heap & RSS, Disk % (total, used, free), Uptime.
  - [x] Database: Postgres connection pool (total, active, idle, idle in transaction, max, latency).
  - [x] Cache & Messaging: Redis (status, latency, memory, clients), NATS (status, connected).
  - [x] API Network: p50/p95/p99 latency, error rate (15m window), requests/min.
  - [x] Zayuno Business & Ops: active orders, pending payment, failed/deadletter webhooks.
  - [x] Server-side 5 soniyalik kesh va zero-leak xavfsizlik (SUPER_ADMIN / ADMIN).
- [x] AI Agent Incident Snapshot Generator:
  - [x] Bitta bosishda to'liq tizimli diagnostika xulosasini tayyorlash: Health Score (0-100), Active Red Flags / Anomalies, Bottlenecks, Root Cause Hypotheses va Recommended Actions for AI.
  - [x] Claude, ChatGPT, Cursor, Codex uchun maxsus formatlangan Markdown nusxalash imkoniyati.
- [x] Admin UI (`apps/admin`):
  - [x] Sidebar'ga yangi `System Health & Infra` tabini qo'shish.
  - [x] Modern Pro UI: Tizim statusi (Normal, Warning, Critical), threshold badges, auto-refresh (5s, 10s, 30s, Pause), manual refresh.
  - [x] 1-Click "AI Agent uchun nusxalash" tugmasi va chiroyli toast.
  - [x] Subsystems & Container grid (API, Postgres, Redis, NATS, Action Orchestrator, Webhook Dispatcher).
  - [x] Real-time AI Diagnostic Insights panel.
- [x] Testlar va tekshiruv:
  - [x] Yangi `tests/test-admin-system-health.ts` testini yozish (metrics, cache, auth gate, AI snapshot formati).
  - [x] `pnpm test:review` (40 ta test suitlari) va typecheck/buildlarni to'liq o'tkazish (40/40 PASS).

**Scope:** `apps/api/src/modules/admin`, `@zayuno/observability`, `apps/admin/src/App.tsx`, `tests/test-admin-system-health.ts`.
**Holat:** Ish 100% yakunlandi. Production-grade tizim telemetriyasi, hardware (CPU/RAM/Disk), PostgreSQL connection pool, Redis, NATS, p50/p95/p99 kechikishlar, xatolik foizlari, va 1-bosishda AI agentlar (Claude Code, Cursor, Codex, ChatGPT) uchun mo'ljallangan incident snapshot generatori to'liq ishga tushirildi.
**O'zgargan fayllar:**
- `packages/observability/src/metrics.ts` — p50/p95/p99, error rate, request rate va HTTP status breakdown funksiyalari qo'shildi.
- `apps/api/src/modules/admin/system-health.service.ts` — to'liq hardware, DB pool, kesh, navbat, alertlar, 5s kesh va AI snapshot generatori.
- `apps/api/src/modules/admin/admin.module.ts` — `SystemHealthService` provayder va export sifatida ulandi.
- `apps/api/src/modules/admin/admin.controller.ts` — `GET /api/v1/admin/system/health` himoyalangan endpointi ochildi.
- `apps/admin/src/App.tsx` — "System & Infra" yangi bo'limi, KPI kartalari, subsystem matritsasi, auto-refresh va 1-click AI snapshot nusxalash tugmasi/toasti o'rnatildi.
- `tests/test-admin-system-health.ts` — maxsus 5 bosqichli test suiti yaratildi.
- `tests/run-all-review-tests.ts` — yangi test review ro'yxatiga kiritildi.
**Tekshiruv natijalari:**
- `pnpm --filter @zayuno/api build` -> **0 xato (PASS)**
- `pnpm --filter @zayuno/admin build` -> **0 xato (PASS)**
- `pnpm exec tsx tests/test-admin-system-health.ts` -> **PASS**
- `pnpm test:review` (`tsx tests/run-all-review-tests.ts`) -> **40 / 40 test suites PASSED (100% CLEAN)**.
**Keyingi qadam:** Foydalanuvchiga to'liq natijalarni ko'rsatish va istalsa commit qilish.

## Joriy ish — Onboarding Wizard gigant logo bugini tuzatish, 2026-09-11

- [x] `apps/provider-portal/src/OnboardingWizard.tsx`: `/logo.svg` ga o'lcham berilmagani (`brand-mark` klassi bo'shligi) sababli 512px bo'lib chiqayotgan logoni ixcham, chiroyli `w-11 h-11` (`/logo2.webp`) holatga keltirish.
- [x] Build va visual tekshiruv: `pnpm --filter @zayuno/provider-portal build` va regression testlar.
- [x] O'zgarishni tasdiqlash va foydalanuvchiga tushuntirish.

**Scope:** `apps/provider-portal/src/OnboardingWizard.tsx`.
**Holat:** Tuzatildi. Logo 44x44px (`w-11 h-11`) o'lchamiga keltirildi, border va shadow qo'yildi. Portal to'liq build bo'ldi va testlar muvaffaqiyatli o'tdi.

## Joriy ish — Onboarding Certification: LOCATIONS vs REMOTE Fulfillment Mode mosligi, 2026-09-11

- [x] `packages/provider-sdk/src/certification.ts`: tashqi API `/provider-info` da `fulfillmentMode` qaytarmasa ham Zayuno adapter konfiguratsiyasidagi `fulfillmentMode` (masalan, `REMOTE`) ni inobatga olish va `effectiveType` ni to'g'ri aniqlash.
- [x] `packages/provider-sdk/src/base-provider.ts` va `remote-http-adapter.ts`: `getConfig()` metodi qo'shildi va `getProviderInfo` da masofaviy API fulfillmentMode qaytarmasa adapter config'dan default olish ta'minlandi.
- [x] `apps/api/src/modules/providers/provider-registry.service.ts`: adapter instansiyasiga `fulfillmentMode` va `type` config hamda metadata sifatida aniq berilishi kafolatlandi.
- [x] Testlar yozish va tekshirish: yangi `tests/test-remote-certification-flow.ts` va `tests/test-provider-certification-guards.ts` ga testlar qo'shildi (Food Delivery + REMOTE rejimida LOCATIONS talab qilinmasligi, ONSITE/DELIVERY rejimlarida esa LOCATIONS talabi qat'iy saqlanishi).
- [x] Build va review testlari (41 ta test suiti) to'liq o'tishini tekshirish (100% PASS).
- [x] Foydalanuvchiga nima sababdan bo'lgani va qanday tuzatilganini tushuntirib berish.

**Scope:** `packages/provider-sdk`, `apps/api`, `tests/`.
**Holat:** Ish to'liq yakunlandi. Agar foydalanuvchi Zayunoda "Remote" fulfillment rejimini tanlagan bo'lsa (masalan, Food Delivery toifasida raqamli vaucher, yetkazishsiz masofaviy xizmat yoki o'zining masofaviy API'si bo'lsa), sertifikatlash moduli tashqi serverning `/provider-info` da fulfillmentMode qaytarmasligiga qaramasdan, Zayunoda tanlangan `REMOTE` rejimini hurmat qiladi va LOCATIONS testida nohaq FAIL bermaydi. Jismoniy yetkazib berish (DELIVERY/ONSITE) uchun esa LOCATIONS talabi xavfsiz holatda qat'iy saqlanib qoladi.
**O'zgargan fayllar:**
- `packages/provider-sdk/src/base-provider.ts` — `getConfig()` metodi qo'shildi.
- `packages/provider-sdk/src/remote-http-adapter.ts` — `getProviderInfo()` da tashqi API fulfillmentMode qaytarmasa config'dan `REMOTE` ni yuklash.
- `packages/provider-sdk/src/certification.ts` — `configuredFulfillmentMode` va `effectiveType` ni adapter config/metadata orqali o'qib, `requiresActiveLocations` da to'g'ri baholash.
- `apps/api/src/modules/providers/provider-registry.service.ts` — adapter factory ga `fulfillmentMode` va `type` ni to'g'ridan-to'g'ri uzatish.
- `tests/test-provider-certification-guards.ts` — adapter config'da REMOTE bo'lganda certification runner guardlarini tekshirish.
- `tests/test-remote-certification-flow.ts` — to'liq HTTP mock server bilan REMOTE oqimi testi.
- `tests/run-all-review-tests.ts` — yangi test suiti review ro'yxatiga qo'shildi.
**Tekshiruv natijalari:**
- `pnpm --filter @zayuno/provider-sdk build` -> **PASS (0 xato)**
- `pnpm --filter @zayuno/api build` -> **PASS (0 xato)**
- `pnpm --filter @zayuno/provider-portal build` -> **PASS (0 xato)**
- `pnpm exec tsx tests/test-provider-certification-guards.ts` -> **PASS**
- `pnpm exec tsx tests/test-remote-certification-flow.ts` -> **PASS**
- `pnpm test:review` (`tsx tests/run-all-review-tests.ts`) -> **41 / 41 test suites PASSED (100% CLEAN)**.
**Keyingi qadam:** Foydalanuvchiga to'liq javob qaytarish.




## Product strategy — transaction network moat, 2026-09-10

- [x] Investor/product stress-testdagi barcha fikrlarni amaliy roadmapga ajratish.
- [x] Asosiy transaction invariantini saqlash: `Intent → Discovery → Selection → Validation → Confirmation → Action`; LLM hech qachon narx, mavjudlik yoki order holati uchun source of truth bo‘lmaydi.
- [ ] Tashqi positioningni food orderingga fokuslash: **“Zayunoga nima yemoqchi ekaningizni ayting — u topadi, savatni yig‘adi va tasdiqlashga tayyorlaydi.”** Universal platforma va boshqa vertikallarni hozir asosiy marketing va onboardingdan chiqarish.
- [ ] Food ordering tajribasini chuqurlashtirish: tabiiy so‘rov → mos real mahsulotlar → savat → authoritative quote → user confirmation → provider order → fulfillment status oqimini har asosiy providerda bir xil va ishonchli qilish.
- [ ] Har hafta asosiy KPI sifatida `successful_agentic_orders`ni yuritish; downloads, registrations va chat countni yordamchi metrika sifatida qoldirish.
  - [ ] Funnel: AI conversation → product selection → cart created → quote received → order confirmed → provider accepted → successfully fulfilled.
  - [ ] `intent_to_order_conversion`, `order_to_fulfillment_rate`, abandon bosqichi, vaqt va provider kesimidagi conversionni dashboardga chiqarish.
  - [ ] Avval real baseline o‘lchash, keyin haftalik target va alert chegaralarini belgilash.
- [ ] Demand moat yaratish: eng ko‘p so‘raladigan taom/providerlar, topilmagan so‘rovlar va abandoned cartlardan provider acquisition hamda katalog yaxshilash backlogini avtomatik shakllantirish.
- [ ] Provider moat yaratish:
  - [ ] Provider integratsiyasini standart schema, SDK/reference adapter, certification va sandbox bilan tez va arzon qilish.
  - [ ] Providerga Zayuno olib kelgan order, conversion, revenue, top demand va yo‘qotilgan talabni ko‘rsatadigan aniq ROI dashboard berish.
  - [ ] Real-time availability, narx aniqligi, order acceptance, cancellation, latency va fulfillment reliability uchun provider score/SLA monitoring qurish.
  - [ ] Kamida 3–5 real production provider bilan repeatable onboarding va order fulfillmentni isbotlash.
- [ ] Transaction/data moat yaratish: privacy va consent chegarasida conversion, product preference, price sensitivity, failed order sababi, substitution, cancellation va provider reliability signallarini transaction bilan bog‘lash.
- [ ] Agent infrastructure moatni chuqurlashtirish:
  - [x] Universal provider protocol, action orchestration va MCP tool foundation mavjud.
  - [ ] Zayuno’ni ChatGPT, Claude, Gemini va boshqa agentlar chaqira oladigan default action layer sifatida hujjatlashtirish va reference integrationlar tayyorlash.
  - [ ] Agent hamkorlar uchun discovery → quote → confirmation → action contract, idempotency, auth va observability bo‘yicha production SDK/DX yaratish.
  - [ ] Consumer appdan tashqari `Any AI Agent → Zayuno → Provider` orqali kelgan transactionlarni alohida o‘lchash va partner adoptionni oshirish.
- [ ] Defensibilityni kuchaytirish: katta AI platformalari providerlarni bevosita ulashiga qarshi ustunlikni `provider network + standardized transaction protocol + real-time inventory + orchestration + fulfillment reliability + transaction history` orqali amalda isbotlash.
- [ ] Yangi vertikal qo‘shish gate’i: food flowda barqaror conversion/fulfillment, real provider network va repeat usage isbotlanmaguncha booking yoki transportni public product scope’ga olib chiqmaslik; ichki universal arxitekturani saqlash.
- [ ] Har yangi feature oldidan tekshirish: u successful agentic orders, provider network yoki agent distributiondan kamida bittasini o‘lchanadigan tarzda oshiradimi; oshirmasa future backlogda qoldirish.

**Strategik qaror:** hozirgi asosiy vazifa yana ko‘p feature qo‘shish emas, food transaction networkni chuqurlashtirish. Consumer app demand yaratadi, provider platform real fulfillmentni standartlashtiradi, MCP/API esa boshqa AI agentlardan distribution olib keladi.
**Moat javobi:** Zayuno’ning himoyasi “bizda AI bor” emas. Himoya real provider aloqalari, bir xil va sertifikatlangan transaction contracti, real-time katalog/narx/mavjudlik, reliable orchestration, fulfillment tarixi va agentlar olib keladigan demand bir joyda to‘planishidir.
**Keyingi amaliy qadam:** production dashboardda agentic-order funnelning real baselineni chiqarish, eng ko‘p demand kelayotgan 3 provider bo‘yicha integratsiya/fulfillment gaplarini topish va birinchi real provider pilotini shu dalil bilan yopish.

### Prioritetli execution plan

- [ ] **P0.1 — Agentic-order funnel va baseline.**
  - **Dependency:** yagona transaction/conversation ID, provider ID, order state va event naming contract.
  - **Acceptance criteria:** `AI conversation → qualified intent → product selection → cart → quote → confirmation → provider accepted → fulfilled` bosqichlarining har biri transaction ID, source, provider, latency va standart failure reason bilan yoziladi; analyticsga raw chat yoki PII yuborilmaydi.
  - **KPI:** har bosqich conversion rate’i, p50/p95 latency, abandon rate va failure-reason ulushi; North Star — `successful_agentic_orders_per_week`.
  - **Done:** production dashboard real test orderni boshidan oxirigacha bir marta sanaydi, takroriy event/idempotent retry raqamni buzmaydi va order DB holati bilan reconciliation tekshiruvidan o‘tadi.
- [ ] **P0.2 — 3–5 real providerda liquidity va fulfillment isboti.**
  - **Dependency:** sertifikatlangan catalog/search/quote/action/status integratsiyasi, production credential va har providerda mas’ul aloqa.
  - **Acceptance criteria:** har providerda real katalog, availability, authoritative quote, confirmation, order create, status va cancellation ishlaydi; failure sabab kodlari bir xil contractga tushadi.
  - **KPI:** active providerlar, provider acceptance, successful fulfillment, catalog freshness, cancellation va p95 provider latency.
  - **Done:** kamida 3 production providerda repeatable end-to-end real order bajariladi; baseline o‘lchangach founder tasdiqlagan acceptance/fulfillment thresholdi ketma-ket 4 hafta ushlanadi.
- [ ] **P0.3 — Provider ROI va incremental value isboti.**
  - **Dependency:** Zayuno source attribution, provider order/revenue mapping va imkon bo‘lsa providerning boshqa kanal baseline’i.
  - **Acceptance criteria:** provider portal Zayuno’dan kelgan accepted/fulfilled orders, GMV/revenue, conversion, top demand va lost demandni ko‘rsatadi; “incremental” da’vosi baseline/holdout yoki provider tasdiqlagan taqqoslashga tayanadi.
  - **KPI:** incremental fulfilled orders, incremental GMV, provider conversion va provider retention.
  - **Done:** kamida 2 real provider dashboard raqamlarini o‘z orderlari bilan reconcile qiladi va Zayuno bergan o‘lchanadigan qo‘shimcha qiymatni tasdiqlaydi.
- [ ] **P0.4 — “Why Zayuno?” provider va user testi.**
  - **Dependency:** P0.1 funnel baseline va P0.2 real provider oqimi.
  - **Acceptance criteria:** provider uchun “nega integratsiya?”, user uchun “nega restoran appi o‘rniga Zayuno?” savollariga yozma hypothesis, test usuli va natija mavjud.
  - **KPI:** user time-to-valid-cart, intent-to-order conversion, repeat order rate; provider incremental orders/GMV va integration payback.
  - **Done:** real user/provider cohortida kamida bittadan o‘lchanadigan ustunlik tasdiqlanadi; tasdiqlanmagan hypothesis positioning yoki roadmapdan chiqariladi.
- [ ] **P1.1 — Provider Reliability Score v1.**
  - **Dependency:** P0.1 eventlar va yetarli real transaction sample’i.
  - **Acceptance criteria:** score faqat transaction-derived operational signal — acceptance, availability mismatch, quote/action failure, cancellation, substitution, latency va fulfillment — asosida hisoblanadi; oddiy user rating bilan aralashtirilmaydi va har score izohlanadi.
  - **KPI:** reliability score, availability mismatch, quote-to-fulfillment failure, substitution frequency va provider latency.
  - **Done:** formula/version hujjatlashtirilgan, admin/provider dashboardda sabablar bilan ko‘rinadi va kam sample’da `insufficient_data` qaytaradi.
- [ ] **P1.2 — Operational intelligence va demand loop.**
  - **Dependency:** P0 funnel, unmet-demand va privacy-safe transaction data.
  - **Acceptance criteria:** failed orders, tez tugaydigan mahsulotlar, substitutions, price sensitivity va provider gaplari haftalik action backlogga aylanadi.
  - **KPI:** takrorlangan failure kamayishi, recovered demand, catalog-gap yopilish va provider improvement rate.
  - **Done:** kamida bitta aniqlangan operational muammo tuzatiladi va keyingi cohortda KPI yaxshilangani o‘lchanadi.
- [ ] **P1.3 — Provider integration DX.**
  - **Dependency:** P0 real pilotlarda topilgan takroriy integration pain’lari.
  - **Acceptance criteria:** standard schema, reference adapter, sandbox, certification, webhook/idempotency va observability providerga mustaqil integratsiya yo‘lini beradi.
  - **KPI:** time-to-first-certified-transaction, certification pass rate va support touch soni.
  - **Done:** yangi provider production kodiga maxsus Zayuno branch qo‘shmasdan reference flow orqali sertifikatsiyadan o‘tadi.
- [ ] **P2.1 — Any AI Agent distribution.**
  - **Dependency gate:** P0.1–P0.4 bajarilgan, food liquidity/fulfillment barqaror va Provider Reliability Score ishlayapti. Ungacha bu North Star yoki asosiy sprint KPI emas.
  - **Acceptance criteria:** tashqi agent discovery → quote → confirmation → action oqimini bir xil contract orqali bajaradi; source attribution va support ownership aniq.
  - **KPI:** agent-sourced successful orders, conversion, fulfillment va integration adoption.
  - **Done:** kamida 2 tashqi AI surface production transaction yuboradi va ularning fulfillment sifati consumer app baseline’idan yomonlashmaydi.
- [ ] **P2.2 — Booking/transport kabi yangi vertikal.**
  - **Dependency gate:** food uchun founder belgilagan conversion, fulfillment, repeat usage va provider-network thresholdlari ketma-ket 4 hafta bajarilgan.
  - **Acceptance criteria:** yangi vertikal real demand va real provider pilotiga ega; food roadmap resursini buzmaydi.
  - **Done:** gate review yozma tasdiqlanadi; aks holda g‘oya future backlogda qoladi.

**Priority qoidasi:** P0 liquidity va provider ROI tugamasdan P2 agent distribution yoki yangi vertikal asosiy sprintga olinmaydi. “Data moat” atamasi faqat yuqoridagi operational intelligence real qaror yoki KPI yaxshilanishiga olib kelganda ishlatiladi.

## Joriy ish — tabiiy pizza/budjet so‘rovini actionga aylantirish, 2026-09-10

- [x] Reportdagi so‘rov nega exact-product fallbackga tushganini aniqlash.
- [x] Niyat, odam soni, kategoriya va budjetli so‘rovlarni katalog discovery/action oqimiga yo‘naltirish.
- [x] Xuddi shu report matni uchun regression test qo‘shish.
- [x] API typecheck va tegishli testlarni o‘tkazish.
- [x] Full review testlari: 38/38 suite o‘tdi.
- [x] Backend/mobile fixlarni commit qilib `origin/main`ga push qilish.
- [ ] CI orqali API deploy yakunini tasdiqlash; mobile fix uchun keyingi APK build/install kerak.

**Report:** `Bugun kechqurun 2 kishiga pizza kerak, 150 mingdan oshmasin.` so‘roviga katalogdagi aniq nomni qayta yozish talab qilingan. Kutilgan xulq: mavjud pizzalarni narx/budjet bo‘yicha topib, tanlanadigan katalog yoki aniq mos variantlar qaytarish.
**Tasdiqlangan sabab:** Gemini ayrim urinishda kategoriya/budjet so‘rovini `food_selection` deb qaytargan va butun gapni `itemRequests`ga joylagan. `startOrderSelection` uni exact mahsulot nomi deb qidirib, unmatched fallback bergan.
**Natija:** planner qoidasi aniqlashtirildi va deterministic backend guard qo‘shildi. Kategoriya + kishi/budjet so‘rovi `food_browse`ga o‘tadi, `itemRequests` tozalanadi, pitsa/pizza sinonimlari bilan live katalog qidiriladi va mavjud bo‘lsa budjetdan qimmat mahsulotlar chiqarilmaydi. Aniq `Pepperoni pizza 2 ta` kabi mahsulot esa `food_selection` bo‘lib qoladi. Report matni endi `catalog_menu` action/card interaction qaytarishi regressionda tasdiqlandi. `test-provider-cache-and-consumer-chat.ts`, API typecheck, `git diff --check` va full `pnpm test:review` (38/38, 70.33s) o‘tdi. O‘zgargan backend/test: `consumer-chat.service.ts`, `test-provider-cache-and-consumer-chat.ts`; oldingi mobile suggestion fix ham shu commitga kiritildi. Pushdan keyin backend CI orqali deploy bo‘ladi; mobile o‘zgarish qurilmaga yangi APK bilan kiradi.

## Joriy ish — bosh ekrandagi suggestionlar almashib ketishi, 2026-09-10

- [x] Birinchi va ikkinchi ko‘rinish qayerdan kelayotganini aniqlash.
- [x] Server suggestionlari yuklanayotganda noto‘g‘ri default ro‘yxatni ko‘rsatmaslik.
- [x] Mobile typecheck va diff tekshiruvi.
- [x] Mobile suggestion fixni backend fix bilan birga commit/push qilish.
- [ ] Yangi APK build/install qilish.

**Sabab:** `quickSuggestions` birinchi renderda `defaultSuggestions` bilan ochiladi; `/consumer/memory/suggestions` javobi kelgach personalized ro‘yxat bilan almashtiriladi. Shu sabab foydalanuvchi taxminan 1 soniya ichida ikki xil tanlovni ko‘radi.
**Maqsad:** birinchi paintda yolg‘on/default tanlovlarni chiqarmaslik; API natijasi bo‘lsa personalized ro‘yxatni, API ishlamasa default ro‘yxatni faqat yakuniy holat sifatida ko‘rsatish.
**Natija:** `quickSuggestions` endi `null` holatdan boshlanadi. Personalized so‘rov tugamaguncha eski default matnlar render qilinmaydi; list uchun 3 qatorlik joy oldindan band, shuning uchun hero ham sakramaydi. Success/empty/error holatlarida yakuniy ro‘yxat 3 ta bo‘ladi. `pnpm --filter mobile run typecheck` va `git diff --check` o‘tdi. O‘zgargan fayllar: `TASKS.md`, `apps/mobile/app/(app)/index.tsx`; pushdan keyin qurilmaga yetishi uchun yangi APK kerak.

## Joriy ish — v10 dan keyin ham qaytalangan login, 2026-09-10

- [x] Yangi PostHog auth hodisalari va qurilmadagi build/session holatidan aniq sababni topish.
- [x] Sababni tuzatish va uni takrorlaydigan regression testini qo‘shish.
- [x] API typecheck, auth regressionlar va full review: 38/38 suite muvaffaqiyatli o'tdi.
- [x] Fixni commit qilib `origin/main`ga push qilish; CI deployni shu commitdan boshlaydi (yangi APK kerak emas).
- [ ] Production image SHA, refresh HTTP 200 va USB telefonda sessiya saqlanishini tasdiqlash.
**Tasdiqlangan sabab:** ishlab turgan API (69f623b) logida 2026-09-10 07:37:57 va 07:57:47 UTC `/consumer/auth/refresh` 401 `Consumer account is unavailable`. Reportdagi akkaunt bazada faol SUPER_ADMIN. Google upsert mavjud rolni saqlaydi, refresh/getProfile esa faqat API_CONSUMER qabul qilgan. Tokenlar 15 daqiqadan keyin bekor bo‘lib mobile welcome’ga qaytgan. PostHog v10: 1 refresh_rejected va 1 no_stored_session. USB Samsung SM_A346E, versionCode 10 tasdiqlandi.
**O‘zgarish:** consumer-auth.service.ts da normal/recovered refresh va profile uchun role cheklovi olib tashlandi; active user, session ownership, expiry/revocation tekshiruvlari saqlangan. DB roli o‘zgarmaydi. Regression SUPER_ADMIN/PROVIDER_OWNER/consumer + disabled-user holatlari qo‘shildi, fixdan oldin SUPER_ADMIN refresh 401 bilan qayta ishlab berildi.
**Keyingi qadam:** shu regression + API typecheck, so‘ng mavjud CI orqali scoped API release va real qurilmada restart/refresh tekshiruvi. APK o‘zgarishi kerak emas: muammo serverda. Action tugmalarini qaytarmaslik.
**Checkpoint (limit uchun):** barcha yuqoridagi auth testlari va API tsc o'tdi. `pnpm test:review` YAKUNLANDI: 38/38 suite, exit 0, 88.33s; log `work/auth-role-review.log`. Eski exec session 57700 yakunlangan, qayta poll kerak emas. Push qilinadigan ish 3 faylda: TASKS.md, apps/api/src/modules/consumer/auth/consumer-auth.service.ts, tests/test-consumer-refresh-recovery.ts. Keyingi agent: main CI auto-release yakunini tekshirish; production image SHA va haqiqiy refresh HTTP 200 ni tasdiqlash. Immediate restart bilan cheklanmaslik: access token 15 daqiqadan keyin yangilanishi ham ishlashi kerak.
**Deploy:** `.github/workflows/build-images.yml` main pushdan build, `.github/workflows/deploy-production.yml` successful builddan auto deploy. SSH `root@158.220.100.58`, project `/root/zayuno`, container `zayuno-api`, hozirgi image yuqoridagi 69f623b SHA. DBdagi SUPER_ADMIN rolni o'zgartirmaslik; fix faol multi-role akkauntning consumer sessiyasini yangilaydi, ownership/expiry/revocation tekshiruvlari saqlangan. Sirlar yoki tokenlarni outputga chiqarmaslik.
**Telefon:** `D:/AndroidSdk/platform-tools/adb.exe`, serial RRCW5071L9F, Samsung SM_A346E, package uz.zayuno.mobile, versionCode 10. Oxirgi UI welcome/Google login. User USB testga ruxsat berdi. `adb shell am start -n uz.zayuno.mobile/.MainActivity`. App datani clear/uninstall qilmaslik. Yangi APK kerak emas. PostHog project 601107, auth_session_restore_failed va $app_build=10 orqali kuzatish. Action tugmalarini qaytarmaslik.

## Joriy ish — tasdiqlash/bekor qilish tugmalarini to'liq olib tashlash, 2026-09-10

- [x] Frontend: `ChatActionRow.tsx` komponentini olib tashlash, `app/(app)/index.tsx`, `api.ts`, `interaction.ts` dagi actionId va ChatAction qismlarini tozalash (savat animatsiyasi, card UI va boshqa qismlarga tegilmaydi; mobile tsc 0 xato).
- [x] Backend: `chat-actions.ts` ni olib tashlash, `consumer-chat.service.ts` va `consumer-chat.controller.ts` dagi actionId va action suggestions qismlarini tozalash (auth, memory, order logikasi saqlanadi; API tsc 0 xato).
- [x] Testlar: `test-consumer-chat-actions.ts` ni olib tashlash, `run-all-review-tests.ts` ni yangilash, barcha testlar va typecheck (`tsc --noEmit`) to'liq o'tishini tekshirish (38/38 test suite o'tdi).
- [x] Git commit va origin/main ga push qilish. (commit 69f623b, allaqachon bajarilgan)
- [x] zayuno-v10.apk build qilish va USB orqali telefonga o'rnatish. (2026-09-10, RRCW5071L9F, Success)
**Keyingi qadam:** Frontend va backenddan action tugmalarini xavfsiz olib tashlash va typecheck qilish.

## Oldingi ish — dinamik AI actionlar va savat animatsiyasi, 2026-09-10

- [x] Mavjud chat, buyurtma holati va animatsiya yo‘lini ko‘rib chiqish.
- [x] AI javobi/joriy holatga bog‘langan action contract; tasdiqlash va bekor qilishni eski buyurtmaga qo‘llamaslik.
- [x] Input ustida rasmdagidek ixcham primary/outline actionlar; bosish orqali keyingi xabarni yuborish.
- [x] Savatga uchish effektidagi ortiqcha render va o‘lchashlarni kamaytirish.
- [x] Qayta ochishda login sahifasiga tushish: PostHog hodisalari va native session restore/route guard sababini topib tuzatish (foydalanuvchi qayta xabar berdi).
- [x] Tegishli regression testlar va typecheck; bajarilgan va qolgan ishlarni qayd etish (39/39 review/regression testlar o'tdi).
- [x] Git commit va origin/main ga push qilish (backend va mobile).
- [x] zayuno-v9.apk build qilish va USB orqali telefonga o'rnatish (versionCode=9, Samsung Galaxy A34 5G ga o'rnatildi, ilova ishga tushirildi va ekran tasdiqlandi).
**Keyingi qadam:** Real qurilmada dynamic chat actionlar, optimallashgan savat animatsiyasi va auth session restore sinovi.
**Holat:** zayuno-v9.apk muvaffaqiyatli yig'ildi va USB orqali Samsung Galaxy A34 5G (RRCW5071L9F) qurilmasiga o'rnatildi (versionCode=9). Ilova muvaffaqiyatli ishga tushirildi (`phone_screenshot_v9_2.png` tasdiqlangan). Git repo `origin/main` bilan to'liq sinxron.

## Agentlar uchun davom ettirish holati — 2026-09-10

- [x] Product card va inputdagi savat UI ishi: foydalanuvchi boshqa AI agent
  davomini yakunlaganini tasdiqladi. Yangi so‘rovsiz bu ishni qayta boshlamaslik.
- [x] Ish boshlanishida checklist yozish va har bosqichdan so‘ng `[x]` / `[ ]`
  holatini yangilash qoidasi root `AGENTS.md`ga yozildi.

**Bu yangilanish:** faqat `AGENTS.md` va `TASKS.md`; ilova kodi o‘zgartirilmadi.
**Keyingi qadam:** navbatdagi foydalanuvchi vazifasi kelganda uning rejasini shu
faylga yozish va bajarilgan/qolgan ishlarni bosqichma-bosqich qayd etish.

## Founder reminder — overthinking nazorati

> Bu loyiha quruvchisi sifatida yangi feature, universal platforma va katta
> strategiyalarni o‘ylab, mavjud asosiy ishni tugatmasdan chuqurlashib ketishi
> mumkin. Har safar yangi katta g‘oya paydo bo‘lsa, avval so‘ra:
> **“Bu hozirgi sprintdagi eng muhim natijaga xizmat qiladimi?”**
> Agar javob yo‘q yoki noaniq bo‘lsa, uni Tasks.md’ga future idea sifatida yozib,
> hozirgi ishga qayt. Quraverishdan oldin real provider, real user yoki real
> business signal borligini tekshir. Hozirgi maqsad: scope’ni kengaytirish emas,
> tanlangan asosiy oqimni ishlaydigan va isbotlangan holatga olib kelish.

## Mobile release — Google Play production readiness

- [x] Zayuno mobil ilovasini Google Play’ga chiqarishga to‘liq tayyorlash.
  - [x] Google Play Developer Program Policies va target API talablariga moslikni
    tekshirish; release oldidan policy checklist yuritish.
  - [x] Production application ID/package name, version code/version name,
    Android App Bundle (`.aab`) va release signing/keystore jarayonini sozlash.
  - [x] App iconlarni Android adaptive icon talablariga mos tayyorlash:
    foreground/background layer, monochrome icon, launcher icon va Play Store
    uchun 512×512 yuqori sifatli icon.
  - [x] Splash screen, app nomi, ranglar, light/dark mode va turli Android ekran
    o‘lchamlarida brandingni tekshirish.
  - [x] Store listingni tayyorlash: qisqa/to‘liq tavsif, screenshots, feature
    graphic, support email/URL, privacy policy URL va kerakli lokalizatsiyalar.
  - [x] Data safety form, content rating, ads declaration, app access va account
    deletion talablarini ilovaning real xatti-harakatiga mos to‘ldirish.
  - [x] Faqat zarur Android permissionlarni qoldirish; permissionlar nima uchun
    kerakligini foydalanuvchiga tushunarli ko‘rsatish.
  - [x] Production API URL, network security, crash handling, offline/loading/error
    holatlari, accessibility va real qurilmalardagi smoke testlarni yakunlash.
  - [x] Internal testing → closed testing → production rollout bosqichlarini
    bajarish va Play Console pre-launch reportdagi barcha kritik muammolarni yopish.

## Customer memory and consent-based personalization

- [x] Kelajakdagi kuchli suggestionlar uchun foydalanuvchi xotirasi va
  personalization tizimini loyihalash va bosqichma-bosqich joriy qilish.
  - [x] Foydalanuvchi akkaunti, chat session, message, order/action tarixi,
    tanlovlar, yoqtirilgan provider/taomlar, faol vaqt oralig‘i va suggestion
    interactionlarini tenant/user bo‘yicha DB’da bog‘lab saqlash.
  - [x] Chatlarni yashirin profillashdan oldin aniq opt-in rozilik olish va
    foydalanuvchiga qaysi ma’lumot nima maqsadda ishlatilishini tushuntirish.
  - [x] Har 10 ta yangi chatdan keyin yoki yetarli yangi signal paydo bo‘lganda
    background summarization job ishga tushirish; barcha raw chatni doimiy ravishda
    modelga qayta yuborish o‘rniga yangi chatlar + avvalgi profile summary asosida
    inkremental yangilash.
  - [x] AI faqat mahsulot uchun zarur va dalilga tayangan maydonlarni chiqarsin:
    qiziqishlar, taom/provider afzalliklari, odatiy buyurtmalar, budjet diapazoni,
    faol vaqtlar, til/uslub preference va ishonchlilik darajasi.
  - [x] Kuchli suggestionlar uchun kamida ikki interaction daliliga tayangan
    behavior signallarini qo‘shish: tanlash usuli, narxga munosabat, yangi
    variantlarga qiziqish, javob formati va qisqa muddatli friction. Har birini
    confidence, evidence message IDs va alohida expiry bilan saqlash.
  - [x] Jins, xarakter, kayfiyat, nega ranjigan/xursand bo‘lgani kabi nozik yoki
    taxminiy ma’lumotni fakt sifatida saqlamaslik. Faqat foydalanuvchi o‘zi aytgan
    yoki aniq interactiondan chiqqan signalni manbasi, timestampi, confidence’i
    va expiry muddati bilan saqlash; product uchun zarur bo‘lmasa umuman yig‘maslik.
  - [x] Raw messages va derived profile’ni alohida saqlash; profile schema version,
    provenance/source message IDs, `lastUpdatedAt`, confidence va conflict
    resolution maydonlarini kiritish.
  - [x] Memory pipeline’da PII va maxfiy ma’lumotlarni minimallashtirish:
    payment/card/OTP/tokenlarni derived profilga kiritmaslik, raw chat matnini
    AES-256-GCM bilan shifrlash, telefon/manzilni AI promptlarida redakt qilish.
  - [x] Retention siyosati va avtomatik o‘chirish muddatlarini belgilash; userga
    “Men haqimda nimalarni bilasan?”, memory’ni tahrirlash, o‘chirish,
    personalizationni o‘chirish va barcha ma’lumotni eksport/delete qilish
    imkonini berish.
  - [ ] Release governance: AI provider bilan data processing shartlari, data residency, training
    opt-out va prompt/log retention sozlamalarini tekshirish; faqat kerakli
    minimal kontekstni yuborish.
  - [x] Suggestion sifati uchun feedback scoring va offline regression test qo‘shish; sensitive
    profiling, noto‘g‘ri inference, eski preference va filter-bubble holatlarini
    alohida regression testlar bilan tekshirish.
  - [x] Privacy policy, Google Play Data safety va account deletion oqimini real
    yig‘iladigan/saqlanadigan ma’lumotlarga mos yangilash.
  - [x] PostHog event taxonomy’ni memory, suggestion, chat latency, unmet demand,
    notification opt-in/out va admin demand monitoring oqimlariga ulash; raw
    prompt/chat va PII’ni analytics propertylardan chiqarish, user ID’ni backend
    eventlarda pseudonym qilish va session replay input/image maskingni yoqish.
  - [x] PostHog production dashboard, insight, funnel va retention viewlarini
    event taxonomy asosida yaratish (`Zayuno Product Intelligence`, 10 insight).

> Maqsad foydalanuvchini yashirin kuzatish emas, uning roziligi bilan foydali
> xotira yaratish. Personalization o‘chirilganda ilovaning asosiy buyurtma oqimi
> ishlashda davom etishi kerak.

## Authentication and persistent sessions

- [x] Auth oqimini barqaror qilish: foydalanuvchi o‘zi `Logout` qilmaguncha
  kundalik foydalanishda akkauntdan chiqib ketmasin.
  - [x] Bugungi login ertasi kuni yo‘qolishining sababini aniqlash: token TTL,
    refresh token rotation, secure storage, hydration race, app restart/background,
    server clock yoki 401 interceptor holatlarini trace qilish. Root cause: refresh
    sessiyalar faqat volatile Redis'da saqlangan va Redis yo‘qolganda logout bo‘lgan.
  - [x] Access tokenni qisqa muddatli, refresh token/sessionni uzoq muddatli qilish;
    access token expiry oldidan yoki 401’da single-flight silent refresh ishlatish.
  - [x] Refresh tokenni Android Keystore bilan himoyalangan secure storage’da
    saqlash; tokenlarni AsyncStorage, log, analytics yoki crash reportga yozmaslik.
  - [x] Refresh token rotation va reuse detection qo‘shish; parallel so‘rovlar
    bir-birining sessionini buzmasin va yangi refresh token atomik saqlansin.
  - [x] App cold start, update, process kill, offline → online, background →
    foreground va qurilma restartidan keyin sessionni xavfsiz tiklash.
  - [x] Vaqtinchalik network/server xatosini logout deb qabul qilmaslik; userga
    retry/offline holatini ko‘rsatish. Faqat revoked/expired refresh session yoki
    foydalanuvchining aniq Logout amali sessionni tugatsin.
  - [x] Logout’da local tokenlar va server sessionini bekor qilish; “barcha
    qurilmalardan chiqish” imkonini qo‘shish. Push token hali joriy etilmagan.
  - [x] Google Play account deletion talabiga mos ravishda ilova ichidan account
    delete oqimi va tashqi deletion URL yaratish; deletion logoutdan alohida va
    tushunarli bo‘lsin.
  - [x] Chat tarixini account bo‘yicha lokal saqlash va PostgreSQL bilan
    sinxronlash; logout yoki qayta login chatlarni o‘chirmasin.
  - [x] Auth/session/chat persistence uchun avtomatik regression contract testi
    va API/database/mobile build tekshiruvlari.
  - [ ] Release QA: Android real qurilmalarida 24+ soatlik session soak-test
    o‘tkazish va auth xatolarini maxfiy ma’lumotsiz monitoring qilish.


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

## Future product initiative: Zayuno Hosted Provider Dashboard (No-code)

- [ ] API yoki alohida dasturchisi bo‘lmagan kichik bizneslarni ham Zayuno
  tarmog‘iga ulaydigan no-code **Hosted Provider** rejimini yaratish.
  - Mavjud integratsiya yo‘lini saqlash: API’si bor bizneslar `Zayuno Connect`,
    API’si yo‘qlar `Zayuno Hosted` orqali ulansin.
  - Ikkala rejim ham ichkarida ayni canonical Provider Contract va capability
    modelidan foydalansin; MCP uchun alohida maxsus kontrakt yaratilmasin.
  - Biznes turi bo‘yicha boshqariladigan onboarding shablonlari bo‘lsin:
    `SERVICES/BOOKINGS`, food/delivery, retail/catalog va boshqa vertikallar.
  - Oddiy formalar orqali biznes profili, support kontaktlari, katalog yoki
    xizmatlar, narxlar, variantlar, filiallar, ish vaqti, xizmat hududi,
    availability va booking jadvali boshqarilsin.
  - Zayuno hosted runtime biznes nomidan canonical `/health`, `/catalog`,
    `/search`, `/quote`, `/actions` va `/actions/:id` imkoniyatlarini taqdim
    etsin; capability profiliga kirmaydigan endpointlar majburan ochilmasin.
  - Barcha kiruvchi buyurtma/bron/actionlar yagona operations dashboardga
    tushsin; biznes ularni qabul qilish, bajarish, bekor qilish va statusini
    yangilash imkoniga ega bo‘lsin.
  - Team access, role/permission, audit history, idempotency, inventory yoki
    slot collision protection va customer support escalation hisobga olinsin.
  - Hosted providerlar ham certification, moderation, publishing gate, health
    monitoring va AI discovery readiness qoidalaridan istisnosiz o‘tsin.
- [ ] Birinchi MVPni katta universal ERP sifatida emas, bitta sodda vertikalda
  — avvalo `SERVICES/BOOKINGS` — real bizneslar bilan validatsiya qilish;
  keyin food va retail imkoniyatlarini modul sifatida kengaytirish.
- [ ] To‘lovlarning birinchi bosqichida qat’iy provider-owned payment boundary
  saqlansin.
  - Biznes o‘z Payme, Click yoki boshqa merchant hisobini/checkoutini ulasin.
  - Mijoz puli bevosita providerning merchant hisobiga tushsin; Zayuno pulni
    qabul qilmasin, saqlamasin va bizneslarga mustaqil ravishda tarqatmasin.
  - Merchant credentiallari serverda shifrlangan saqlansin, tenantlar orasida
    izolyatsiya qilinsin va log/client bundle’da ko‘rinmasin.
  - Zayuno buyurtma, payment handoff va provider qaytargan payment statusini
    boshqarsin; karta raqami, CVV yoki OTP’ni hech qachon qabul qilmasin.
- [ ] Split payment, platform balance, avtomatik payout yoki settlementni faqat
  keyingi alohida bosqichda, yuridik tahlil va Markaziy bank talablariga mos
  litsenziyalangan bank/to‘lov tashkiloti hamkorligi bilan loyihalash.
  - KYC/AML, refund, chargeback, reconciliation, antifraud, soliq va hisob-kitob
    mas’uliyati aniq belgilanmaguncha Zayuno merchant-of-record bo‘lmasin.
  - Ushbu imkoniyat oddiy checkout connector ichiga yashirincha qo‘shilmasin;
    alohida approval, audit va rollout rejasiga ega bo‘lsin.

> Maqsad: Zayunoni faqat API’si bor yirik providerlar tarmog‘i emas, dasturchisiz
> kichik bizneslar ham AI orqali topiladigan va buyurtma qabul qiladigan universal
> operatsion platformaga aylantirish. Birinchi versiyada Zayuno pulni ushlab
> turmaydi.

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

## Later: Runtime Health Truthfulness, Checkout Provenance & Latency UX

- [ ] Customer-facing javoblarda providerning administrativ lifecycle holati
  (`ACTIVE`, `APPROVED`, `isPublished`, `isCertified`) bilan serverning real
  runtime health holatini (`HEALTHY`, `DEGRADED`, `DOWN`, `RECOVERING`) qat’iy
  ajratish.
  - “Server ishlayaptimi?” kabi savollarga faqat health monitor holati yoki
    rate-limited live health check asosida javob berish.
  - `ACTIVE` qiymatini hech qachon “server hozir ishlayapti” degan dalil sifatida
    ishlatmaslik.
  - Javobda mavjud bo‘lsa `lastCheckedAt`, health state va xavfsiz qisqa sababni
    mijozbop shaklda ko‘rsatish; stale/unknown holatda taxmin qilmaslik.
- [ ] Checkout/payment URL provenance’ini qat’iy kafolatlash.
  - AI yoki presenter checkout URL’ni action/public ID asosida o‘zi yasamasin.
  - Faqat provider action javobidagi canonical `nextAction`/payment URL
    validatsiyadan o‘tgach mijozga ko‘rsatilsin.
  - URL yo‘q, invalid yoki xavfsiz bo‘lmasa uydirma link bermasdan tushunarli
    fallback qaytarilsin.
  - Provider-supplied URL, rejected URL va missing URL uchun regression testlar
    yozilsin.
- [ ] Oddiy quote/action/status oqimlaridagi 18–25 soniyalik kechikishlarni Live
  Inspector trace’lari orqali tahlil qilish va bosqichma-bosqich latency’ni
  ko‘rsatish.
  - Provider request, retry, health lookup, DB va MCP/presenter vaqtlarini alohida
    o‘lchash.
  - Keraksiz ketma-ket chaqiruvlar va retrylarni yo‘qotish, mavjud timeout/SLA
    chegaralarini customer-facing xatolar bilan uyg‘unlashtirish.
  - Fast, slow va timeout holatlari uchun regression/performance testlar qo‘shish.

> Telefon raqamini lokal 9 xonali formatdan `+998` formatiga normalizatsiya qilish
> hozirgi qabul qilingan UX hisoblanadi va ushbu task scope’iga kirmaydi.

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
- [x] Consumer chatdagi qo‘llanmaydigan so‘rovni account bilan bog‘lash; takroriy so‘rovlarni user + canonical intent bo‘yicha dedupe qilib request count va oxirgi so‘ralgan vaqtni saqlash.
- [x] Admin panelda har bir talabni kimlar so‘ragani, noyob mijozlar soni va notification kutayotgan auditoriyani ko‘rsatish.
- [x] “Qo‘shilganda xabar ber” va notificationni bekor qilish oqimini saqlash; notification yuborishni faqat aniq opt-in bo‘lgan mijozlar bilan cheklash va talab identifikatorlarini 365 kunda tozalash.

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

### 11. Scalability & Concurrent Load Testing (Yuklama va Stress Testlari)
- [ ] 700+ Concurrent User / RPS Stress & Load Test (k6 / Locust / Autocannon) benchmark o‘tkazish:
  - **Haqiqiy holat**: Hozirda repoda 46 ta funksional va E2E integratsion testlar mavjud bo‘lib, ular parallel lease lock (10 parallel raqobatchi), tranzaksiya izolyatsiyasi va HTTP boundary xavfsizligini tekshiradi.
  - **Lekin**: 700 concurrent RPS darajasidagi yuklama (masalan, k6, Locust yoki autocannon orqali stress test) hali alohida o‘tkazilmagan (NOT IMPLEMENTED). Shuning uchun 700 foydalanuvchida P99 latency va pool to‘yinganligini faqat stress test o‘tkazilgandan keyin empirik tasdiqlash mumkin.
  - Test ssenariylari:
    - Discovery (`POST /mcp` `find_providers`, `list_providers`) yuqori parallel oqimda.
    - PostgreSQL connection pool to‘yinganligi va Redis cache hit-rate tahlili.
    - Distributed lease lock va action idempotency qulflarining 700 RPS ostidagi latency profili (P95, P99).

### 12. Future Vertical: GovTech & Civic Services Integration (Davlat xizmatlari, Kadastr, Ovoz berish va Murojaatlar)
- [ ] Zayuno platformasiga `GOVTECH` / `CIVIC_SERVICES` toifasini kiritish va milliy AI Gateway sifatida standartlashtirish:
  - **`SEARCH` / `DISCOVERY`**: Davlat xizmatlari, kadastr ma'lumotlari, ochiq budjet loyihalari, kommunal xizmatlar va jamoat qabulxonalari katalogini qidirish.
  - **`CATALOG` / `OFFERINGS`**: Xizmat shartlari, kerakli hujjatlar ro‘yxati, arizalar turlari, davlat boji / yig‘imlari tariflari.
  - **`CHECK_AVAILABILITY`**: Qabul kunlari/soatlari, navbat bandligi (Maktab/Bog‘cha/Pasport) va ovoz berish mavsumining ochiqligini tekshirish.
  - **`REQUEST_QUOTE`**: Davlat bojlari, xizmat ko‘rsatish to‘lovlari va soliq/jarima summalarini aniq kotirovka qilish.
  - **`ACTION_CREATE`**:
    - **Tashabbusli Budjet (Open Budget)**: Fuqaroning mahallasi bo‘yicha loyihalarga SMS-tasdiq orqali rasmiy ovoz berish.
    - **Kadastr va Ko‘chmas Mulk**: Kadastr pasporti, taqiq (zapret) mavjudligini tekshirish va mulkni ro‘yxatga olishga ariza yuborish.
    - **Xalq Nazorati / Kommunal Muammolar**: Ko‘chadagi nosozliklar, svet/gaz/yo‘l muammolari bo‘yicha rasm va geolokatsiya bilan murojaat shakllantirish.
    - **Yagona Portal (My.gov.uz)**: Davlat ma’lumotnomalari (STIR, sudlanmaganlik, yashash joyi) olishga ariza topshirish.
  - **`ACTION_STATUS` / `TRACKING`**: Ariza va murojaatlarning idoralar bo‘yicha ijro holatini kuzatish (`SUBMITTED` &rarr; `IN_REVIEW` &rarr; `ACCEPTED` &rarr; `RESOLVED` / `REJECTED`).
  - **`PAYMENT`**: Davlat bojlari va jarimalarni Payme/Click/Uzum orqali xavfsiz to‘lash (`checkoutUrl`).
- [ ] **OneID & Mobile-ID Xavfsiz Handoff**:
  - Fuqaroning maxfiy pasport va biometrik ma’lumotlarini Zayuno platformasida saqlamasdan, shaxsni tasdiqlash uchun rasmiy `https://id.egov.uz` OAuth2/Mobile-ID tizimiga xavfsiz `nextAction: OPEN_URL` yo‘naltirishi.
- [ ] AI foydalanuvchilari uchun:
  - *"Mening mahallamda yo‘l ta’mirlash bo‘yicha Open Budgetga ovoz berib yubor"*
  - *"Ushbu kadastr raqamiga taqiq bor-yo‘qligini tekshirib ber"*
  - *"Ko‘chamizda chiroq o‘chdi, Xalq Nazoratiga foto bilan murojaat yubor va raqamini ber"*

---

## Mobile App Vision (User Input)

Ha, **mobile app qilish mumkin va menimcha bu Zayuno uchun juda kuchli consumer layer bo‘lishi mumkin**. Ayniqsa sen aytgan eng muhim point — **juda qulay interface** — shu yerda katta farq qiladi.

Men Zayuno mobile’ni oddiy “chatbot app” qilmasdim. Unga qaraganda kuchliroq model:

> **Chat + structured UI + action flow**

Masalan user yozadi:

> “Ertaga 18:00 dan keyin Yunusobodda ko‘z doktori top.”

AI javobni faqat text qilib bermaydi. Pastda:

* doctor cardlar,
* experience,
* narx,
* rating,
* bo‘sh slotlar,
* Book tugmasi

chiqadi.

Keyin:

> “2-chisini 19:00 ga bron qil.”

App confirmation card ko‘rsatadi, keyin booking yaratadi.

Xuddi shu shell keyin:

* food order
* doctors booking
* books reservation
* railway
* tours
* hotels
* flowers
* local services

uchun ishlaydi.

### Eng kuchli UX modeli

Men bosh sahifani shunday qilardim:

`	ext
[ Ask Zayuno anything... ]

Quick actions:
Food
Doctors
Travel
Shopping
Tickets
Services
`

Lekin categories majburiy emas. User shunchaki intent yozadi.

Keyin AI result turiga qarab dynamic component chiqaradi:

* ProductCard
* ProviderCard
* DoctorCard
* TimeSlotPicker
* QuoteCard
* BookingCard
* PaymentCard
* ActionStatusCard

Bu juda muhim: **har vertical uchun alohida app UX emas, universal action UI kit**.

### Architecture

Core’ni o‘zgartirmaysan:

`	ext
Zayuno Mobile
    ↓
AI Orchestrator
    ↓
Zayuno Platform
    ↓
Providers
`

Mobile app hech qachon provider API’lariga to‘g‘ridan-to‘g‘ri bormaydi.

Providerlar yana o‘sha:

* discovery
* catalog
* availability
* quote
* action
* payment
* status

contract orqali ishlaydi.

### Mobile nimani yaxshilaydi?

ChatGPT pluginning kuchi — distribution.

Zayuno appning kuchi — **UX va ownership**.

O‘z appingda:

* push notification;
* saved preferences;
* recent orders;
* favourite providers;
* address book;
* passenger/customer profiles;
* booking calendar;
* payment handoff;
* live status;
* voice;
* camera/file upload

hammasini nazorat qilasan.

Masalan doctor bookingda user har safar:

> ism, yosh, telefon, address

yozib o‘tirmaydi. Profile’dan olinadi.

Railway’da passenger profile saqlanadi.

Food’da oldingi address va orderlar chiqadi.

Shu bilan app asta-sekin user uchun **action memory**ga aylanadi.

### Lekin bitta ehtiyotkorlik

Hozir katta super-app qurib yuborma.

Men **mobile v0**ni faqat 3 narsaga qaratardim:

1. Universal chat
2. Rich cards / confirmation UI
3. Action history

Va sandbox providerlar bilan:

* food
* booking
* ticket

3 xil flow ko‘rsat.

Agar shu UX chiroyli ishlasa, keyin providerlar ortgani sayin app avtomatik boyiydi.

### Stack

Sen React/Vite tarafdan kelganing uchun:

**React Native + Expo + TypeScript**

eng tez va qulay variant.

Backend esa hozirgi Zayuno.

AI orchestration uchun alohida lightweight service yoki mavjud backend modul bo‘lishi mumkin.

### Mening bahom

**Long-term: albatta qilish kerak.**

Hatto Zayuno’ning katta consumer vision’i men uchun shunday:

> **“One place to ask, compare, book, buy and manage real-world services.”**

Lekin hozir uni **provider networkdan oldin asosiy productga aylantirma**. Mobile app Zayuno’ning networkini ishlatadigan eng yaxshi interface bo‘lsin, networkning o‘rnini bosmasin.

Agar xohlasang, keyingi qadamda men senga **Zayuno Mobile v0 uchun 5–6 screenli juda kuchli UX flow**ni chizib beraman.

---

## Strategik Yondashuv: No-Code & AI Ecosystem (ChatGPT / Claude / Telegram)

**Bu butun platformaning eng asosiy va eng muhim biznes savoli!**

O‘zbekistondagi (va butun dunyodagi) bizneslarning **95% ida dasturchi yo‘q**, ular API, JSON, Webhook yoki server nimaligini umuman bilmaydi va bilishi ham shart emas. Agar biz ularga *"Zayunoga ulanish uchun API yozib kel"* desak, 99% biznes chetga chiqib ketadi.

Uzum Market, Express24, Yandex Eats yoki Booking.com kabi gigantlar qanday qilib oddiy oshxona yoki mehmonxonani o‘ziga ulaydi? Ular biznesga API yozdirmaydi, aksincha, **No-Code (Dasturlashsiz)** tayyor vositalar beradi.

Zayuno bu bizneslar uchun quyidagi **4 ta oson yechim**ni taqdim etadi:

---

### 1. Telegram Business Bot orqali buyurtma qabul qilish (O‘zbekiston uchun №1 yechim)

Biznes egasi (yoki uning ma’muri, kassa xodimi) uchun hech qanday yangi ilova yoki server shart emas. Ular har kuni ishlatadigan **Telegram** kifoya:

1. **AI buyurtma oladi**: ChatGPT, Claude yoki Zayuno chatida mijoz: *"Menga 2 ta somsa va choy kerak"* deb buyurtma beradi.
2. **Telegramga xabar boradi**: Sompaz yoki restoranning Telegram botiga darhol xabar tushadi:
   ```text
   🔔 YANGI BUYURTMA #ZY-4819
   👤 Mijoz: Abduxamid (+998 99 555 77 44)
   📍 Manzil: Chilonzor 9-mavze
   🍽 Buyurtma:
      • Tandir somsa (go‘shtli) × 2 — 30 000 so‘m
      • Ko‘k choy (limonli) × 1 — 10 000 so‘m
   💰 To‘lov: To‘langan (Click / 40 000 so‘m)

   [ ✅ Qabul qilish (15 daqiqada tayyor) ]   [ ❌ Rad etish ]
   ```
3. Xodim shunchaki bitta tugmani bosadi: `[ ✅ Qabul qilish ]`.
4. ChatGPT mijozga: *"Buyurtmangiz oshxona tomonidan qabul qilindi, 15 daqiqada tayyor bo‘ladi!"* deb javob beradi.

**Natija:** Biznes egasi bitta ham kod yozmadi, API nimaligini bilmadi, lekin ChatGPT orqali to‘g‘ridan-to‘g‘ri savdo qildi!

---

### 2. Zayuno No-Code Hamkor Kabineti (`partners.zayuno.uz`)

Xuddi Uzum Market yoki Instagramga rasm joylagandek oddiy veb-kabinet:
- **Xizmat yoki taom qo‘shish**: Nomi, narxi, rasmi, tavsifi va telefon raqami.
- Yoki tayyor **Excel (jadval)** faylini yuklash.
- Zayuno bu ma’lumotlarni o‘zi avtomatik tarzda AI tushunadigan API va Katalog formatiga o‘tkazib, ChatGPT va Claude'ga ulaydi.
- Biznes server sotib olmaydi — **Zayunoning o‘zi ularning virtual serveri bo‘lib xizmat qiladi**.

---

### 3. Tayyor POS / CRM tizimlariga 1 bosishda ulanish

O‘zbekistondagi ko‘plab kafe va do‘konlar allaqachon tayyor tizimlardan foydalanadi:
- Restoran va kafelar: **iiko, Jowi, Poster POS, R-Keeper**.
- Do‘konlar va savdo: **1C:Predpriyatiye, MoySklad**.

Zayunoda ushbu tizimlar uchun **tayyor ulagichlar (integratsiyalar)** bo‘ladi:
- Biznes egasi shunchaki o‘zining Jowi yoki Poster tizimidagi login/parolini kiritadi.
- Zayuno ularning menyusi va qoldiqlarini avtomatik tortib oladi.
- ChatGPT orqali tushgan buyurtma to‘g‘ridan-to‘g‘ri ularning kassa apparatidan (cheki) chiqib keladi!

---

### 4. "AI Onboarding" — Rasm yoki PDF orqali menyu kiritish

Hatto veb-kabinetga kirib matn yozishni istamaydigan yoki erinadigan tadbirkorlar uchun:
- Biznes egasi o‘zining kafe menyusi, sayohat paketi flayeri yoki xizmatlar narxnomasi rasmini (yoki PDF faylini) Zayunoga yuboradi.
- Zayunoning ichki sun’iy intellekti (OCR + Vision) rasmdagi barcha taomlar, xizmatlar va narxlarni bir necha soniyada tanib oladi.
- Biznes egasiga tasdiqlash uchun yuboradi:
  > *"Sizning menyungizdan 24 ta taom va narxlar tanib olindi. Barchasi to‘g‘rimi?"*  
  > Tadbirkor: *"Ha, to‘g‘ri"* deydi — tamom, uning biznesi ChatGPT va AI ekotizimiga ulandi!

---

### 💰 Biznesga taklif qilinadigan eng kuchli "Offer" (Taklif)

Biznes egalariga Zayunoni tushuntirish tili juda oddiy:
> **"Sizdan 1 so‘m ham oylik to‘lov olinmaydi. Dasturchi yollashingiz shart emas. Biz sizga ChatGPT va sun’iy intellekt orqali yangi to‘lovga layoqatli mijozlarni olib kelamiz. Savdo bo‘lgandagina kichik komissiya (masalan, 3-5%) to‘laysiz. Savdo bo‘lmasa — xarajat nol!"**

Bu taklifga har qanday biznes rozi bo‘ladi, chunki ular uchun risk yo‘q, faqat tayyor savdo va yangi mijozlar keladi.

Zayuno aynan mana shunday **oddiy tadbirkor bilan zamonaviy sun’iy intellekt (ChatGPT, Claude, Gemini) o‘rtasidagi ko‘prik** vazifasini bajaradi!

