# iiko tester hisobotidan keyingi tuzatishlar

## Kodda tuzatildi

- Qidiruv so‘zlarni alohida tekshiradi: `osh` endi `kartoshka`ni topmaydi. `palov`, `plov`, `pilaf`, `oshh`, `paloff` va ko‘p so‘zli so‘rovlar qo‘llanadi. Tarkib so‘zlari menyudagi tavsif va teglarga tayanadi.
- Hamkor qidiruvi katalogni ham tekshiradi. `food_delivery + Toshkent + palov` restoran nomida palov bo‘lmasa ham menyudagi mahsulotni topishi mumkin. Mamlakat bo‘yicha topilgan hamkor yetkazish hududi tasdiqlangan degani emas.
- iiko quote uchun telefon va yetkazish manzili oldindan talab qilinadi. Manzil, savat, filial yoki boshqa kelishilgan parametr o‘zgarsa yangi quote va tasdiq kerak.
- Bitta quote qayta yuborilganda iiko order ID bir xil qoladi. Parallel so‘rovlar quote bo‘yicha bloklanadi. Timeoutdan keyin mavjud iiko buyurtmasi tekshiriladi.
- Shu API foydalanuvchisi va telefon uchun faol buyurtmada takrorlanayotgan mahsulotlar bo‘lsa, yangi quote alohida qo‘shimcha buyurtma yaratilishini aytadi. Mavjud buyurtmaga qo‘shish funksiyasi hali yo‘q.
- Naqd to‘lov buyurtmani tayyorlash holatidan ajratildi: mijoz kuryerga yetkazilganda to‘lashini ko‘radi. `get_payment_options` shu ulanishda offline naqd usulini qaytaradi. Click/Payme checkout ulanmagan.
- iiko tayyorlash navbati, pishirish, tayyor va yo‘lda holatlari alohida ko‘rsatiladi. Umumiy status enumlari saqlanadi; batafsil holat `metadata.fulfillmentStatus`da.
- Public API va MCP javobida `fulfillmentStatus`, `paymentMethod`, `paymentInstructions`, `paymentStatusVerified` va `estimatedArrivalAt` saqlanadi. Ichki metadata, telefon/manzil va provider IDlari bu javobga chiqarilmaydi.
- ETA iiko delivery restrictionsdan olinadi; oldingi doimiy 40 daqiqa olib tashlandi. POS uchun rejalangan vaqt filial vaqt zonasiga mos yuboriladi. Statusda iiko qaytargan `completeBefore` ko‘rsatiladi.
- Soxta 10 km radius va restoran nomidan tuzilgan manzil olib tashlandi. Quote manzil va savat uchun iiko ruxsatini tekshiradi.
- POS izohi qisqa: `Zayuno #XXXXXXXX`. To‘lov, filial va bekor qilish capability xatolari tegishli keyingi qadamni beradi.

## Live restoranda qolgan sozlama

2026-10-03 read-only tekshiruv: `koolo` ulanishida iiko delivery zones va restrictions soni 0. `Furqat a2 D17, Tashkent` uchun allowed endpoint `isAllowed: false` qaytardi. Default yetkazish vaqti 60 daqiqa.

Yangi kod bu holatda `DELIVERY_COVERAGE_NOT_CONFIGURED` qaytaradi. Yetkazish quote va yangi buyurtma hudud tasdiqlanmaguncha davom etmaydi.

Restoran operatori haqiqiy restoran manzili/koordinatalari, xizmat hududi va yetkazish qoidalarini iiko’da sozlashi kerak. Organization mamlakati ham real joylashuvga mosligini tekshirish kerak; avvalgi bazada Россия edi. Zayuno koordinata yoki xizmat hududini o‘zi to‘qimaydi.

## Qayta sinov

1. Avtomatik deploy yakunlangach `osh`, `palov`, `osh plov palov` va `oshh`ni Zayuno hamda tashqi AI orqali qidiring.
2. Savat → telefon/manzil → quote → naqd to‘lov va ETA → tasdiq tartibini tekshiring.
3. Sozlangan hudud ichida quote o‘tishi, tashqarida rad etilishini tekshiring.
4. Bir quote va bir xil tasdiqlangan ma’lumot bilan qayta create yuborilganda bitta buyurtma qolishini tekshiring.
5. Faol osh buyurtmasidan keyin yana oshli savat uchun ogohlantirishni tekshiring.
6. iiko’da holatni o‘zgartirib, navbat/tayyorlash/tayyor/yo‘lda holati va rejalangan vaqtni solishtiring.

## Tekshiruv dalili

- Contracts/shared/provider SDK/API/MCP build va mobile TypeScript tekshiruvi o‘tdi.
- Umumiy review runner: 49/49 suite o‘tdi. Boshqa joriy ishga tegishli admin App.tsx va mobile data-safety draft static testda HEAD nusxalari orqali o‘qildi; bu fayllar ushbu commitga kirmaydi.
- iiko mock suite: 22/22 test o‘tdi. Tashqi dummy handshake faqat `IIKO_LIVE_HANDSHAKE=1` bilan yoqiladi.
- Yangi reliability testi qidiruv, quote talablari, hudud/ETA, timeout reconciliation, quote lock, cash, fulfillment va POS izohini tekshiradi.
- Ushbu tuzatish davomida production buyurtmasi yaratilmagan. Hudud sozlanmagani sababli to‘liq live delivery sinovi hali bajarilmagan.
