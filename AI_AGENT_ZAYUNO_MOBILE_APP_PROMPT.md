# Zayuno Mobile App — AI agent uchun bosqichma-bosqich master prompt

Sen `D:\works\DEV\Zayuno` monoreposida ishlaysan. Maqsad — mavjud Zayuno backend va MCP action infratuzilmasiga ulangan, Expo + React Native + TypeScript asosidagi productionga yaqin mobile MVP yaratish.

Ishni birdaniga katta o‘zgarish sifatida bajarma. Quyidagi bosqichlarni aynan ketma-ket bajar. Har bosqich yakunida:

1. bajarilgan ishlarni 3–6 bandda qisqa yoz;
2. o‘zgargan muhim fayllarni ko‘rsat;
3. keyingi bosqichga o‘t;
4. faqat blocker, xavfli external action yoki kerakli secret bo‘lmasa avtomatik davom et — har bosqichda mendan tasdiq kutma.

Build/testni har bosqichda takrorlama. Faqat promptda belgilangan checkpointlarda ishga tushir. Xato chiqsa, sababini tuzatib keyin davom et.

## Qat’iy chegaralar

- Mavjud dirty worktree va foydalanuvchi o‘zgarishlarini saqla; aloqasiz kodni qayta formatlama yoki o‘chirma.
- OpenAI review hozir pending. Public MCP tool nomlari, input/output schema, annotations, domain challenge, submission fayli va mavjud public API contractlarini buzma. Zarur o‘zgarishlar additive va backward-compatible bo‘lsin.
- Git push, production deploy, production DB mutation, secret rotation va migratsiyani avtomatik bajarma. Oxirida tayyor holatni va bajarilishi kerak bo‘lgan external qadamlarni ber.
- Gemini API key, Google OAuth secret, session token yoki boshqa secret mobil bundle, Expo public env, log, analytics va Git ichiga tushmasin.
- Mobil ilova provayder APIlariga va MCP endpointga bevosita ulanmasin. U faqat Zayuno consumer backend/orchestrator bilan HTTPS orqali gaplashsin.
- `create_action` faqat haqiqiy `request_quote`dan keyin va foydalanuvchining aniq tasdig‘idan so‘ng ishlasin. Idempotency saqlansin. Payment faqat provider-hosted HTTPS handoff orqali bo‘lsin; karta ma’lumotlarini chatda yig‘ma.
- UI’da raw DB/API xato, stack trace, internal ID, secret yoki texnik payload ko‘rsatilmasin. Faqat xavfsiz `customerMessage` va foydalanuvchiga kerakli structured data ko‘rsatilsin.
- Screenshotlardagi doctor, pharmacy, ticket kabi takliflar vizual namuna xolos. Faqat hozir discovery orqali mavjud va healthy/certified provider capabilitylarini ko‘rsat; ishlamaydigan imkoniyatni va’da qilma.

## Manbalar va yo‘nalish

- Repo root: `D:\works\DEV\Zayuno`
- Yangi mobile app: `D:\works\DEV\Zayuno\apps\mobile`
- Brand asset manbasi: `D:\works\DEV\Zayuno\logo_and_favicons`
- Mavjud assetlar: `logo.png`, `logo2.png/webp`, `light.png/webp`, `zayaa.png/webp`, favicon va Android iconlar.
- Consumer roadmap: `D:\works\DEV\Zayuno\docs\ROADMAP_CONSUMER_APP.md`
- MCP tool contract: `D:\works\DEV\Zayuno\apps\mcp\src\tools.ts`
- MCP behavior/guardrails: `D:\works\DEV\Zayuno\apps\mcp\src\server.ts`
- API: `D:\works\DEV\Zayuno\apps\api`
- Review expectations: `D:\works\DEV\Zayuno\docs\OPENAI_PLUGIN_SUBMISSION_CHECKLIST.md`
- UI reference: foydalanuvchi yuborgan ikkita screenshot — futuristik welcome/Google login va minimalist universal chat home.

Ranglar:

- background `#050816`
- surface/card `#0B1020`
- border/input `#242A3A`
- primary blue `#2563FF`
- electric blue `#168BFF`
- cyan `#22D3EE`
- purple `#7C3AED`
- magenta `#D946EF`
- text `#F8FAFC`
- secondary text `#8B93A7`
- accent gradient: `#22D3EE -> #2563FF -> #7C3AED -> #D946EF` at 135°

UI’ning taxminan 90% qismi dark neutral bo‘lsin. Gradient faqat logo, asosiy CTA, active state, selected element va AI loading/action holatlarida ishlatilsin.

## 0-bosqich — Audit va aniq reja

