# iiko restoranini Zayuno'ga ulash

## Restoran egasi uchun

1. iikoWeb'da tashqi menyu yarating va uni Cloud API integratsiyasiga biriktiring. Narxli mahsulotlar ko‘rinayotganini tekshiring. [iiko tashqi menyu qo‘llanmasi](https://ru.iiko.help/articles/iikoweb/external-menu).
2. iiko Developer Portal yoki iikoWeb'dan integratsiya kalitini oling. Yangi v2 ulanishda App ID va Client Secret ham kerak; ular bilan `apiLogin`ni API key sifatida ishlatish mumkin. Kalitlarni faqat Zayuno portalining maxfiy maydonlariga kiriting.
3. Zayuno Provider Portal → **Integratsiyalar** → **iiko Cloud** bo‘limida kalitlarni kiriting va “Restoranlarni tekshirish”ni bosing. Restoran, POS guruhi va tashqi menyuni tanlang.
4. Restoran nomi va Zayuno slugini kiriting, “iiko restoranini ulash”ni bosing. Server restoran/guruh/menyuning shu kalit bilan o‘qilishini va menyuda mahsulot borligini tekshiradi. Ulanish dastlab `DRAFT`: xaridorlarga chiqmaydi.
5. “Menyu va POS holatini tekshirish” orqali mahsulot soni va terminal online holatini ko‘ring. Admin review va sertifikatlashdan keyingina provider ommaga chiqariladi.

## Admin uchun

Admin → Providers tepasidagi iiko Cloud formasidan administrator ham restoranni bevosita DRAFT sifatida ulashi mumkin. Restoran egasi Provider Portal → Integratsiyalar formasidan o‘z hisobiga ulaydi. Kartada `adapterType=iiko`, restoran/menyu va mahsulot soni ko‘rsatiladi. “Menyu va terminalni tekshirish” faqat o‘qiydi; buyurtma yaratmaydi. Credentiallar panelga qaytarilmaydi. Demo ma’lumotlarini productionga kiritish uchun kalitlarni portal/admin formasiga kiritish kerak; mahalliy `.env.iiko-demo.local` avtomatik deploy qilinmaydi.

Hozirgi demo order №1 bekor qilinmagan: iiko API va iikoFront uni kassir terminalidan bekor qilishni talab qilmoqda. Shu sabab avtomatik transactional certification va public publication iiko uchun serverda to‘xtatilgan. Kassir terminali masalasi hal bo‘lgach, izolyatsiyalangan test order yaratish/bekor qilish, admin certification va mobil ilovada bitta mahsulotdan buyurtma oqimini alohida tekshirish kerak. Demo provider keyin admin orqali `SUSPENDED` qilinib qidiruvdan yashiriladi; tarixdagi buyurtma yozuvlari saqlanadi.
