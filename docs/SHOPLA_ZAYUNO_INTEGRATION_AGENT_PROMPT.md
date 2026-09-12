# Shopla → Zayuno: 7 bosqichda ishlaydigan integratsiya

Quyidagi topshiriqni oxirigacha bajaring. Faqat reja yoki tavsiya yozib to‘xtamang: kod, kerakli migratsiya, konfiguratsiya yo‘riqnomasi, tekshiruv va yakuniy hisobotni tayyorlang.

## Maqsad va vakolat

Hackathongacha 3 soat vaqtimiz bor. Shopla sotuvchisi “Zayunoga ulanish” tugmasini bosadi, uning do‘koni Zayuno adminiga ariza sifatida tushadi. Talablar bajarilib, admin tasdiqlagach, do‘kon Zayunoda provider bo‘ladi. Mijoz Zayunoda shu do‘kon mahsulotlarini tabiiy tilda topadi, variant/miqdorni tanlaydi, yakuniy narxni oladi, tasdiqlaydi va Shopla yaratgan haqiqiy to‘lov sahifasiga o‘ta oladi. To‘lov holati server tasdig‘i orqali yangilanadi, buyurtma Shopla seller paneliga tushadi.

Foydalanuvchi ma’lumotiga ko‘ra, ikkala loyihada ham hozir real foydalanuvchilar yo‘q. Repozitoriylarda zarur o‘zgarishlarni mustaqil bajaring; odatiy texnik qarorlar uchun qayta-qayta ruxsat so‘ramang. Biroq mavjud ma’lumotlarni o‘chirmang va boshqa agent ishlarini qaytarmang.

**Push va production deployni hozir bajarmang.** Avval yakuniy hisobotni bering. Foydalanuvchi hisobotni boshqa agent bilan ko‘rib, “OK, push qil” degach push qilinadi; push avtomatik production deployni boshlashi mumkin. Ruxsat kelgach ishlatiladigan aniq buyruqlarni hisobotga yozing.

Repozitoriylar:
- Zayuno: `D:\works\DEV\Zayuno`
- Shopla: `D:\works\DEV\aa_startup_v1`
- Eski `D:\works\DEV\aa\_startup\_v1` yo‘li bu muhitda topilmagan. Haqiqiy yo‘llarni tekshiring.

Shopla tarkibi: `brend-market` — backend; `brend-admin` — seller/admin; `shopla` — storefront. Mavjud kodda do‘kon, filiallar, katalog/variantlar, stock reservation, checkout va Payme bor. Bu oldingi read-only ko‘rik xulosasi; ish boshlashda joriy koddan tasdiqlang. Endpoint yoki tayyor integratsiya borligini taxmin qilib kod yozmang.

## Ishlash tartibi

- Ikkala repo uchun tegishli `AGENTS.md`, `TASKS.md`, package scriptlar va `git status`ni o‘qing. Vazifa uchun alohida 7 bosqichli `[ ]` checklist yozing; eski checklistlarni saqlang.
- Quyidagi 7 bosqichni ketma-ket olib boring. Har bosqich tugaganda `[x]`, fayllar, bajarilgan tekshiruv natijasi va keyingi qadamni darhol yozing. Rejalashtirilgan yoki yozilgan kodni tekshirilgan deb belgilamang.
- Har bosqichdan keyin qisqa progress bering, lekin “davom etaymi?” deb to‘xtamang. Bir qism tashqi credential yoki xizmat tufayli to‘silsa, sababni qayd etib, qolgan mustaqil ishlarni yakunlang. Kerakli savolni erta va aniq bering.
- Quyidagi vaqtlar jami 180 daqiqalik mo‘ljal. Vaqt qisqarsa dekoratsiya va ikkilamchi imkoniyatlarni qisqartiring; do‘kon izolyatsiyasi, summa, qoldiq, idempotency va payment tekshiruvlarini tashlamang. Bajarmagan ishni yashirmang.
- Production ma’lumotlari, API kalitlari va karta ma’lumotlarini log, frontend bundle, screenshot yoki hisobotga chiqarmang. Mavjud secret sozlash usulidan foydalaning; yetishmayotgan environment nomlarini `.env.example`ga qiymatsiz yozing.
- Test uchun yangi tashqi to‘lov yoki pulli resurs sotib olmang. Sandbox/test merchant orqali tekshiring. Haqiqiy merchant konfiguratsiyasi bo‘lsa checkout sahifasigacha tekshirish mumkin; haqiqiy pul yechish faqat alohida aniq ruxsat bilan. Sandbox isbotini live payment isboti deb yozmang.

