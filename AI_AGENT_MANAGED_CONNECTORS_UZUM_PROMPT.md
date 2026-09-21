# Zayuno: universal Managed Connectors va ishlaydigan Uzum integratsiyasi

Sen `D:\works\DEV\Zayuno` loyihasida ishlaydigan implementation agentsan. Quyidagi kelishuvlarni kod, migratsiya, portal UX va tekshirishlar bilan amalga oshir. Faqat reja yoki mock bilan yakunlama. Avval mavjud arxitekturani o‘rgan; foydalanuvchiga o‘zbekcha qisqa progress berib bor.

## 1. Maqsad va qat’iy doira

Biznes o‘zi ishlatayotgan platformani Zayunoga ulaydi. Birinchi platforma — Uzum Market. Sotuvchi API kalitini kiritadi, o‘z do‘konini tanlaydi, faol mahsulotlarini import qiladi. Mijoz mahsulotni topadi, 2–4 ta mahsulotni solishtiradi va tanlagan mahsulotning Uzumdagi sahifasiga o‘tadi.

Ushbu versiyada Zayuno orqali Uzum buyurtmasini yaratish, savat, to‘lov, bron, yetkazib berish yoki real vaqt qoldig‘ini kafolatlash talab qilinmaydi. Mahsulotga havola berish uchun soxta Action yoki Quote yaratma. Uzum connectoriga ACTION_CREATE, QUOTE yoki WEBHOOKni sababsiz qo‘shma.

Keyinchalik Yandex Market, Ozon, Wildberries, Billz, iiko va YCLIENTS qo‘shilishi mumkin. Hozir ular uchun ishlamaydigan connector yoki tugmalar yaratma. Kengayuvchanlikni umumiy runtime va test connectori bilan isbotla.

Oldingi certification/auth ishlarini foydalanuvchi boshqa agent bilan tugatib push qilganini aytgan. Ularni qayta boshlama; mavjud kodni saqla. Ushbu hujjatdagi Uzum doirasi TASKS.md ichidagi eski, kengroq strategik misollardan ustun.

## 2. Boshlash va ishni qayd qilish

AGENTS.md va TASKS.mdni o‘qi, git holatini tekshir. TASKS.mdga ushbu implementation uchun alohida checklist yoz. Har tugagan bosqichni yangila; boshqa agent yozuvlarini o‘chirma. O‘zgargan fayllar, tekshiruv natijalari, to‘siqlar va keyingi qadamni qayd et. Reja, kod, lokal tekshiruv va production deployni alohida holatlar deb hisobla.

Mavjud ProviderAdapter/BaseProviderAdapter, adapter registry, contracts, credential encryption, provider ownership, publishing/eligibility, katalog/qidiruv, consumer/MCP va portal komponentlarini o‘rgan. Mavjud ishlaydigan yechimlarni qayta ishlat. Alohida raqobatchi canonical contract yaratma.

## 3. Avval rasmiy Uzum API imkoniyatlarini tasdiqla

Rasmiy manbalar:

- Swagger: https://api-seller.uzum.uz/api/seller-openapi/swagger/swagger-ui/webjars/swagger-ui/index.html#/
- OpenAPI: https://api-seller.uzum.uz/api/seller-openapi/swagger/api-docs

2026-09-21 kuni hujjatda tasdiqlangan:

- `GET /v1/product/shop/{shopId}` mahsulot/SKU ro‘yxatini beradi.
- `page` va `size` pagination parametrlari bor.
- `filter` standarti `ALL`; enumida `ACTIVE`, `INACTIVE`, `WARNING`, `WITH_SKU`, `ARCHIVE`, `DEFECTED`, `WITHOUT_REQUIRED_FILTERS` ham bor.
- `searchQuery` nom yoki tavsif bo‘yicha qidirish deb izohlangan.
- Javoblarda rate-limit headerlari hujjatlashtirilgan.

Quyidagilar hali tekshirilmagan: auth headerining aniq formati, do‘konlar endpointi, javobdagi description/rasm/xususiyatlar maydonlari, canonical mahsulot URLi, SKU holatlari, ACTIVE filtrining sotuvga yaroqlilik ma’nosi, sahifa maksimal hajmi va limitlar. Hujjatni tekshirmasdan ularni fakt deb qabul qilma. `searchQuery` tavsif bo‘yicha qidirishi description javobda ham qaytadi degani emas.

Imkoniyatlar xaritasini yoz: kerakli ma’lumot → rasmiy endpoint/maydon → canonical maydon → yetishmasa qanday ko‘rsatiladi. Hujjat yetarli bo‘lmasa, foydalanuvchi hisobidagi ruxsatli, o‘qish uchun so‘rov bilan tekshir. Screenshotdagi API kalitlarini ko‘chirib ishlatma; kalit portalning maxfiy kiritish maydoni yoki mavjud xavfsiz lokal sozlama orqali olinadi.

