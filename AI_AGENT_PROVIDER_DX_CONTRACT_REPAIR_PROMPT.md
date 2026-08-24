# AI AGENT PROMPT — Provider DX Contract Parity, Validation va Onboarding Repair

Sen Zayuno monoreposida ishlayotgan kuchli senior platform engineer va developer-experience architect sifatida ushbu vazifani boshidan oxirigacha mustaqil bajar.

Repository:

    D:\works\DEV\Zayuno

Asosiy maqsad:

Tashqi provider dasturchisi Zayuno Provider Portal bergan brief, Documentation, OpenAPI yoki starter kodni aynan ko‘chirib implement qilsa, certification validator yashirin talab yoki hujjatlashtirilmagan endpoint sabab yiqilmasin. Portal, contract, runtime validator, certification runner, OpenAPI, Postman, AI brief va SDK bir xil canonical source of truth asosida ishlasin.

Bu faqat UI matnlarini almashtirish vazifasi emas. Muammoni contract darajasida to‘liq tuzat. Eski workaround yoki yangi parallel source of truth yaratma.

## Muhim cheklovlar

- Zayuno universal provider/capability arxitekturasini buzma.
- Food, ticketing, recruitment, logistics, booking va digital service vertikallari bir xil core orqali ishlashda davom etsin.
- Mavjud publishing gate, certification, tenant isolation, idempotency, webhook HMAC, redaction va credential security himoyalarini zaiflashtirma.
- Validatorni briefga moslashtirish uchun majburiy maydonlarni shunchaki optional qilib yuborma.
- Hujjatni validatorga moslashtirish bilan cheklanma; barcha qatlamlar bitta canonical contractdan generatsiya qilinsin.
- Legacy providerlar uchun zarur bo‘lsa normalization faqat aniq adapter boundary’da bo‘lsin. Canonical outward contract qat’iy qolishi kerak.
- Frontend browser bundle ichiga API key, provider secret, webhook secret yoki boshqa maxfiy qiymat kiritma.
- SSRF himoyasini zaiflashtirma.
- Soxta provider, fake metric, fake success yoki demo fallback qo‘shma.
- MCP server yaratma yoki qayta arxitektura qilma.
- Telegram Bot SDK qo‘shma.
- Production deploy qilma.
- Git push qilma. Ishni, testlarni va buildni yakunlab, commitga tayyor holatda qoldir.
- Mavjud user o‘zgarishlarini o‘chirib yuborma.

## Avval bajariladigan audit

Kod yozishdan oldin quyidagi qatlamlarni o‘qib, haqiqiy current contractni xaritalab ol:

1. packages/contracts ichidagi barcha Zod request/response schemalar.
2. packages/contracts/src/provider-protocol.ts canonical manifesti.
3. packages/provider-sdk/src/remote-http-adapter.ts runtime validation.
4. packages/provider-sdk/src/certification.ts certification lifecycle.
5. apps/provider-portal/src/OnboardingWizard.tsx integration brief va URL checker.
6. apps/provider-portal/src/DocsViewer.tsx docs/OpenAPI/Postman download UI.
7. apps/provider-portal/src/ai-integration-kit.ts AI exportlari.
8. apps/api provider onboarding, health check va certification endpointlari.
9. packages/cli generator, doctor va test buyruqlari.
10. Mavjud tests/test-provider-contract-dx-parity.ts va boshqa onboarding/certification testlari.

Audit natijasida endpoint × request schema × response schema × capability × required/optional × certification dependency matritsasini ichki working note sifatida tuz. Keyingi implementation shu matritsaga mos bo‘lsin.

---

# PHASE 1 — Bitta haqiqiy canonical Provider Contract

## 1.1 Canonical endpoint manifestini to‘liq qil

packages/contracts/src/provider-protocol.ts manifesti validator va certification ishlatadigan barcha provider-hosted endpointlarni o‘z ichiga olishi shart.

