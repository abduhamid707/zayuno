# Zayuno Provider Portal — Google OAuth, email auth va xavfsiz sessiya

Sen `D:\works\DEV\Zayuno` repozitoriysida ishlaysan. Vazifani auditdan boshlab implementatsiya, migratsiya, test, browser tekshiruvi va yakuniy hisobotgacha **7 bosqichda uzluksiz tugat**. Oddiy implementatsiya qarorlari uchun savol bermagin. Google credential yoki tashqi console sozlamasi yetishmasa, `.env.example`, kod, mock testlar va aniq setup hujjatini tugat; credentialni kutib qolma. Maxfiy kalitlarni kodga, logga yoki `TASKS.md`ga yozma.

## Yakuniy natija

Provider portalga kirish va ro‘yxatdan o‘tish bitta professional auth oqimiga aylansin:

- Google orqali kirish va yangi provider hisobini yaratish ishlasin.
- Email + parol orqali kirish va ro‘yxatdan o‘tish ham qolsin.
- Google tasdiqlagan email uchun Zayuno alohida email tasdiqlash talab qilmasin.
- Email signupdagi hozirgi uzun token kiritish va alohida provider aktivatsiya sahifasi olib tashlansin. Email egaligini signup ichidagi 6 xonali OTP yoki magic link bilan tasdiqla; muvaffaqiyatdan keyin hisob darhol ochilsin.
- Sessiya browser yangilanganda va qayta ochilganda tiklansin.
- Auth tokenlari `localStorage` yoki `sessionStorage`da saqlanmasin.
- Tizimga kirmagan foydalanuvchi sidebar va headerda ishlata olmaydigan bo‘limlarni ko‘rmasin.
- Himoyalangan URL ochilsa katta qulf kartasi chiqmasin; auth sahifasiga xavfsiz `returnTo` bilan yo‘naltirilsin.
- Yangi provider onboardingga, draft provider saqlangan bosqichiga, faol provider boshqaruv paneliga tushsin.

## O‘zgarmas qarorlar

1. Google OAuth uchun server-side Authorization Code flow, PKCE, `state` va `nonce` ishlat. Frontend yuborgan Google profiliga ishonma; identity serverda tekshirilsin.
2. Access token qisqa umrli bo‘lsin. Uzoq sessiya uchun random opaque refresh token yarat, bazada faqat hashini saqla, rotation va reuse detection qo‘llansin.
3. Refresh/session cookie `HttpOnly`, productionda `Secure`, mos `SameSite`, `Path`, `Domain` va expiry bilan berilsin. Frontend API so‘rovlari `credentials: 'include'` ishlatsin.
4. Access token, refresh token, Google access/ID token va user obyektini browser storagega yozma. Hozirgi `zayuno_provider_token` hamda `zayuno_provider_user` localStorage ishlatilishini olib tashla va eski qiymatlarni bir martalik cleanup qil.
5. Logout server sessiyasini bekor qilsin va cookieni o‘chirsin. Refresh token oilasi rotation/reuse holatida revoke qilinsin.
6. Bir xil verified email bilan Google va email hisoblarini xavfsiz link qil. Role yoki provider ownershipni frontend inputidan olma. Default yangi hisob `PROVIDER_OWNER` bo‘lsin.
7. Email orqali ro‘yxatdan o‘tishda umuman ownership tekshiruvisiz hisob ochma. Biroq bu tekshiruv alohida noqulay provider approval emas, auth oqimining ichidagi qisqa OTP/magic link bo‘lsin.
8. Public sahifalar authsiz ochilsin. Providerga tegishli ma’lumot, log, API tekshiruvi va boshqaruv bo‘limlari authsiz na navigatsiyada, na API javobida ko‘rinsin.
9. Consumer/mobile auth, Shopla, MCP/order oqimi, provider contract va food agent kodiga tegma. Zarur bo‘lmagan refactor qilma.
10. Repozitoriydagi boshqa agent o‘zgarishlarini saqla; ularni revert yoki overwrite qilma.

## 1-bosqich — Audit va aniq route/auth matritsasi

- Avval `AGENTS.md` va `TASKS.md`ni o‘qi. Shu ish uchun checklist och va har bosqichni faqat real tugagach `[x]` qil.
- Quyidagilarni tekshir: `apps/provider-portal/src/AuthView.tsx`, `App.tsx`, `ProtectedGate.tsx`, `WorkspaceShell.tsx`, `workspace-model.ts`, API auth controller/service/module/strategy, Prisma schema va env konfiguratsiyasi.
- Dublikat auth oqimlarini aniqlab, bitta canonical auth UI va bitta auth state tizimini tanla.
- Route matritsasini yoz:
  - signed-out public: `Boshlash`, `Hujjatlar` va faqat haqiqatdan public bo‘lgan sahifalar;
  - signed-in only: `Mening biznesim`, providerga bog‘liq `Sinov muhiti`, `Integratsiyani tekshirish`, `So‘rovlar jurnali` va maxfiy ma’lumotli sahifalar;
  - onboarding holatlari: new, draft, submitted/review, active, suspended.
