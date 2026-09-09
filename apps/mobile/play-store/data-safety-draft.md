# Data safety form — draft

Bu draft Play Console’ga yuborishdan oldin production backend, analytics/crash SDKlari va provider integratsiyalari bilan tekshiriladi.

| Data turi | Yig‘iladi | Ulashiladi | Maqsad |
| --- | --- | --- | --- |
| Ism, email, user ID | Ha | Google sign-in va zarur providerlar | Account, authentication, buyurtma bajarish |
| Telefon va yetkazish manzili | Foydalanuvchi buyurtmada kiritsa | Faqat tanlangan provider | Buyurtma va yetkazish |
| Chat va boshqa user content | Ha | AI processor/providerga zarur qismi | App funksiyasi, account orqali chat tarixini tiklash, support |
| Buyurtma tarixi | Ha | Tanlangan provider | Buyurtma bajarish, support, fraud prevention |
| App interactions va diagnostika | Report yuborilganda | Support processorlari | Nosozlikni aniqlash |
| Ixtiyoriy personalization signallari | Faqat user opt-in qilsa | Javob yaratish uchun AI processor | Mos tavsiyalar va natijalarni saralash |
| Screenshot | Faqat user report yuborganda | Support processorlari | Support |
| Karta raqami/CVV/bank paroli | Yo‘q | Yo‘q | To‘lov providerning HTTPS sahifasida |

- Transportda shifrlash: production API va public sahifalar HTTPS orqali ishlaydi.
- Saqlashda shifrlash: chat matni va sarlavhalari AES-256-GCM bilan shifrlanadi.
- Personalization: default holatda o‘chiq; ilova ichida ko‘rish, tuzatish, eksport, alohida yoki to‘liq o‘chirish mavjud.
- Retention: memory signallari 365 kungacha, suggestion interactionlari 180 kun, analysis joblari 30 kun; chatlar user o‘chirguncha yoki account deletiongacha.
- Account deletion: ilova ichidagi havola va `https://zayuno.uz/delete-account`.
- Data collection majburiy yoki optional ekanini Play formasida har bir flow bo‘yicha alohida belgilang.
- Analytics, crash reporting, advertising yoki push SDK qo‘shilsa, bu jadval va Play formasi yangilanadi.
