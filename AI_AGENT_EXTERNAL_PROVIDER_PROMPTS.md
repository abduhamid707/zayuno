# Zayuno external-provider readiness — 4 AI agent prompts

Bu fayl boshqa kuchli coding agentga navbat bilan beriladigan to‘rtta work-package
promptni saqlaydi. Promptlar tartib bilan bajariladi: **1 → 2 → 3 → 4**.

## Umumiy qoidalar

- Hech qaysi prompt deploy qilmaydi.
- Production, hosting, DNS, Railway/Vercel, live database yoki live secretlarga
  o‘zgartirish kiritilmaydi.
- Har bir agent avval `AGENTS.md` mavjud bo‘lsa to‘liq o‘qiydi, keyin
  `TASKS.md`, mavjud kod, testlar va git holatini tekshiradi.
- Userning mavjud uncommitted o‘zgarishlari saqlanadi; unrelated fayllar
  qayta yozilmaydi va destructive git command ishlatilmaydi.
- Mavjud implementatsiya qayta yaratilmaydi: agent avval nima borligini
  aniqlaydi, keyin faqat yetishmayotgan qismini tugatadi.
- Backward compatibility zarur bo‘lsa migration yoki compatibility layer bilan
  ta’minlanadi.
- Har bir o‘zgarishga regression test yoziladi. Tegishli unit, integration,
  E2E, typecheck va build tekshiruvlari ishlatiladi.
- Faqat test bilan isbotlangan `TASKS.md` bandlari `[x]` qilinadi. Qisman
  bajarilgan parent task yopilmaydi; bajarilgan child tasklar alohida belgilanadi.
- Agent yakunda o‘zgargan fayllar, test natijalari, ochiq qolgan risklar va
  `TASKS.md`dagi yangilangan bandlarni aniq yozadi.
- **Provider business ownership verification hozirgi scope’da yo‘q.** DNS,
  company-domain email, business document va signed ownership challenge keyingi
  bosqichga qoldiriladi. Hozir reserved brand public self-service orqali umuman
  ro‘yxatdan o‘tkazilmaydi.

---

## PROMPT 1 — Publishing security, reserved brands, discovery readiness va support contract

