# Data safety form — draft

Bu draft Play Console’ga yuborishdan oldin production backend, analytics/crash SDKlari va provider integratsiyalari bilan tekshiriladi.

| Data turi | Yig‘iladi | Ulashiladi | Maqsad |
| --- | --- | --- | --- |
| Ism, email, user ID | Ha | Google sign-in va zarur providerlar | Account, authentication, buyurtma bajarish |
| Telefon va yetkazish manzili | Foydalanuvchi buyurtmada kiritsa | Faqat tanlangan provider | Buyurtma va yetkazish |
| Chat va boshqa user content | Ha | AI processor/providerga zarur qismi | App funksiyasi, support |
| Buyurtma tarixi | Ha | Tanlangan provider | Buyurtma bajarish, support, fraud prevention |
| App interactions va diagnostika | Report yuborilganda | Support processorlari | Nosozlikni aniqlash |
| Screenshot | Faqat user report yuborganda | Support processorlari | Support |
| Karta raqami/CVV/bank paroli | Yo‘q | Yo‘q | To‘lov providerning HTTPS sahifasida |

- Transportda shifrlash: production API va public sahifalar HTTPS orqali ishlaydi.
- Account deletion: ilova ichidagi havola va `https://zayuno.uz/delete-account`.
- Data collection majburiy yoki optional ekanini Play formasida har bir flow bo‘yicha alohida belgilang.
- Analytics, crash reporting, advertising yoki push SDK qo‘shilsa, bu jadval va Play formasi yangilanadi.