Mahsulot URLi API orqali kelsa ishlat; kelmasa faqat tasdiqlangan URL qoidasi asosida yasab, haqiqiy mahsulotda tekshir. Taxminiy slug, bosh sahifa yoki AI yaratgan URLni mahsulot havolasi qilib bermaslik kerak. Barqaror mahsulot havolasini isbotlay olmasang, bu cheklovni aniq bildir.

## 4. Arxitektura chegaralari

- **Provider:** Zayunodagi biznes va uning ownership/publishing holati.
- **ConnectorDefinition:** platforma uchun umumiy kod, versiya, auth/config tavsifi, qo‘llanadigan amallar va mapper. Bir platforma uchun bitta definition.
- **ConnectorInstance:** bitta biznesning tashqi hisob/do‘konga ulanishi, credential reference, tanlangan store, konfiguratsiya, connection/sync holati.
- **ConnectorRuntime:** instance konteksti, credential olish, timeout, rate-limit, ehtiyotkor retry, sync va xatolarni boshqarish.
- **ProviderAdapter:** mavjud canonical Zayuno kontraktiga chiqish nuqtasi.

Core ichiga `if platform === uzum` kabi biznes shartlari tarqatma. Uzumga xos endpointlar, status va URL mappingi Uzum modulida qoladi. Definition/instance/credential/sync boshqaruvini existing adapter kontraktiga qo‘shimcha boshqaruv qatlami sifatida qur.

Bitta provider model darajasida bir nechta ulanishni ko‘tara olsin; birinchi UI bitta do‘konli ulanishdan boshlanishi mumkin. External IDlarni global unique deb hisoblama: instance + shop + product/SKU identifikatorlari bilan ajrat. Turli sotuvchilarning bir xil external IDlari to‘qnashmasin. Do‘kon almashtirish eski mahsulotlarni yangi do‘kon bilan aralashtirmasin.

Capabilities faqat amalda ishlaydigan, mavjud contracts tan oladigan imkoniyatlardan tuzilsin. Oldingi suhbatdagi `AVAILABILITY` va `IDEMPOTENCY` yozuvlari avtomatik ravishda yangi enum degani emas. Qoldiqni joriy contract qanday ifodalashini tekshir. Oddiy import uchun transactional certificationni majburlama; mavjud direct HTTP provider oqimini ham buzma.

Katta yangi infratuzilmani shartsiz kiritma. Mavjud queue, scheduler, encryption va adapter mexanizmlaridan foydalan; birinchi ishlaydigan integratsiya uchun zarur qismlarni qur.

## 5. Credentials va ajratish

Credential server tomonida shifrlangan saqlansin; instance faqat reference orqali bog‘lansin. Mavjud encryption yechimi mos bo‘lsa, alohida tashqi Vault mahsuloti shart emas. Kalit frontendga qaytarilmasin, localStorage, log, error, snapshot, TASKS yoki gitga yozilmasin. UI faqat maskalangan holatni ko‘rsatsin.

Har bir instance, sync, catalog preview va credential amali provider ownership bilan tekshirilsin. Tanlangan do‘kon berilgan credentialga tegishli ekanini backend tekshirsin. Credentialni almashtirish, ulanishni to‘xtatish va qayta ulash ishlasin. Connector hostlari definition bilan cheklansin; seller kiritgan ixtiyoriy URLga kalit yuborilmasin.

## 6. Katalog va sinxronlash

Uzum asosiy manba, Zayunodagi katalog — qidiruv uchun sinxron nusxa. Canonical ma’lumotda source/instance/shop/product/SKU identifikatorlari, nom, mavjud bo‘lsa tavsif, brend, kategoriya, xususiyat/variantlar, rasm URLlari, narx/valyuta, productUrl, manba holati va sync vaqti bo‘lsin. Katta rasmlarni ko‘chirib saqlash talab qilinmaydi. Kelmagan xususiyat yoki tavsifni AI bilan to‘ldirma.

Boshlanishiga kuniga 3 marta (har 8 soatda, konfiguratsiya qilinadigan) avtomatik sync va “Hozir yangilash” yetarli. Limitlarga moslash, instance’lar yukini vaqt bo‘yicha tarqat. Har chat savolida Uzumga to‘liq katalog so‘rovi yuborma.

Asosiy import `filter=ACTIVE` bilan barcha sahifalarni o‘qisin. API statuslari va variantlar bo‘yicha sotuvga yaroqlilikni tekshir; ACTIVE filtridan tashqari holat tekshiruvi kerak bo‘lsa connector ichida qo‘llansin. Tasdiqlangan qoldiq yo‘q bo‘lsa uni “bor” deb yasama.