```text
D:\works\DEV\Zayuno repoda ishlaysan. AGENTS.md mavjud bo‘lsa to‘liq o‘qi,
keyin TASKS.md, git status va tegishli provider/contracts/MCP kodlarini tekshir.

Ushbu work-package’ni oxirigacha implement qil:

1. Canonical provider publishing gate
- Public list/find/get, MCP discovery, quote va action entrypointlari faqat
  quyidagi canonical shartlarning barchasi bajarilgan providerga ruxsat bersin:
  status=ACTIVE, metadata.reviewStatus=APPROVED,
  metadata.isPublished=true, metadata.isCertified=true.
- Legacy ACTIVE compatibility bypass’ni olib tashla. Kerak bo‘lsa mavjud trusted
  fixture/seed providerlar uchun aniq migration yoki seed metadata update qil;
  runtime’da yashirin bypass qoldirma.
- DRAFT, SANDBOX, CHANGES_REQUESTED, PENDING_APPROVAL, REJECTED, SUSPENDED yoki
  uncertified provider public/MCP discovery, quote va action orqali ishlamasin.
- Admin va o‘z provideriga tegishli authenticated management endpointlarini
  buzma.

2. Reserved brand va slug protection
- Markaziy, testlanadigan reserved-brand registry yarat. Unda canonical brand,
  alias, transliteratsiya va himoyalangan slug patternlari bo‘lsin.
- Unicode NFKC, lowercase, whitespace/punctuation removal va ehtiyotkor
  lookalike normalization ishlat. evos, e-vos, ev0s, official-evos,
  evos-uzbekistan kabi public self-service urinishlari stable error code bilan
  bloklansin yoki manual-review hold holatiga tushsin; ular hech qachon avtomatik
  publish bo‘lmasin.
- False-positive’larni kamaytir: umumiy fuzzy-distance bilan barcha o‘xshash
  nomlarni bloklama. Faqat aniq registry/alias/pattern va xavfsiz homoglyph
  normalizatsiyasiga tayan.
- Public self-service uchun override qo‘shma. Operations uchun mavjud internal
  onboarding oqimini saqla; haqiqiy brand ownership verification yaratma.
- Auditga brand match sababi va matched canonical brand yozilsin, lekin secret
  yoki shaxsiy ma’lumot yozilmasin.

3. Capability-aware Smart Discovery Filtering
- Bo‘sh, unhealthy, vaqtincha unavailable yoki xizmatga tayyor bo‘lmagan
  providerlar AI discovery’da chiqmasin.
- Har discovery requestda barcha remote catalog/location endpointlariga N+1
  network call qilma. Certification/health/catalog sync orqali yangilanadigan
  cached readiness snapshot yoki DB metadata ishlat; TTL/staleness qoidasi aniq
  bo‘lsin.
- CATALOG capability e’lon qilgan providerda kamida bitta available offering
  talab qilinsin.
- LOCATIONS capability yoki physical delivery/pickup/booking modeliga ega
  providerda kamida bitta active location talab qilinsin.
- Digital, remote, recruitment yoki discovery-only provider uchun location
  majburiy bo‘lmasin.
- Nega provider yashirilganini admin diagnostics ko‘rsata olsin, lekin public
  response ichki sabablarni oshkor qilmasin.

4. Structured support contract
- supportContact oddiy string o‘rniga backward-compatible strukturali contract
  bo‘lsin: phone, telegram, email, workingHours, supportUrl va ixtiyoriy locale.
- Eski string qiymatlarni migration/normalizer orqali yo‘qotmasdan qo‘llab-quvvatla.
- Provider metadata, get_provider va action/status javoblarida tegishli support
  ma’lumoti qaytsin.
- Public response’da faqat provider rasmiy ravishda bergan support qiymatlari
  chiqsin; secret/internal escalation note chiqmasin.

Acceptance criteria va testlar:
- Publishing matrix uchun unit/integration testlar yoz.
- Unapproved yoki uncertified ACTIVE provider MCP find/list/get, quote va action
  orqali ishlamasligini isbotla.
- Reserved-brand normalization, aliases, homoglyphs, false-positive va internal
  Operations path testlarini yoz.
- Discovery readiness: empty catalog, all unavailable, physical provider without
  active location, digital provider without location, stale/unhealthy snapshot
  holatlarini test qil.
- Structured support schema, legacy string migration va action response testlari
  bo‘lsin.
- Tegishli test, typecheck va buildlarni ishlat.
- Faqat isbotlangan TASKS.md child bandlarini [x] qil.

QAT’IY CHEKLOV: deploy qilma, live database/data migration ishlatma, production
secret/DNS/hostingga tegma, ownership verification implement qilma.
```

---

## PROMPT 2 — Public Developer Portal va savolsiz provider onboarding journey