- `returnTo` faqat ichki allowlist route bo‘lsin; open redirect bo‘lmasin.
- Audit xulosasi va tanlangan endpoint nomlarini `TASKS.md`ga yoz, keyin implementatsiyani darhol davom ettir.

## 2-bosqich — Database va sessiya modeli

- OAuth account uchun `passwordHash`ni nullable qilish yoki alohida `AuthIdentity` modelini qo‘shish variantlarini tekshir. Kelajakda boshqa providerlar uchun kengayadigan `AuthIdentity` afzal:
  - `userId`, `provider`, `providerSubject`, provider bo‘yicha unique constraint, timestamps;
  - Google subject asosiy tashqi identifikator bo‘lsin, email emas.
- `User`ga `emailVerifiedAt` kabi aniq verification holatini qo‘sh.
- Provider portal uchun sessiya modeli yarat: user, token hash, family id, expiry, revokedAt, replacedBy, lastUsedAt, timestamps. IP/user-agent kerak bo‘lsa raw holda uzoq saqlama.
- Existing active/verified provider userlarni buzmaydigan migratsiya yoz. Faol va oldin tasdiqlangan hisoblargagina oqilona backfill qil; barcha inactive userlarni verified qilma.
- Admin va consumer modellari/regressiyalarini buzma.
- Prisma format/generate va migration validationni bajar.

## 3-bosqich — Backend auth endpointlari

- Google start va callback endpointlarini implement qil. PKCE verifier, `state`, `nonce` qisqa umrli, bir martalik va server nazoratida bo‘lsin.
- Callbackda Google identityni serverda tekshir: issuer, audience, expiry, nonce va `email_verified` talablarini validatsiya qil.
- Yangi Google user yaratish, mavjud verified email hisobiga xavfsiz link qilish va mavjud Google identity bilan login qilishni implement qil.
- Email/password signupni bitta silliq oqim qil: register → OTP/magic link → activate/session. Eski raw verification token UXni olib tashla. Resend va verify endpointlari enumeration-safe, rate-limited va expiry/attempt limitli bo‘lsin.
- Password hash siyosati va mavjud password loginni saqla.
- Quyidagi sessiya endpointlarini qo‘sh yoki canonical qil: session/me bootstrap, refresh, logout; kerak bo‘lsa all-sessions logout.
- Refresh rotation, reuse detection, revoked/expired session, disabled user va role tekshiruvlarini implement qil.
- Cookie/CORS/CSRFni lokal hamda production frontend/API originlariga mos sozla. Origin/domainni taxmin qilma: mavjud env/deploy configdan aniqlagin.
- Xatolarda token, credential yoki account mavjudligini oshkor qilma. Auth audit loglarida maxfiy qiymat bo‘lmasin.

## 4-bosqich — Frontend auth client va sessiya bootstrap

- Provider portalda yagona `AuthProvider`/auth client yarat: `loading`, `signedOut`, `signedIn`, `error` holatlari bo‘lsin.
- App ochilganda cookie-backed session endpoint orqali userni tikla. Yuklanish paytida signed-out sahifani bir lahza ko‘rsatib yuborma.
- Barcha provider API chaqiruvlarini credential-aware client orqali yubor. 401 kelganda bitta refresh urinishini qil; parallel 401larni bitta refresh promisega birlashtir; infinite retry qilma.
- Refresh muvaffaqiyatsiz bo‘lsa state tozalansin va current protected route `returnTo` bilan authga o‘tsin.
- Eski localStorage token/user o‘qish va yozishni olib tashla. Legacy keylarni bir marta o‘chir.
- OAuth callbackdagi loading/success/error/back-navigation holatlarini to‘liq ishlat.

## 5-bosqich — Auth UI, sidebar va route himoyasi

- `ProtectedGate`dagi “Himoyalangan bo‘lim” qulf kartasini asosiy UX sifatida olib tashla. Direct protected route server ma’lumotini yuklamasdan dedicated auth sahifasiga o‘tsin.
- Dublikat auth modal va takroriy login/signup handlerlarini olib tashla; bitta professional auth sahifasi qolsin.
- Auth sahifasida:
  - Zayuno brendi va bitta aniq sarlavha;
  - asosiy `Google bilan davom etish` tugmasi;
  - dividerdan keyin email + parol;
  - login/signup rejimini sodda almashtirish;
  - email signupdan keyin 6 xonali OTP yoki magic-link kutish UI;
  - loading, disabled, retry, invalid/expired code va network error holatlari;
  - mobil, klaviatura, focus va accessible label holatlari.