Hozir certification katalogdan offering tanlagach GET /offerings/:id chaqiradi. Bu endpoint canonical manifest, brief va OpenAPI’da ham aniq ko‘rsatilishi kerak.

Quyidagilardan birini ongli tanla:

- Agar GET /offerings/:id haqiqiy CATALOG contractning majburiy qismi bo‘lsa, uni alohida canonical endpoint sifatida qo‘sh, DISCOVERY_READONLY va TRANSACTIONAL profillari uchun required qil va catalog testiga dependency sifatida bog‘la.
- Agar product qarori bo‘yicha u optional bo‘lishi kerak bo‘lsa, certification uni majburiy chaqirmasin va barcha docs/checklistlarda optional deb ko‘rsatsin.

Current platform behavior bilan eng kam breaking change beradigan variantni tanla. Tanlovni docs/PROVIDER_DX_FEEDBACK_IMPLEMENTATION.md yoki yangi decision note’da qisqa asosla. Hech qachon certification chaqiradigan endpoint docs/manifestdan yashirin qolmasin.

## 1.2 Endpoint definition schema referencesga ega bo‘lsin

Har bir manifest endpoint quyidagilarni canonical tarzda bog‘lasin:

- request schema yoki request yo‘qligi;
- response schema;
- to‘liq valid request example;
- to‘liq valid response example;
- capability;
- required/optional holati;
- profile;
- dependency;
- request direction;
- docs anchor;
- legacy aliaslar faqat mavjud bo‘lsa.

Faqat type: object placeholder ishlatma.

## 1.3 Catalog example haqiqiy valid bo‘lsin

/catalog response example bo‘sh offerings array bilan tugamasin. Kamida bitta OfferingSchema’dan 100% o‘tadigan offering ko‘rsatsin.

Namuna quyidagi majburiy maydonlarni yashirmasin:

- id
- providerId
- offeringCode
- title
- basePrice
- currency
- isAvailable
- variants
- optionGroups
- tags
- metadata

Categories ishlatilsa CatalogCategorySchema talablariga ham to‘liq mos bo‘lsin.

GET /offerings/:id response example ham xuddi shu canonical offering bilan izchil bo‘lsin.

providerId va offeringCode current runtime contractda majburiy bo‘lsa, brief va schema’da aniq ko‘rsat. Ularni yashirin talab sifatida qoldirma. Agar ularni olib tashlashga qaror qilsang, bu katta contract migration ekanini tan ol va API, adapters, persistence, tests, docs hamda backward compatibilityni birgalikda hal qil. Shunchaki optional qilish mumkin emas.

## 1.4 Example driftni avtomatik to‘xtat

Manifestdagi barcha requestExample va responseExample qiymatlari tegishli Zod schema bilan test vaqtida parse qilinsin.

Test:

- har bir canonical example o‘z schemasidan muvaffaqiyatli o‘tadi;
- endpoint manifestida certification ishlatadigan endpointlarning barchasi mavjud;
- required profile endpointlarida request/response schema reference yo‘qolmagan;
- bir endpointning docs va runtime pathi farq qilmaydi.

---

# PHASE 2 — Haqiqiy OpenAPI 3.1 va JSON Schema

## 2.1 Placeholder OpenAPI schemalarni olib tashla

Hozirgi generated OpenAPI’da requestBody ko‘pincha faqat type: object va example beradi. Bu yetarli emas.

Zod schemalardan haqiqiy OpenAPI 3.1 compatible JSON Schema generatsiya qil. Repositorydagi dependencylarni avval tekshir. Kerak bo‘lsa yaxshi qo‘llab-quvvatlanadigan minimal dependency qo‘sh, lekin bir xil schema’ni qo‘lda qayta yozma.

OpenAPI components.schemas ichida kamida quyidagilar real property/required/type/format/enum constraints bilan bo‘lsin:

- ProviderInfo
- Health
- CatalogCategory
- Offering
- OfferingVariant
- OptionGroup
- OptionItem
- Catalog
- Quote request va response
- Action create request va response
- Action status response
- Cancellation request va response
- Payment option
- Webhook event
- Error response