```text
D:\works\DEV\Zayuno repoda ishlaysan. AGENTS.md mavjud bo‘lsa to‘liq o‘qi,
keyin TASKS.md, provider portal, API auth va provider registration kodlarini
tekshir. Prompt 1 o‘zgarishlarini mavjud deb qabul qil, lekin ularni qayta yozma.

Developer Portal va provider onboarding’ni tashqi hamkor uchun boshidan oxirigacha
tushunarli qil:

1. Public va protected zonalarni ajrat
- Overview, Documentation, Provider Contract, FAQ va “How integration works”
  login talab qilmasdan ochilsin.
- Operations, actions/dashboard, credentials, API secrets, integration settings,
  certification execution va account settings authenticated bo‘lib qolsin.
- Hozirgi global `if (!token) return login` arxitekturasini public shell +
  protected route/tab modeliga refactor qil.
- Direct links va docs query parameters refresh’dan keyin ham ishlasin.

2. Public entry path
- Ko‘rinadigan “Provider bo‘lish” CTA yarat.
- “Qanday ishlaydi?” sahifasida aniq yoz: kim ro‘yxatdan o‘ta oladi, qanday API
  endpointlar kerak, HTTPS/auth/webhook/idempotency talablari, sandbox va live
  farqi, review bosqichlari, credential xavfsizligi va taxminiy vaqt.
- Hali supported bo‘lmagan yoki reserved brand arizalari nima sababdan qabul
  qilinmasligini tushuntir.

3. Account va email verification
- Mavjud auth modelini tekshir. Yetishmasa provider-owner self-service signup
  va email verification oqimini xavfsiz implement qil.
- Password hashing, token hashing, expiry, single-use, resend throttling va
  enumeration-safe response bo‘lsin.
- Email transport abstraction ishlat. Test/dev rejimida verification tokenni
  test harness olishi mumkin; production UI/API response tokenni oshkor qilmasin.
- Email verification business ownership verification hisoblanmasin va DNS yoki
  hujjat talab qilinmasin.

4. Savolsiz application wizard
- Quyidagi aniq bosqichlar bo‘lsin:
  Account → Email verified → Business profile/support → Brand/slug check →
  API/auth/capabilities → Credential handoff → Sandbox certification →
  Submit review → Operations decision.
- Har bir bosqichda maqsad, required field, valid example, validation error va
  keyingi qadam ko‘rsatilsin.
- Credential faqat bir marta ko‘rsatilishini juda aniq ayt; copy/download
  imkoniyati va “saqladim” acknowledgement bo‘lsin. Secretni keyin qayta
  ko‘rsatma; faqat rotation flow orqali almashtir.
- Status UX: DRAFT, CERTIFICATION_FAILED, READY_FOR_REVIEW, PENDING_APPROVAL,
  CHANGES_REQUESTED, APPROVED, REJECTED, SUSPENDED. Har status uchun “nima
  bo‘ldi / kimdan action kutilmoqda / keyingi qadam” ko‘rsat.
- Existing provider application form va registration API’dan foydalan;
  duplicate parallel flow yaratma.

5. Documentation section 14
- Troubleshooting & Developer FAQ qo‘sh: CORS/preflight, rawBody HMAC,
  latency/timeout, quote math, idempotency, HTTPS/SSL, common 401/409/410/422/502
  holatlari va copy-paste qilsa ishlaydigan misollar.
- Docs menyusi, direct link va mobile layout bilan ishlasin.

Acceptance criteria va testlar:
- Anonymous user public Overview/Docs/FAQ’ni ko‘radi, protected zonaga kirsa
  login talab qilinadi.
- Signup/email verification/account login testlari; expired/reused token va
  rate-limit holatlari test qilinsin.
- New provider journey E2E: signup → verify → login → DRAFT application →
  integration settings → certification display → submit review. Admin approvalni
  test fixture orqali tekshir, live systemga yozma.
- Reserved brand application public flow’da bloklanganini ko‘rsat.
- Accessibility basics: labels, keyboard navigation, focus/error summary.
- Provider portal va API uchun test/typecheck/buildlarni ishlat.
- Faqat test bilan isbotlangan TASKS.md bandlarini [x] qil.

QAT’IY CHEKLOV: deploy qilma, production email yuborma, live DB/DNS/secretga
tegma, business ownership verification implement qilma.
```

---

## PROMPT 3 — Sandbox Simulator, certification runner va lokal Mock EVOS E2E