## 1-bosqich — Kod va kontraktni aniqlash (15 daqiqa)

Shopla shop/product/variant/warehouse/order/payment modullari hamda Zayuno onboarding, provider adapter, certification, router, quote/actions va payment UI oqimini ko‘ring. Mavjud DTO va autentifikatsiyani asos qilib oling.

Quyidagilarni qisqa texnik yozuvga tushiring:
- Bitta umumiy Shopla integratsiyasi; har Shopla `shopId` uchun alohida Zayuno provider identifikatori.
- Shopla narx, qoldiq, variant, buyurtma va paymentning asosiy manbasi. Zayuno qidiruv indeksini/cache saqlashi mumkin, lekin eskirgan cache bo‘yicha buyurtma tasdiqlamaydi.
- `shopId`, `providerId`, product/variant ID, quote ID, order ID, payment reference va idempotency key o‘zaro bog‘lanishi.
- Mavjud kontraktdagi endpointlar va mapping; unsupported capabilityni ochiq belgilash. Keraksiz yangi parallel protokol yaratmaslik.
- Pul birligi va provider/payment tizimi orasidagi konvertatsiya; miqdor, variant, mavjudlik, yetkazish, xizmat haqi va quote muddati.

**Done:** ikkala kod bazasiga mos minimal arxitektura, checklist va aniq integratsiya chegarasi yozilgan.

## 2-bosqich — Seller ulanishi va admin tasdig‘i (25 daqiqa)

Shopla seller paneliga mavjud dizaynga mos “Zayunoga ulanish” bo‘limini qo‘shing. Sotuvchi ulashga vakolatli do‘konini va ulashiladigan katalog/buyurtma imkoniyatlarini ko‘rsin. Do‘kon nomi, logo, kontakt, yetkazish va kerakli ma’lumotlarni qayta kiritishga majbur bo‘lmasin.

Ariza holatlari mavjud modellarga mos ravishda draft/pending/approved/rejected/disconnected kabi aniq bo‘lsin. Takroriy click yoki tarmoq retrysi ikkinchi ariza/provider yaratmasin. Zayuno admini ariza, tekshiruv natijalari va rad etish sababini ko‘rsin. Admin approve va texnik talablar bajarilmaguncha provider mijozga chiqmasin. Disconnectdan keyin yangi quote/order to‘xtasin, eski buyurtma/to‘lov holatini olish saqlansin.

Har do‘kon uchun server tekshiradigan vakolat chegarasi bo‘lsin. Oddiy `shopId`ni almashtirish boshqa seller katalogini boshqarish yoki buyurtmasiga kirish imkonini bermasin. Seller JWTni uzoq yashaydigan integratsiya kaliti qilib ko‘chirmang.

**Done:** seller ariza yuboradi, admin ko‘radi/tasdiqlaydi/rad etadi; takroriy yuborish va boshqa do‘kon IDsi bilan urinish tekshirilgan.

## 3-bosqich — Universal katalog va qidiruv (30 daqiqa)

Shopla uchun bitta qayta ishlatiladigan provider adapter yarating. Katalog, qidiruv va kerakli provider metadata/health imkoniyatlarini mavjud Zayuno kontraktiga ulang. Faqat tasdiqlangan, faol do‘konning sotuvga ruxsatli mahsulotlari ko‘rinsin.