- Repo rootdagi `AGENTS.md` va tegishli instruction fayllarini o‘qi.
- Workspace, package manager, mavjud auth/API/MCP/action flow, Docker xizmatlari, env namunalari va testlarni tekshir.
- `logo_and_favicons` rasmlarining resolution, alpha/background va mobile icon/splash uchun yaroqliligini tekshir.
- Mavjud backend ichida consumer auth/chat endpointlari bormi, aniqlab ol. Taxmin qilma.
- `apps/mobile` mavjud bo‘lsa uni bosib ketma; holatini audit qil.
- Qisqa architecture decision yoz: mobile client → consumer API/orchestrator → Gemini server-side tool calling → Zayuno Core/MCP semantics.
- `docs/MOBILE_APP_IMPLEMENTATION_PLAN.md` yaratib, checklist va aniqlangan real endpointlarni yoz.

Bu bosqichda dependency install, build va katta kod yozma.

## 1-bosqich — Mobile scaffold va workspace integratsiyasi

- `apps/mobile` ichida Expo managed workflow, React Native va strict TypeScript loyiha yarat.
- Expo Router ishlat; auth va app route grouplarini ajrat.
- pnpm workspace/Turbo bilan moslashtir. Root buildga mobile native buildni majburan qo‘shib, mavjud CI’ni buzma; mobile uchun alohida aniq scriptlar ber.
- Tavsiya etilgan asos: Expo Router, TanStack Query, Zustand (faqat local UI/session state), Zod, React Hook Form, Reanimated, Gesture Handler, Safe Area, SecureStore, AsyncStorage va zarur bo‘lsa FlashList.
- Faqat ishlatiladigan dependencylarni qo‘sh. Expo versiyasiga mos paket versiyalarini `expo install` orqali tanla.
- `.env.example` yarat, ammo real secret yozma. `EXPO_PUBLIC_` faqat oshkor bo‘lishi xavfsiz base URL, Google public client ID kabi qiymatlarga ishlatilishi mumkinligini hujjatlashtir.

## 2-bosqich — Asset pipeline va design system

- Kerakli original assetlarni `logo_and_favicons`dan `apps/mobile/assets/brand`ga nusxala; manba fayllarni o‘zgartirma.
- Expo icon, adaptive icon, splash va in-app logo uchun to‘g‘ri variantlarni tanla. Kerak bo‘lsa transparent/padded derived variantlar yarat; ularni reproducible script yoki aniq source bilan saqla.
- Yetishmayotgan dekorativ hero/background kerak bo‘lsa brandga mos original raster asset yarat. Og‘ir rasm o‘rniga gradient, blur va yengil vector/native elementlarni afzal ko‘r.
- Theme tokens, typography, spacing, radius, shadow/glow va motion tokens yarat. Ranglarni ekranlar bo‘ylab hardcode qilma.
- Reusable primitive UI: Screen, Text, Button, Card, Input, IconButton, Divider, Skeleton, ErrorState, EmptyState, BottomSheet/Modal.
- Accessibility: contrast, dynamic type, minimum 44×44 touch target, screen-reader labels va reduce-motion fallback.

### CHECKPOINT A

Shu yerda bir marta install/typecheck/lint va minimal Expo start/export sanity check qil. Mavjud monorepo buildni faqat zarur bo‘lsa ishga tushir. Natijani yozib, keyin davom et.

## 3-bosqich — Welcome va Google Auth foundation

- Birinchi screenshot ruhida, ammo pixel-copy emas, professional welcome ekran yarat: Zayuno logo, qisqa value proposition, “Google bilan davom etish”, Terms va Privacy linklari.
- Light va dark assetlarning ma’nosini to‘g‘ri qo‘lla; dark theme MVP default bo‘lsin.
- Google authni Expo’ga mos xavfsiz usulda integratsiya qil. Development build talab qilinsa aniq hujjatlashtir; Expo Go’da yolg‘on ishlayotgandek ko‘rsatma.
- Backendda consumer Google ID tokenni Google issuer/audience/signature orqali verify qiladigan additive endpoint yarat. So‘ng Zayuno’ning o‘z qisqa access + rotating refresh sessionini qaytarsin.
- Mobil tokenlarni SecureStore’da saqla. Refresh deduplication, logout/revoke va 401 recovery bo‘lsin.
- Google keylar hali berilmaganida app aniq “configuration required” dev state bilan ishga tushsin; fake loginni production flow sifatida qoldirma.
- Phone authni hozir implement qilma, lekin auth provider abstraction keyinchalik qo‘shishga tayyor bo‘lsin.
- `docs/MOBILE_AUTH_SETUP.md` ichida Android package, iOS bundle ID, redirect URI, SHA fingerprint va kerakli env nomlarining checklistini ber.