```text
D:\works\DEV\Zayuno repoda ishlaysan. AGENTS.md mavjud bo‘lsa to‘liq o‘qi,
keyin TASKS.md, provider portal simulator, provider SDK certification runner,
Mock EVOS va testlarni tekshir. Mavjud working-tree o‘zgarishlarini saqla.

Quyidagi work-package’ni tugat:

1. Sandbox Simulator correctness
- Simulator’dagi barcha fetch/API helperlar statusni tekshirsin. 4xx/5xx,
  network error yoki invalid JSON hech qachon yashil Completed bo‘lmasin.
- Har step loading/success/error holatiga ega bo‘lsin; server error code/message,
  trace ID va retry mumkinligini xavfsiz ko‘rsatsin.
- Find → Quote → explicit Confirm → Action → Payment/Webhook → Status oqimi
  ketma-ket va oldingi natijalarga bog‘langan bo‘lsin.
- Quote ko‘rsatilmasdan va userConfirmed=true bo‘lmasdan action yaratma.
- Browser bundle ichiga webhook secret joylama. Simulator webhook’ini backenddagi
  sandbox-only authenticated endpoint yoki test harness server-side HMAC bilan
  imzolasin. Production’da generic “sign arbitrary payload” endpoint yaratma.
- Fake `mock_valid_signature_123`ni butunlay olib tashla.

2. Certification runner correctness
- Certification catalogdan haqiqiy test itemni capability-aware tanlasin.
- Variant talab qilinsa available/default variantni tanlasin.
- Required option group uchun available default optionni, default bo‘lmasa
  deterministik birinchi valid optionni tanlasin; min/max selectionni hurmat qil.
- Location kerak bo‘lsa active location tanlasin; digital provider uchun
  location talab qilmasin.
- Quote math: subtotal + fees - discount = total va line math qat’iy tekshirilsin.
- Quote muvaffaqiyatli bo‘lmasa action/idempotency testlarini “passed” qilma;
  dependency failureni aniq ko‘rsat.
- Quote, action, duplicate idempotency, get status, webhook HMAC, cancellation va
  invalid transition testlari barcha declared capabilitylar uchun ishlasin.

3. Mock EVOS terminal-state verification
- Mavjud local fixni saqla va tekshir: CANCELLED/COMPLETED/FAILED terminal.
- Old checkout URL orqali CANCELLED actionga simulate-success HTTP 409 qaytarsin,
  action CANCELLED va payment PENDING bo‘lib qolsin.
- Terminal action cancellation/advance/payment control UI’da ko‘rinmasin.
- Lokal Mock EVOS E2E testni to‘liq ishlat va regressionni saqla.
- Deployed evos-sandbox.shopla.uz’ga request yuborma va deployed E2E taskini
  `[x]` qilma. U alohida, keyingi manual/deploy verification bosqichi.

4. Full local simulator E2E
- Local API/provider/portal test harness orqali Find → Quote → Confirm → Action →
  signed Webhook/Payment → Status flow yoz.
- 401, bad HMAC, expired quote, duplicate idempotency, cancellation va invalid
  state transition negative testlari bo‘lsin.

Acceptance criteria:
- Mock EVOS certification required Sauce sabab yiqilmaydi.
- Simulator 401’ni success sifatida ko‘rsatmaydi.
- Client bundle’da webhook secret yoki fake signature yo‘q.
- Tegishli unit/integration/E2E testlar, typecheck va build o‘tadi.
- Faqat lokal/test bilan isbotlangan TASKS.md child bandlari [x] qilinadi;
  deployed verification ochiq qoladi.

QAT’IY CHEKLOV: HECH QANDAY DEPLOY QILMA. Live sandbox, production API,
production webhook, hosting, DNS, database yoki secretlarga tegma.
```

---

## PROMPT 4 — Safe observability, Live Inspector, unmet demand va catalog media