Product/variant ID, kategoriya, nom, narx, valyuta, stock, rasm, tavsif, variant atributlari va paginationni xaritalang. Buyurtmada aynan tanlangan variant saqlansin. Rasmi yo‘q, tavsifi uzun, katalogi bo‘sh, mahsuloti tugagan, timeout yoki noto‘g‘ri response holatlarida UI buzilmasin. AIga mahsulot, narx yoki stock o‘ylab topishga yo‘l qo‘ymang.

Zayunoning foodga bog‘langan route/promptlarini shu integratsiya uchun zarur joylarda kengaytiring. Masalan, test do‘kon katalogiga qarab “200 minggacha sovg‘a top” kabi so‘rov aniq tool qidiruviga aylansin. Ishlayotgan restoran oqimini regressiya qilmang. Barcha kategoriyani AI orqali taxminan ishlaydigan deb e’lon qilmang.

**Done:** tasdiqlangan kamida bitta Shopla do‘koni Zayunoda topiladi, haqiqiy mahsulotlar va variantlar tushunarli cardlarda chiqadi.

## 4-bosqich — Quote va ishonchli order yaratish (35 daqiqa)

Mijoz tanlagan mahsulot/variant/miqdor, telefon va manzilni saqlang. Kontaktlarni alohida xabarlarda yuborish ishlasin. Savol yoki narxni aniqlashtirish buyurtma kontekstini yo‘qotmasin.

Shoplaning umumiy mijoz savatini o‘zgartirmaydigan integratsiya kirishini yarating yoki mavjud mos servisni qayta ishlating. Zayuno tanlovini mijozning boshqa savati bilan aralashtirmang. Bitta quote/order bitta tasdiqlangan do‘kon doirasida ishlasin; ko‘p do‘konli cart qo‘llanmasa tushunarli ayting.

Quote serverda joriy variant/narx/qoldiq va haqiqiy yetkazish qoidalari asosida hisoblansin. Mahsulotlar, chegirma, delivery/xizmat haqi va jami alohida ko‘rinsin. Muddati tugagan yoki narxi o‘zgargan quoteda yangi narxni ko‘rsatib, qayta tasdiq oling. Yetkazish hisoblanmasa taxminiy summani yakuniy deb bermang.

Explicit confirmationdan keyingina order yarating. Idempotency retry va bir vaqtdagi so‘rovlarda ham ishlasin: bir key + bir payload bir order natijasini qaytarsin; bir key + boshqa payload xato bo‘lsin. Faqat process ichidagi lockga tayanmang. Stock yetishmovchiligi, yarim bajarilish, payment init xatosida order/reservation holatini izchil saqlang.

**Done:** quote → tasdiq → bitta Shopla order; duplicate/concurrency, boshqa do‘kon varianti, stock tugashi va narx almashishi tekshirilgan.

## 5-bosqich — Zayunodan to‘lov sahifasigacha (35 daqiqa)

Shoplaning mavjud Payme/payment servisidan foydalaning. Payment URL serverda aynan yaratilgan order, to‘g‘ri summa va tegishli merchant sozlamalaridan olinsin. Hardcode yoki demo URLni haqiqiy payment deb bermang. Credential yetishmasa aniq setup xatosi ko‘rsating.

Zayunoda “To‘lash” actioni provider bergan payment linkni mobileda ochsin. Brauzerdan appga qaytish, ilovani qayta ochish va “To‘lov holatini tekshirish” ishlasin. Client redirect yoki foydalanuvchining “to‘ladim” matni buyurtmani PAID qilmasin: Shopla tomonidan tasdiqlangan callback/status asos bo‘lsin.

Payment callback autentifikatsiyasi, merchant/order/summa mosligi, duplicate callback va kech kelgan hodisalar izchil boshqarilsin. Kutilyapti/to‘landi/bekor qilindi/xato holatlari ajralsin. Seller panelida to‘lanmagan order to‘langan deb ko‘rsatilmasin. Mavjud Payme oqimini keraksiz qayta yozmang.

**Done:** Zayunodan aynan shu orderning checkout sahifasi ochiladi; sandboxda payment/status oqimi tekshiriladi. Live merchant yoki qurilma mavjud bo‘lmasa, tekshirilmagan qismlar alohida qayd etiladi.