- Google tugmasi login va register uchun bir xil ishlasin: mavjud hisobga kiradi, yangi hisobni yaratadi.
- Signed-out sidebar faqat public navigatsiyani ko‘rsatsin. Yashirilgan itemlarning bo‘sh section sarlavhalari ham qolmasin.
- Signed-in sidebar provider holatiga qarab faqat foydalanishi mumkin bo‘lgan itemlarni ko‘rsatsin.
- Login tugagach xavfsiz `returnTo` bo‘lsa o‘sha yerga, aks holda:
  - provider yo‘q → onboarding boshlanishi;
  - draft/submitted → saqlangan holat/status;
  - active → provider dashboard;
  - suspended → tushunarli status sahifasi.
- UI o‘zbekcha asosiy copy bilan tabiiy va qisqa bo‘lsin; texnik token/credential terminlarini oddiy providerga ko‘rsatma.

## 6-bosqich — Testlar va security regressiyalar

Mazmunli testlar yoz va mavjud testlarni yangila:

- Google callback: valid flow, invalid/expired state, nonce mismatch, PKCE mismatch, forged identity, wrong audience/issuer, unverified email.
- Account linking: yangi Google user, existing verified email, conflicting identity, provider role/ownership o‘zgarmasligi.
- Email auth: signup, OTP/magic link expiry, attempt/resend rate limit, enumeration-safe response, password login.
- Session: bootstrap, refresh rotation, old refresh token reuse, logout, expired/revoked session, disabled user, concurrent refresh.
- Route/UI: signed-out sidebar, public docs/overview, direct protected URL + `returnTo`, open redirect rejection, auth reload, new/draft/active/suspended routing.
- Automated testda real Google’ga murojaat qilma; verifier/adapterni dependency sifatida inject qilib mock qil.
- API authorization testida authsiz provider data chiqmasligini isbotla.
- Mavjud admin/consumer/provider regressiyalaridan tegishlilarini ishga tushir.

## 7-bosqich — Build, browser QA, hujjat va handoff

- Prisma generate/migration check, API build/test, provider portal build/test va `git diff --check`ni bajar.
- Lokal browserda desktop va mobile viewportda tekshir:
  - signed-out public sidebar;
  - email login/signup/OTP;
  - Google button start/callback error mock holati;
  - reload bilan sessiya tiklanishi;
  - protected URL return;
  - logout;
  - new/draft/active/suspended ko‘rinishlari.
- `.env.example` va auth setup hujjatini placeholderlar bilan yangila. Kamida quyidagilarni aniq hujjatlashtir: Google client ID/secret, callback URL, portal URL, cookie/session secret, allowed origins, lokal va production redirect URI. Real qiymat yozma.
- Google Cloud Console’da kerak bo‘ladigan consent screen, authorized origin va exact callback URI qadamlarini yoz.
- `TASKS.md`da o‘zgargan fayllar, migratsiya, test natijalari, qolgan tashqi setup va risklarni qayd et.
- Ishni commit/pushga tayyor toza holatda yakunla. Operator aniq buyurmagan bo‘lsa push yoki deploy qilma.

## Definition of Done

Vazifa faqat quyidagilarning barchasi bajarilganda tugagan hisoblanadi:

- Google orqali login va register bitta oqimda ishlaydi.
- Email/password login va signup ishlaydi; raw token kiritish yo‘q.
- Google userdan qo‘shimcha email confirmation so‘ralmaydi.
- Auth tokenlari browser storageda yo‘q; refresh cookie HttpOnly va rotationli.
- Reload/reopen sessiyani xavfsiz tiklaydi; logout uni serverda revoke qiladi.
- Signed-out sidebar protected itemlarni ko‘rsatmaydi.
- Protected deep-link authdan keyin xavfsiz qaytadi.
- Provider holatiga mos landing ishlaydi.
- Migratsiya eski provider/admin/consumer foydalanuvchilarini buzmaydi.
- Security va UI testlari, buildlar va `git diff --check` muvaffaqiyatli.
- Tashqi Google credential bo‘lmasa ham kod, mock test, env va setup hujjati to‘liq tayyor.

## Ishlash qoidasi

Bosqichlar orasida to‘xtama va foydalanuvchidan routine tasdiq so‘rama. Bir muammo topsang, sababini aniqlab tuzat, tegishli testni qayta ishga tushir va keyingi bosqichga o‘t. Faqat haqiqiy tashqi blokerni yakuniy hisobotda aniq yoz; u mustaqil bajariladigan ishlarni to‘xtatmasin. Har bosqichdan keyin `TASKS.md`ni yangila.

Yakuniy hisobot quyidagi tartibda bo‘lsin:

1. Ishlaydigan yakuniy flow.
2. O‘zgargan fayllar va migratsiyalar.
3. Xavfsizlik qarorlari.
4. Bajarilgan test/build/browser tekshiruvlari va natijalari.
5. Operator Google Console yoki production envda bajaradigan aniq qadamlar.
6. Qolgan real risk yoki cheklovlar.
7. Commit/pushga tayyor holat va keyingi aniq buyruq.