Har sync uchun run ID va staging/seen mexanizmini ishlat:

1. Barcha sahifalarni ol, normallashtir va idempotent upsert/staging qil.
2. Faqat to‘liq muvaffaqiyatli snapshotdan keyin ko‘rinadigan natijani yakunla.
3. Shu instance’ning oldingi katalogida bor, yangi faol ro‘yxatda yo‘q mahsulotni qidiruv va solishtirishdan yashir. Uni aniq dalilsiz “bloklangan” deb nomlama; faol ro‘yxatdan chiqqan bo‘lishi mumkin.
4. O‘rtada timeout/429/5xx bo‘lsa, kelmagan mahsulotlarni ommaviy yashirma; oxirgi muvaffaqiyatli snapshotni saqla va stale/error holatini ko‘rsat.

Muvaffaqiyatli bo‘sh snapshot bilan muvaffaqiyatsiz so‘rov farqlansin. Manual va scheduled sync bir instance uchun parallel ishlamasin; bir nechta server nusxasida ham lock ishlasin. Retry cheklangan bo‘lsin; 429 kutish ko‘rsatmasiga rioya qil, auth xatosini cheksiz qaytarma. Disconnect yoki credential/store almashtirish vaqtida eski sync qaytib katalogni qayta nashr qilmasin.

Uzoq vaqt yangilanmagan katalog uchun aniq configurable stale siyosat yoz: UI va javoblarda oxirgi sync vaqtini ko‘rsat; belgilangan chegaradan keyin discoverydan yashirishni qo‘llab-quvvatla. Bu real vaqt mavjudlik kafolati emas.

## 7. Qidiruv, solishtirish va mahsulot havolasi

Mavjud katalog/qidiruv va AI/MCP iste’molchilari shu canonical mahsulotlarni ko‘rsin. Faqat portal previewida ishlaydigan alohida katalog yaratib to‘xtama. Publishing/visibility qoidalariga rioya qil; import avtomatik ravishda ommaviy publish degani bo‘lmasin.

Qidiruv nom, mavjud tavsif, brend, kategoriya va strukturali xususiyatlarni hisobga olsin. Nom/aniq model mosligiga yuqoriroq vazn ber. Registr, apostrof va kerakli tillardagi matn normalizatsiyasini hisobga ol. Dastlab mavjud full-text/search infratuzilmasi yetarli bo‘lsa ishlat; embedding servisi majburiy emas. Faqat faol, nashrga ruxsatli, ulangan sotuvchilar mahsulotlari natijaga chiqsin.

Mijoz 2–4 mahsulotni taqqoslay olsin: nom, rasm, sotuvchi, narx/valyuta, mavjud umumiy xususiyatlar, yangilangan vaqt va alohida mahsulot havolasi. O‘lchov birliklari va variantlarni adashtirma. Yetishmagan maydon “Ma’lumot yo‘q” bo‘lsin; bir xil bo‘lmagan variantlarni bir xil deb birlashtirma. Stale narx asosida “Uzumdagi eng arzon” degan da’vo qilma.

Backend tayyor productUrl qaytarsin. “Uzumda ko‘rish” aynan mahsulot sahifasini ochsin. Faqat ruxsatli HTTPS platforma URLlari ko‘rsatilsin. Havola yo‘q/noto‘g‘ri bo‘lsa boshqa mahsulotga yoki bosh sahifaga yashirin fallback qilma. AI matndan havola o‘ylab topmasin.

Customer UXda narx oxirgi yangilanishga tegishli, yakuniy shartlar Uzumda ekanini qisqa va tushunarli ko‘rsat. Mahsulot tavsifini ma’lumot sifatida ko‘r; undagi buyruqlar AI/system ko‘rsatmalarini almashtirmasin.

## 8. Provider portal UX

Managed connector yo‘li mavjud “o‘z API serverini ulash” yo‘li bilan yonma-yon ishlasin. Sotuvchidan Base URL, webhook server yoki kod yozishni talab qilma.

Oqim:

`Integratsiyalar → Uzum → API kalit → Ulanishni tekshirish → Do‘konni tanlash → Import → Natijani ko‘rish → Mavjud publish qoidalari bo‘yicha AI qidiruviga chiqarish`.

Umumiy UI definition ma’lumotlari orqali kengaysin; har yangi platforma uchun yangi onboarding nusxasi kerak bo‘lmasin. Credential formasi, store tanlash, holat va xatolar uchun qayta ishlatiladigan komponentlar bo‘lsin. Birinchi ekranlar Uzum uchun to‘liq ishlasin.