Endpointlar inline generic object emas, components schema reference ishlatsin.

## 2.2 OpenAPI operatsiyalari to‘liq bo‘lsin

Har bir provider-hosted endpoint uchun:

- method va path;
- operationId;
- summary va description;
- auth security scheme;
- path/query parameters;
- requestBody;
- 200 response;
- relevant 400, 401, 404, 409, 422 va 500 responses;
- examples;
- required/optional capability metadata.

Provider Zayuno’ga yuboradigan webhook ingestion endpoint provider-hosted paths ichiga aralashmasin. Uni alohida webhook/callback yoki aniq x-zayuno extension bilan ko‘rsat.

## 2.3 Auth methodlar

OpenAPI’da API_KEY, BEARER_TOKEN va HMAC_SIGNATURE uchun tushunarli security scheme yoki vendor extension bo‘lsin. Generatsiya tanlangan provider auth methodiga mos variant berishi mumkin, lekin maxfiy qiymat export ichiga kirmasin.

## 2.4 Download artefaktlar

Portal quyidagilarni yuklab olishga ruxsat bersin:

- OpenAPI 3.1 JSON;
- OpenAPI 3.1 YAML, agar mavjud dependency bilan xavfsiz va sodda bo‘lsa;
- Postman collection;
- canonical JSON examples yoki contract bundle.

Postman collection canonical manifestdan yaralsin va GET /offerings/:id kabi barcha haqiqiy endpointlarni o‘z ichiga olsin.

Test:

- generated OpenAPI valid 3.1 document;
- paths ro‘yxati runtime/certification bilan parity;
- Offering required maydonlari schema’da ko‘rinadi;
- request/response generic empty object emas;
- secrets yo‘q;
- provider-to-Zayuno webhook direction noto‘g‘ri ko‘rsatilmagan.

---

# PHASE 3 — Integration Brief va Documentation parity

## 3.1 Brief faqat canonical manifestdan yaralsin

OnboardingWizard integration briefida endpoint yoki JSON response’larni qo‘lda alohida saqlama.

Brief:

- tanlangan profile uchun barcha required endpointlarni;
- e’lon qilingan optional capability endpointlarini;
- har endpointning valid request/response example’ini;
- majburiy fieldlar ro‘yxatini;
- auth header formatini;
- webhook directionni;
- idempotency talabini;
- quote math talabini;
- docs deep-linkini;
- OpenAPI va Postman download manzilini

aniq ko‘rsatsin.

Catalog briefda offering ichidagi providerId, offeringCode va basePrice kabi majburiy maydonlar ko‘rinishi shart.

## 3.2 Docs ham canonical source ishlatsin

DocsViewer ichidagi endpoint jadvallari, capability checklist va code examplelar manifest/schemas bilan drift qilmasin.

Qo‘lda yozilgan tutorial matni qolishi mumkin, ammo endpoint path, required fields va JSON examples canonical helper/component orqali chiqarilsin.

Documentation’da alohida “Validator aynan nimani tekshiradi?” bo‘limi bo‘lsin:

- endpoint;
- schema;
- required fields;
- certification dependency;
- xato misoli;
- to‘g‘ri misol.

## 3.3 AI Kit

AI uchun integration brief:

- canonical contract bundle’ni tushunsin;
- haqiqiy schemas va examples bersin;
- dasturchining tanlagan stackiga mos starter yaratishi uchun yetarli bo‘lsin;
- hech qanday real credential yoki PII nusxalamasin;
- contract versionni ko‘rsatsin.

AI Kit, human docs va validator o‘rtasida path yoki field drift bo‘lmasligi test qilinsin.

---

# PHASE 4 — URLni backend orqali xavfsiz tekshirish

## 4.1 Browser fetchni olib tashla

Onboarding 4-qadamdagi URLni tekshirish provider /health endpointiga browserdan to‘g‘ridan-to‘g‘ri fetch qilmasin.