## 6-bosqich — Oqimni boshidan oxirigacha tekshirish (25 daqiqa)

O‘zgargan modullar uchun tegishli typecheck/build/testlarni bajaring. Mavjud test uslubiga mos regressiya testlarini qo‘shing. Vaqtni aloqasiz butun monorepo testlariga sarflamang.

Majburiy ssenariylar:
- Seller connect → admin review → publish → AI search → variant/quantity → quote → confirm → order → payment link → verified status.
- Pending/rejected/disconnected shopda yangi savdo bloklanishi.
- Ikki seller orasida katalog va order vakolatlari ajratilganligi.
- Double click/retry/concurrent confirmation ikkinchi order yaratmasligi.
- Noto‘g‘ri variant, stock tugashi, quote muddati/narxi o‘zgarishi.
- Provider timeout, bo‘sh katalog, rasmsiz product va payment init xatosi.
- Payment callback retry va app qayta ochilganda statusni tiklash.
- Mavjud restoran tanlash/quote flow uchun kamida bitta regressiya tekshiruvi.

Test fixturelarni aniq demo/test deb belgilang. Real API sinovi bilan mock/unit testni hisobotda ajrating. Mavjud nosoz test chiqsa oldindan bormi yoki o‘zgarishdanmi aniqlang; yiqilgan testni o‘chirib muvaffaqiyat deb yozmang.

**Done:** natijalar buyruq, exit status, dalil va cheklovlari bilan qayd etilgan; qolgan haqiqiy blockerlar yashirilmagan.

## 7-bosqich — Demo, deploy tayyorgarligi va yakuniy hisobot (15 daqiqa)

`D:\works\DEV\Zayuno\docs\SHOPLA_ZAYUNO_INTEGRATION_REPORT.md` yarating. Ikkala repodagi TASKS/handoffdan unga havola bering.

Hisobot tarkibi:
1. **Qaror:** `READY FOR REVIEW` yoki `BLOCKED`, aniq sabab bilan. Reviewga tayyorlik productionda ishlagan degani emas.
2. 7 bosqich checklisti: bajarildi/tekshirildi/qoldi; har biriga dalil.
3. Ikkala repo bo‘yicha o‘zgargan fayllar va vazifasi; boshlang‘ich begona o‘zgarishlardan ajratish.
4. Haqiqiy endpoint/DTO mapping, do‘kon vakolati, quote/order/payment holatlari va idempotency yechimi.
5. Test buyruqlari va natijalari; mock, lokal, sandbox va live tekshiruvlarni alohida ko‘rsatish. Maxfiy bo‘lmagan screenshot/log joylashuvi.
6. Kerakli environment nomlari, migratsiya/backfill, minimal permission, servislarni deploy qilish ketma-ketligi. Kalitlarning o‘zi yozilmasin.
7. Hackathon uchun 2–3 daqiqalik aniq demo ssenariysi: qaysi do‘kon, haqiqiy katalogga mos prompt, qaysi action va kutilgan natija.
8. Qolgan ishlar va xavflar: real payment sinovi bo‘lmagan bo‘lsa, ochiq aytish; keyingi agent uchun aniq navbatdagi qadam.
9. Ikkala repoda branch/commit holati, ruxsatdan keyingi push/deploy buyruqlari, deploydan keyingi smoke test va rollback yo‘li. Faqat kerakli o‘zgarishlarni stage qilish; begona fayllarni qo‘shmaslik.
10. Sarflangan vaqt va ishlaydigan yakuniy foydalanuvchi oqimi.

Oxirida foydalanuvchiga hisobot fayliga havola va qisqa “nima ishlaydi / nima tekshirildi / nima qoldi” yozing. **Push qilinmadi** holatini aniq ko‘rsating va hisobot ko‘rib chiqilishini kuting. Integratsiya to‘liq tekshirilmagan bo‘lsa “hammasi tayyor” demang.

Hozir 1-bosqichdan boshlang va mustaqil bajariladigan barcha ishlarni 7-bosqichgacha davom ettiring.
