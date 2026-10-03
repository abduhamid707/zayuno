# iiko restoranini ACTIVE qilish

## Hamkor

1. `developers.zayuno.uz` yoki `partners.zayuno.uz` → **Integratsiyalar → iiko → Ulash**.
2. iiko API kalitini kiriting. Kalitingiz v2 talab qilsa App ID va Client Secretni ham kiriting.
3. Restoran, POS guruhi, tashqi menyu, nom va slugni tanlang; ulanishni saqlang.
4. Restoran DRAFT bo‘ladi. Admin tekshiruvi va tasdig‘igacha mijozlarga ko‘rinmaydi.

## Zayuno administratori

1. `admin.zayuno.uz` → **Providers & Adapters**, restoran kartasini toping.
2. **Menyu va terminalni tekshirish**: POS online, kamida bitta narxli mahsulot bo‘lishi kerak.
3. **iiko sinov buyurtmasini tekshirish**ni oching. Restoran bilan kelishilgan ism, nazorat qilinadigan telefon,
   shahar va manzilni kiriting. Restoran valyutasi va sinov uchun maksimal summani ko‘rsating.
4. Bitta buyurtma yaratish va bekor qilishga ruxsat katagini belgilang, **Sinovni boshlash**ni bosing.
   Buyurtma kassaga haqiqatan tushadi; dastur uni bekor qiladi. Test pul yechmaydi.
5. 9/9 tekshiruv o‘tsa, ariza PENDING_APPROVALga o‘tadi. Natijada buyurtma IDsi ko‘rsatiladi.
   Bekor qilish o‘tmasa, shu buyurtmani iiko kassasida tekshirib bekor qiling. Takroriy buyurtma yuborishga shoshilmang.
6. Restoran egasi, xizmat hududi, yetkazish va to‘lov tartibi kelishilganini tekshiring.
7. **ACTIVE qilish**ni bosing. Server POS, katalog va sinov buyurtmasining Cancelled holatini yana tekshiradi.
   Yangi buyurtma yaratmaydi. Sinov 24 soatdan eski yoki kalit/restoran/POS/menyu o‘zgargan bo‘lsa, qayta sinov talab qilinadi.
8. Kartada ACTIVE, APPROVED va discovery uchun ruxsat ko‘rinishini tekshiring. Zayuno ilovasida restoran menyusini qidiring.

## Texnik qoidalar

- Faqat administrator native iiko sertifikatsiya buyurtmasini boshlaydi; hamkor formasi buyurtma yaratmaydi.
- `NATIVE_IIKO` sertifikatsiyasi ichki iiko adapterini tekshiradi. Tashqi HTTP providerlar `STRICT` qoidalarida qoladi.
- Native adapter holatni autentifikatsiyalangan iiko API so‘rovi bilan oladi; WEBHOOK capabilityni da’vo qilmaydi.
  Mijoz buyurtma holatini so‘raganda server iiko’dan yangilaydi. iiko ishlamasa saqlangan holat qaytishi mumkin.
- Hisobot telefon, manzil va kalitlarni saqlamaydi. Buyurtma IDsi, tekshiruvlar va vaqt qayd qilinadi.
- ACTIVE menyu/buyurtma integratsiyasini ochadi. Click/Payme orqali avtomatik to‘lov ushbu sinovga kirmaydi;
  restoran bilan kelishilgan to‘lov usuli bo‘lishi kerak.
- Demo valyutasi RUB. Bu DEMO_Zayuno sozlamasi; uni UZS deb ko‘rsatish yoki narxni avtomatik aylantirish mumkin emas.
- Test tugagach demo kartasidagi **Suspend** orqali mijozlarga ko‘rinishini yopish mumkin.