Yangi oqim:

    Provider Portal
        -> authenticated Zayuno API check endpoint
        -> provider Base URL /health
        -> sanitized diagnostic response

Frontend faqat Zayuno API’ni chaqirsin.

## 4.2 Backend check endpoint

Onboarding draft hali yaratilmagan holatda ham ishlaydigan, login qilingan provider owner/developer uchun endpoint yarat.

Masalan:

    POST /api/v1/providers/integration/check-url

Body:

    {
      "baseUrl": "https://api.business.uz/zayuno",
      "authMethod": "API_KEY"
    }

Credentialni ushbu preflight uchun majburiy qilma; birinchi navbatda /health public/readiness response tekshirilsin. Agar auth kerak bo‘lsa, UI “server reachable, ammo endpoint credential talab qildi” deb aniq ajratsin.

## 4.3 SSRF va abuse himoyasi

Backend fetch qat’iy himoyalangan bo‘lsin:

- productionda faqat HTTPS;
- URL username/password rad etilsin;
- localhost, private, loopback, link-local, multicast, reserved va cloud metadata IPv4/IPv6 bloklansin;
- hostname DNS resolve qilinib, barcha resolved addresslar tekshirilsin;
- DNS rebindingga qarshi connection vaqtida resolved address nazorati yoki xavfsiz transport strategiyasi ishlatilsin;
- redirectlar o‘chirilishi yoki har redirect target qayta tekshirilishi kerak;
- port policy aniq bo‘lsin;
- qisqa connect va total timeout;
- response body maksimal hajmi cheklansin;
- faqat JSON/readiness uchun kerakli qismi parse qilinsin;
- response HTML, stack trace, internal IP va secret foydalanuvchiga qaytarilmasin;
- rate limit;
- audit event redacted yozilsin;
- provider URL boshqa tenant credentialiga ulanmasin.

Existing SSRF utility bo‘lsa qayta ishlat va markazlashtir. Bir xil URL safety logicni frontend/backendda alohida nusxalama.

## 4.4 Foydalanuvchi xabarlari

UI quyidagilarni aniq farqlasin:

- URL formati noto‘g‘ri;
- HTTPS talab etiladi;
- private/internal address bloklandi;
- DNS topilmadi;
- TLS xatosi;
- timeout;
- connection refused;
- /health 404;
- 401/403: server topildi, credential talab qilmoqda;
- 200, ammo response schema noto‘g‘ri;
- 200 va HealthSchema valid.

Texnik stack trace ko‘rsatma. Developer uchun status code, latency, endpoint va docs link yetarli.

Test:

- frontend provider domenini bevosita fetch qilmaydi;
- backend public HTTPS test serverni tekshiradi;
- private IPv4/IPv6 va redirect bypass bloklanadi;
- DNS rebinding himoyasi tekshiriladi;
- rate limiting;
- response redaction;
- friendly diagnostics.

---

# PHASE 5 — Certification diagnostics: Contract lint va Lifecycle E2E

## 5.1 SKIPPED semantikasini saqla

Catalog yiqilganida Quote va Action uchun real offering/quote/action ID yo‘q. Downstream testlarni soxta ID bilan ishga tushirma.

Shuning uchun:

- root muammo FAIL;
- unga bog‘liq bajarib bo‘lmaydigan test SKIPPED;
- blockedBy maydoni aniq;
- SKIPPED alohida mustaqil xato sifatida hisoblanmasin.

Bu to‘g‘ri dependency behaviorni saqla.

## 5.2 Bitta response ichidagi barcha schema xatolarni ber

Zod validation birinchi xatoda to‘xtamasin. Bir response ichidagi barcha issue’larni structured tarzda qaytarsin:

- endpoint;
- JSON path;
- code;
- expected;
- received type yoki xavfsiz preview;
- message;
- docs URL;
- fix example.

Secret yoki PII received preview’da chiqmasin.

Misol: /catalog bir vaqtda providerId, offeringCode va basePrice yo‘q bo‘lsa, uchalasi bitta test run’da ko‘rinsin.