## 4-bosqich — Consumer API va server-side Gemini orchestrator

- Avval mavjud backend imkoniyatlarini qayta ishlat. Keraksiz parallel business logic yaratma.
- Zarur bo‘lsa `apps/api` ichida alohida additive consumer/mobile module yarat: session, conversation, message, action history va orchestration endpointlari.
- Gemini faqat server tomonda ishlasin. Model nomi va API key env orqali boshqarilsin. Key hech qachon clientga yuborilmasin.
- Gemini structured tool-calling/JSON schema orqali Zayuno’ning mavjud universal semantikasini ishlatsin: welcome, discovery, provider/location/catalog/search, quote, explicit confirmation, create/get/cancel action, payment options.
- MCP ustida internal client ishlatish yoki core service’larni reuse qilishdan qaysi biri kontrakt va maintainability uchun to‘g‘ri bo‘lsa audit asosida tanla va ADR’da yoz. Public MCP’ni mobilga moslash uchun buzma.
- Conversation state serverda user scope bilan saqlansin. Multi-tenant isolation va ownership har action/history read’da tekshirilsin.
- Streaming kerak bo‘lsa SSE yoki mavjud infratuzilmaga mos transport yarat; reconnect, timeout, abort va duplicate message guard bo‘lsin.
- Gemini prompt injection bilan provider/tool outputni instruction deb qabul qilmasin. Tool allowlist, schema validation, max turn/tool limit, timeout va safe fallback qo‘sh.
- Provider health/discovery gate saqlansin. DOWN, unpublished, internal yoki uncertified provider consumer natijasida ko‘rinmasin.

## 5-bosqich — Universal chat/home UX

- Ikkinchi screenshot ruhida home/chat ekranini yarat: compact Zayuno header, greeting, dynamic suggestions va katta composer.
- Suggestionlar hardcoded imkoniyat emas: backend welcome/discovery/capability natijasidan hosil bo‘lsin. Empty/offline holat uchun rost fallback ishlat.
- Keyboard avoidance, safe area, multiline composer, send/stop/retry, haptic feedback, streaming typing indicator va smooth auto-scrollni to‘g‘ri qil.
- User/assistant bubble’larni haddan tashqari rangli qilma. AI action holatlarini chiroyli, ammo sokin motion bilan ko‘rsat.
- UZ lotin tili default. Copy tabiiy va sodda bo‘lsin. i18n strukturasi RU/EN qo‘shishga tayyor bo‘lsin.
- Loadingda spinnerga qaram bo‘lma: skeleton/progress/status copy ishlat. Errorlar “qayta urinib ko‘rish” va tushunarli recovery bilan chiqsin.

## 6-bosqich — Server-driven rich cards va action flow

- Universal component registry yarat; yangi vertikal kelganda alohida app release talabini imkon qadar kamaytir.
- Kamida quyilarni typed va versioned schema bilan qo‘llab-quvvatla: ProviderCard, CatalogItemCard, SearchResults, LocationCard, QuoteCard, ConfirmationCard, PaymentCard, ActionStatusCard.
- Unknown component/version uchun safe text fallback bo‘lsin; remote payload arbitrary native component/code ishlata olmasin.
- Food/sandbox real flow bilan end-to-end UX:
  discovery → catalog/search → item/quantity → quote breakdown → explicit confirmation → create action → provider payment link → action status/cancel.
- Quote’da currency, subtotal, fees, total va expiry aniq ko‘rinsin. Confirm tugmasi double-tapdan himoyalansin.
- External payment link ochilishidan oldin domain/HTTPS tekshiruvi va tushunarli handoff bo‘lsin.
- Action history foydalanuvchiga tegishli real backend ma’lumotidan chiqsin; fake/demo bo‘lsa aniq sandbox disclaimer ko‘rsat.

### CHECKPOINT B

Mobile typecheck/lint, backend targeted tests va asosiy auth/chat/action contract testlarini bir marta ishlat. Barcha monorepo testlarini hali ishlatma. Xatolarni tuzatib keyin davom et.

## 7-bosqich — Kuchli caching va offline/reliability