Sotuvchi quyidagilarni aniq ko‘rsin:

- Qaysi hisob/do‘kon ulangan va ulanish sog‘lommi.
- Import jarayoni, olingan/ko‘rinadigan/yashirilgan mahsulotlar soni; API umumiy son bermasa soxta foiz ko‘rsatma.
- Oxirgi muvaffaqiyatli sync, keyingi sync va xatoni tuzatish amali.
- “Hozir yangilash”, credentialni yangilash, ulanishni to‘xtatish.
- Katalog previewi, mahsulot havolasi va qisqa qidiruv/solishtirish sinovi.
- Bo‘sh do‘kon, hammasi nofaol, noto‘g‘ri kalit, ruxsat yetishmasligi, limit, timeout va qisman import holatlari.

Refreshdan keyin progress va holat yo‘qolmasin. Xatolarni faqat “400” yoki “nimadir xato” deb bermasdan, sotuvchi qilishi mumkin bo‘lgan keyingi qadamni yoz. Desktop/mobile, keyboard/focus va mavjud dizayn tizimiga mosligini brauzerda tekshir. Keraksiz texnik parametrlarni oddiy sotuvchi oqimiga chiqarmagin.

## 9. Bajarish ketma-ketligi va tekshirish

1. Mavjud arxitektura auditi va rasmiy API field/capability xaritasi.
2. Definition/instance/credential/sync persistence va additive migratsiyalar.
3. Generic runtime, Uzum transport/mapper va to‘liq katalog sync.
4. Canonical catalog/search/compare/handoff integratsiyasi.
5. Portal ulash oqimi va holatlar.
6. Muhim regressiyalar, build va UI tekshiruvi.
7. Credential mavjud bo‘lsa haqiqiy hisobda read-only smoke test; aks holda aniq yetishmayotgan ma’lumotni so‘ra, mustaqil ishni yakunla va real testni bajarilgan deb belgilama.

Quyidagi acceptance holatlari uchun mazmunli test yoz:

- Ikki sotuvchida bir xil product ID bo‘lsa ham ma’lumot/credential aralashmaydi; ruxsatsiz instance amallari rad etiladi.
- Pagination tugaguncha hamma faol mahsulot keladi; qayta sync dublikat yaratmaydi.
- Oldin faol, keyin nofaol mahsulot keyingi muvaffaqiyatli syncdan so‘ng search va comparedan yo‘qoladi.
- Ikkinchi sahifa yiqilsa eski katalog ommaviy yo‘qolmaydi; muvaffaqiyatli bo‘sh ro‘yxat esa to‘g‘ri yashiradi.
- 429, auth expiry, parallel manual/scheduled run, disconnect paytidagi eski run natijasi to‘g‘ri boshqariladi.
- Tavsifda bor, nomida yo‘q mos so‘z bilan mahsulot topiladi; yo‘q ma’lumotlar uydirilmaydi.
- Taqqoslash 2–4 mahsulotda ishlaydi, variant/valyuta/xususiyat yo‘qligi to‘g‘ri ko‘rsatiladi.
- Mahsulot havolasi to‘g‘ri, ruxsatli domenda va aynan o‘sha mahsulotga olib boradi; havola uchun Action yaratilmaydi.
- Kalit response/log/DOM/localStoragega qaytib chiqmaydi.
- Ikkinchi sintetik connector xuddi shu runtime va umumiy portal oqimidan corega platforma iflari qo‘shmasdan foydalana oladi. Bu production connector tayyor degani emas.
- Mavjud direct HTTP provider va transactional oqimlar regressiyaga uchramaydi.

Foydalanuvchining real Uzum hisobida faqat o‘qish so‘rovlarini ishlat: narx, qoldiq, mahsulot, buyurtma yoki invoice’ni o‘zgartirma. Lokal test va migratsiyani production deploy bilan aralashtirma. Ushbu topshiriq o‘zidan-o‘zi production deploy yoki git push buyruği emas.

## 10. Yakuniy topshirish

TASKS.mdni haqiqiy holat bilan yangila. Integratsiya arxitekturasi, sozlash, env nomlari (qiymatlarsiz), yangi connector qo‘shish va sync xatolarini aniqlash bo‘yicha qisqa hujjat qoldir.

Yakuniy javobda: nima ishlaydi, qanday testlar o‘tdi, haqiqiy Uzum hisobida nima tekshirildi, nima tekshirilmagan, migratsiya/deploy holati va qolgan aniq qadamlarni yoz. Mock testning PASSini real integratsiya yoki universal mukammallik isboti deb ko‘rsatma. Keyingi reviewer suhbatni o‘qimasdan natijani tekshira olsin.