```text
D:\works\DEV\Zayuno repoda ishlaysan. AGENTS.md mavjud bo‘lsa to‘liq o‘qi,
keyin TASKS.md, admin observability, integration/webhook logs, provider portal,
MCP discovery va catalog contracts’ni tekshir. Oldingi promptlarda yaratilgan
canonical publishing/readiness/support qoidalarini qayta yozma.

Quyidagi work-package’ni oxirigacha implement qil:

1. Redaction va safe log persistence
- Mavjud redactForLogs implementatsiyasini reusable shared redaction servicega
  chiqar yoki barcha log yo‘llari bir xil redactor ishlatishini ta’minla.
- password, secret, token, authorization, cookie, api key, card/CVV/OTP, phone,
  email, customer, address/destination, document/passport/PIN, latitude/longitude
  va free-text ichidagi credential/PII redakt qilinsin.
- Raw `/admin/logs/integration` va `/admin/logs/webhooks` endpointlari Prisma
  recordni to‘g‘ridan-to‘g‘ri qaytarmasin; scoped va redacted DTO qaytarsin.
- Imkon qadar sensitive payloadni DBga yozishdan oldin redact qil yoki allowlist
  qilingan diagnostika fieldlarini saqla. Debug uchun raw secret saqlama.
- Depth, array length va string length limitlari bo‘lsin.

2. Live Provider API & Payload Inspector
- Admin va provider portal’da request/response preview, method, safe endpoint,
  status, latency, timestamp, trace ID, retryability, provider va action ID
  ko‘rsatiladigan inspector yarat.
- Provider user faqat o‘z provider loglarini ko‘rsin; admin global ko‘ra olsin.
- Headers va bodies default redacted bo‘lsin. Reveal raw secret tugmasi bo‘lmasin.
- Pagination/filter: provider, source, status, traceId, actionId, date range.
- Empty/loading/error/access-denied va large payload truncation UI holatlari
  bo‘lsin.

3. Unmet Demand Aggregator
- find/search natijasi nol bo‘lganda normalized unmet-demand event yoz:
  query intent/category, geography, requested capability, timestamp, source va
  anonymized/session-safe correlation. Raw prompt, phone, email, address yoki
  user identity saqlama.
- Duplicate/spamni TTL/bucket orqali birlashtir; rate limit va retention policy
  qo‘sh.
- Admin analytics’da Top Missing Categories/Services/Locations, vaqt oralig‘i va
  trend ko‘rinsin.
- Provider mavjud bo‘lib faqat filter juda tor bo‘lgan holatni “platformada
  service yo‘q” deb noto‘g‘ri hisoblama; reason code saqla.

4. Catalog media contract va minimal rich rendering
- Normalized offering contractga backward-compatible media array qo‘sh:
  HTTPS image URL, alt text, order, thumbnail, optional aspect ratio.
- URL validation: faqat http(s) policyga mos public HTTPS, credential yo‘q,
  private/local IP va unsafe scheme yo‘q. Broken/empty media fallback bo‘lsin.
- MCP/text clients structured data va image link fallbackni olsin; media rich UI
  action/quote uchun majburiy bo‘lmasin.
- Provider portal/catalog preview’da accessible image cards va fallback state
  qo‘sh; mavjud image’siz providerlar buzilmasin.

Acceptance criteria va testlar:
- Raw admin log endpointlaridan secret/PII chiqmasligini nested fixtures bilan
  isbotla; export ham tekshirilsin.
- Provider A Provider B logini ko‘rolmasligi authorization testida isbotlansin.
- Inspector filters/pagination/truncation va UI build testlari o‘tsin.
- Unmet demand zero-result, dedupe, privacy va aggregation testlari bo‘lsin.
- Media schema/backward compatibility, unsafe URL rejection, image fallback va
  MCP serialization testlari bo‘lsin.
- Tegishli tests/typecheck/buildni ishlat va faqat isbotlangan TASKS.md bandlarini
  [x] qil.

Out of scope: Integration Studio/OpenAPI auto-mapping, Telegram/native mini-app,
Recruitment, co-founder matching va cargo vertikallarini hozir implement qilma;
ular pilotdan keyingi alohida product initiatives bo‘lib qoladi.

QAT’IY CHEKLOV: deploy qilma, production log/data/secretlarga tegma, live external
servicega request yuborma.
```

---

## Agent yakunlagach tekshirish tartibi

Har bir promptdan keyin agentning yakuniy javobi va `git diff` saqlanadi. To‘rtta
prompt tugagach boshqa agentga yangi implementatsiya bermasdan avval quyidagilar
tekshiriladi:

1. `git status` va to‘liq diff.
2. Har bir `[x]` band uchun kod va test dalili.
3. Root test/build, API, MCP, provider portal va admin build natijalari.
4. Security review: publishing bypass, secret exposure, cross-provider access,
   action confirmation va state-machine regressionlari.
5. Faqat shundan keyin chala yoki noto‘g‘ri qolgan joylar uchun alohida repair
   promptlar yoziladi.