- Server-side: Redis mavjud bo‘lsa provider/catalog/search kabi read-heavy ma’lumotlar uchun bounded TTL, namespaced key, cache stampede protection va aniq invalidation strategiyasi ishlat.
- Client-side: TanStack Query cache + persistence. Sensitive bo‘lmagan discovery/catalogni diskda saqlash mumkin; token, PII, chat secret va payment URLni oddiy AsyncStorage’da saqlama.
- Stale-while-revalidate, deduplication, pagination, retry with jitter/backoff va offline banner qo‘sh.
- Quote, payment, provider health va action statusga uzoq TTL qo‘yma. Mutationlarni offline optimistic tarzda “muvaffaqiyatli” ko‘rsatma.
- Cache keylar user/locale/provider scope bilan ajratilsin. Logoutda user-scoped cache tozalansin.
- App cold start tez bo‘lsin; keraksiz katta asset va JS dependencylarni kamaytir.

## 8-bosqich — Security, observability va privacy

- Input/outputni Zod yoki mavjud contract bilan validate qil. Rate limit, payload limit va request correlation ID qo‘sh.
- PII/secrets redactionni mavjud shared util bilan reuse qil. Analytics/chat loglarda raw telefon, email, token, address yoki prompt contentni default yozma.
- Sentry/analytics adapter interface yarat, ammo key bo‘lmasa no-op bo‘lsin. Muhim funnel eventlar: auth, prompt sent, tool/result, quote shown, confirmation, action created, payment opened, recovered error.
- Privacy/Terms URLlarni mavjud production sahifalarga bog‘la. Data deletion/logout va retention bo‘yicha mavjud backendga mos aniq TODO yoki endpoint yarat.
- Android network security va iOS transport sozlamalari HTTP’ni productionda qabul qilmasin.

## 9-bosqich — Testlar va UX QA

- Unit: schema/parser, cache policy, auth refresh, confirmation state machine va component registry.
- Integration: mocked Gemini emas, deterministic orchestrator boundary fixture; tool call/result mapping va secret/error redaction.
- Backend E2E: Google verifier dependency test-double bilan session lifecycle; user isolation; quote-before-create; explicit confirmation; idempotency.
- Mobile component tests: welcome, login config error, chat, quote, confirmation, offline/error, action history.
- Kamida Android va iOS viewportlarda layoutni tekshir. Small phone, keyboard open, large font va reduced motion holatlarini ko‘r.
- UI’ni screenshot referencelar bilan vizual solishtir, lekin copy va ishlamaydigan feature’larni ko‘chirma.

## 10-bosqich — Yakuniy checkpoint va handoff

Endi bir marta yakuniy tekshiruv qil:

1. mobile typecheck/lint/tests;
2. mobile Expo export yoki mavjud credentials talab qilmaydigan eng yaqin build sanity check;
3. o‘zgargan backend package targeted tests;
4. public MCP contract/review regression tests;
5. imkon bo‘lsa monorepo build — ammo mavjud tashqi/oldindan bor xatoni o‘z o‘zgarishingdan ajratib yoz;
6. `git diff --check` va secret scan.

Quyidagi hujjatlarni yakunla:

- `apps/mobile/README.md`: local run, Expo development build, Android/iOS, env va troubleshooting.
- `docs/MOBILE_ARCHITECTURE.md`: client/orchestrator/core boundary, auth, caching, streaming, security.
- `docs/MOBILE_AUTH_SETUP.md`: foydalanuvchi keyin yuboradigan Google config/env checklist.
- `.env.example` fayllarda Gemini/Google/consumer session env nomlari, lekin qiymatlar yo‘q.

Final hisobotda faqat quyilarni aniq ber:

- nima ishlaydi;
- real tekshirilgan flowlar;
- qaysi test/buildlar PASS;
- hali userdan kerak bo‘lgan Google/Gemini/env qiymatlari;
- ishga tushirish buyruqlari;
- deploy/push qilinmaganini;
- qolgan blocker yoki risklar.

## MVP uchun Definition of Done

- Expo ilova Android/iOS uchun ochiladi va screenshotlardagi Zayuno ruhiga mos professional welcome/home UX beradi.
- Google auth integratsiyasi to‘liq yozilgan, secretlar kelgach config bilan ishlaydi; token serverda verify qilinadi.
- Gemini server-side orchestrator orqali foydalanuvchi so‘rovini mavjud Zayuno action tool semanticsiga aylantiradi.
- Mobil klientdan provider/MCP/Gemini secretiga bevosita kirish yo‘q.
- Dynamic healthy capabilities ko‘rsatiladi; uydirma provider yoki feature yo‘q.
- Quote → explicit confirmation → idempotent create → payment handoff → status/cancel oqimi guardraillar bilan ishlaydi.
- Structured rich cards, action history, offline/error recovery va scoped caching mavjud.
- Public plugin/MCP review kontrakti buzilmagan va regression test PASS.
- Hech qanday secret Gitga tushmagan; production deploy/push qilinmagan.

Hozir 0-bosqichdan boshlang va reja bo‘yicha ketma-ket davom eting.