## 5.3 Ikki bosqichli certification

Certification reportni mantiqan ikki qismga ajrat:

### A. Contract & Schema Readiness

- declared capabilities;
- endpoint availability;
- auth reachability;
- har mustaqil response schema;
- catalog ichidagi barcha offeringlarni yoki xavfsiz cheklangan namunani validate qilish;
- manifest/docs version;
- webhook configuration readiness.

### B. Lifecycle E2E

- catalog discovery;
- single offering lookup;
- quote;
- quote math;
- action create;
- idempotency;
- action status;
- optional payment options;
- optional cancel;
- webhook HMAC.

Contract lint imkon qadar barcha mustaqil muammolarni bir run’da ko‘rsatsin. Lifecycle test dependencies sabab SKIPPED bo‘lishi mumkin.

## 5.4 Portal UX

Certification UI:

- “Asosiy xato” blokini yuqorida ko‘rsatsin;
- “Yana topilgan schema muammolari” ro‘yxatini ko‘rsatsin;
- “Ushbu xato sabab bajarilmadi” SKIPPED bo‘limini alohida ko‘rsatsin;
- har issue uchun docs deep-link;
- JSON path copy;
- expected example copy;
- OpenAPI download CTA;
- qayta test qilish CTA.

2/10 kabi raqam dasturchini chalg‘itmasin. PASS, FAIL va BLOCKED alohida ko‘rsatilishi kerak.

Test:

- catalog response’da uchta missing field bo‘lsa bitta run’da uchalasi qaytadi;
- quote/action testlari catalog fail sabab SKIPPED va blockedBy=catalog;
- SKIPPED mustaqil root failure emas;
- UI structured issuesni ko‘rsatadi;
- logs yoki reportda secrets yo‘q.

---

# PHASE 6 — Universal dynamic parameter schema

## 6.1 Record<string, any>ni buzmasdan formal declaration qo‘sh

Mavjud parameters orqali logistics, food, booking, ticketing va recruitment kontekstlari uzatiladi. Backward compatibilityni saqla.

Lekin AI va developer kerakli parametrlarni taxmin qilmasligi uchun optional, standard JSON Schema asosidagi declaration qo‘sh.

Minimal model:

- provider-level operation parameter schemas: search, catalog, quote, action;
- offering-level override yoki extension;
- schema optional bo‘lsin;
- schema bo‘lmasa current generic parameters behavior ishlasin.

JSON Schema xavfsiz subsetidan foydalan:

- object/properties/required;
- string, number, integer, boolean, array, object;
- enum;
- format;
- minimum/maximum;
- minLength/maxLength;
- description;
- examples/default.

Remote external ref, executable expression, script, HTML yoki cheksiz recursive schema qabul qilma. Schema depth va size limitlari bo‘lsin.

## 6.2 Sensitive field boundary

Dynamic schema orqali quyidagilarni chatdan talab qilish yoki parameters ichiga joylashga ruxsat berma:

- card number;
- CVV;
- OTP;
- banking password;
- passport/PINFL kabi identity documentlar, agar provider-owned secure handoff talab qilinsa;
- API secret/token.

Existing findForbiddenParameterKey va redaction policy bilan integratsiya qil.

## 6.3 AI va UI foydalanishi

- catalog/search response kerakli parameter schema’ni AI’ga qaytarsin;
- MCP tool output canonical schema’ni texnik raw field sifatida saqlashi mumkin, ammo customerMessage ichiga schema dump qilmasin;
- AI yetishmayotgan required parameterlarni tabiiy tilda so‘ray olsin;
- Portal docs’da logistics misoli berilsin: weightKg, dimensionsCm, isFragile;
- booking misoli: startDate, endDate, guests;
- ticketing misoli: origin, destination, departureDate, passengers.

Bu yangi alohida capability bo‘lmasin. Mavjud SEARCH/CATALOG/QUOTE/ACTION contract extensioni bo‘lsin.

Test:

- provider schema’si parse/validate bo‘ladi;
- offering override ishlaydi;
- invalid/excessive/external-ref schema rad etiladi;
- forbidden sensitive fields rad etiladi;
- old provider schema bermasa ham ishlashda davom etadi;
- different vertical examples core o‘zgarishsiz ishlaydi.

---

# PHASE 7 — CLI va starter parity

packages/cli starter template, zy doctor va zy test buyruqlarini yangi canonical contractga moslashtir.

- Express, FastAPI va Go starterlar valid provider-info, health, catalog va single offering endpointini implement qilsin.
- Generated catalog OfferingSchema’dan o‘tsin.
- Transactional starter bo‘lsa quote/action/status schemasiga mos bo‘lsin.
- zy doctor backend URL reachability va contract mismatchni structured ko‘rsatsin.
- zy test certificationdagi bir xil schema validatorlardan foydalansin.
- CLI alohida qo‘lda yozilgan endpoint ro‘yxatini saqlamasin.

CLI uchun deploy command qo‘shma.

---

# PHASE 8 — Regression va acceptance suite

Yangi yagona regression suite yarat yoki mavjud test-provider-contract-dx-parity.ts ni kengaytir.

Majburiy acceptance holatlari:

1. Canonical manifest certification chaqiradigan barcha endpointlarni qamrab oladi.
2. GET /offerings/:id docs, brief, OpenAPI, Postman, starter va validator orasida parity.
3. Catalog example OfferingSchema’dan o‘tadi.
4. providerId, offeringCode va basePrice brief/OpenAPI’da ko‘rinadi.
5. Har endpoint request/response example o‘z Zod schemasidan o‘tadi.
6. OpenAPI request/response schemas generic empty object emas.
7. OpenAPI’da real required fields mavjud.
8. AI brief va human docs endpoint pathlari manifest bilan bir xil.
9. URL check browserdan providerga bevosita chiqmaydi.
10. Backend URL checker SSRF/DNS rebinding/redirect/private IPv4/IPv6 hujumlarini bloklaydi.
11. Bitta invalid catalog response barcha Zod issuesni bir run’da qaytaradi.
12. Lifecycle dependency fail holatida downstream SKIPPED va blockedBy to‘g‘ri.
13. Dynamic parameter schema backward compatible.
14. Sensitive parameterlar bloklanadi.
15. Portal/exports/loglarda secrets yo‘q.
16. Read-only provider quote/action/webhook talab qilmaydi.
17. Transactional provider barcha required lifecycle endpointlarini ko‘rsatadi.
18. Existing publishing gate va certification security regressiya qilmaydi.

Quyidagilarni ishga tushir:

    pnpm test:review
    pnpm build

Shuningdek tegishli yangi testlarni alohida ishga tushir.

Frontend o‘zgargan bo‘lsa provider portal production buildni tekshir.
API o‘zgargan bo‘lsa API buildni tekshir.
CLI o‘zgargan bo‘lsa CLI build va help/doctor commandlarini tekshir.

git diff --check bajar.

Secret scan qil:

- real API key;
- Bearer token;
- webhook secret;
- session token;
- email verification token;
- private customer data.

Test fixture secretlari aniq fake bo‘lishi kerak.

---

# Yakuniy hisobot formati

Ish tugagach quyidagicha xolis hisobot ber:

1. Root causes.
2. Canonical contract bo‘yicha qabul qilingan qarorlar.
3. O‘zgartirilgan fayllar.
4. Brief/Docs/OpenAPI/Validator parity natijasi.
5. Backend URL check xavfsizlik natijasi.
6. Certification FAIL va SKIPPED semantikasi.
7. Dynamic parameter schema yechimi.
8. Backward compatibility.
9. Testlar va aniq pass/fail sonlari.
10. Build natijalari.
11. Qolgan real cheklovlar yoki roadmap — bo‘lsa yashirma.
12. Git status.

“100% production ready” deb dalilsiz yozma. Test qilinmagan narsani test qilindi deb ko‘rsatma.

Production deploy qilma va git push qilma.
