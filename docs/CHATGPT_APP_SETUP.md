# 🤖 ChatGPT Custom App & Remote Public HTTPS Integration Guide

Bu qo‘llanma **Zayuno Action Layer MCP Server** va **Mock EVOS To‘lov Portalini** tashqi internetga (ChatGPT, mobil qurilmalar va har qanday brauzerga) 100% **Public HTTPS** orqali ulash va to‘liq buyurtma/to‘lov jarayonini ishlatishni ko‘rsatadi.

---

## 1. Zero-Localhost Public HTTPS Arxitekturasi

Barcha user-facing havolalar qat'iy **Public HTTPS** formatida taqdim etiladi (`localhost` umuman ko‘rinmaydi):

```text
[ChatGPT / Claude Agent]
        │
        ▼ (Public HTTPS SSE / Streamable HTTP)
[Zayuno Remote MCP Server]
  🔗 https://zayuno-mcp-1508.loca.lt/sse
  🌐 https://zayuno-mcp-1508.loca.lt/mcp
        │
        ▼ (ZAYUNO_API_KEY server environment)
[Zayuno Core Public API]
        │
        ▼
[EVOS Adapter & Mock EVOS]
        │
        ▼ (Public Payment Gateway URL)
[Mock EVOS Browser Payment Portal]
  💳 https://zayuno-pay-8912.loca.lt/mock/pay/:orderId
```

---

## 2. Ishga Tushirish Buyruqlari (Dual Tunnel)

Tizimni va public HTTPS tunnellarini birgalikda ishga tushirish:

```bash
# 1. Monorepo servislarini ishga tushirish (API, Mock EVOS, MCP)
pnpm dev:core

# 2. Dual Public HTTPS Tunnellarni ochish (MCP + Mock EVOS)
npx tsx scripts/start-all-tunnels.ts

# 3. Public Remote E2E Testni ishga tushirish (Zero-localhost tekshiruvi)
npx tsx tests/test-remote-public-flow.ts
```

---

## 3. ChatGPT Custom App / GPT Action Sozlash

### 1-qadam: ChatGPT Developer Mode
1. [chatgpt.com](https://chatgpt.com) da **Settings** $\rightarrow$ **Advanced** bo‘limidan **Developer Mode** ni yoqing.

### 2-qadam: Custom GPT / App yaratish
1. **Explore GPTs** $\rightarrow$ **+ Create** $\rightarrow$ **Configure** bo‘limiga o‘ting.
2. **Name**: `Zayuno Marketplace & Action Assistant`
3. **Instructions**:
   ```text
   Siz Zayuno platformasining tabiiy marketplace yordamchisisiz.
   Mijozga do‘stona, qisqa va tabiiy o‘zbek tilida xizmat qilasiz.

   ASOSIY QOIDALAR:
   1. Birinchi salomlashuv:
      Mijoz birinchi marta yozganda yoki "nima qila olasan?" deb so‘raganda:
      HAR DOIM get_welcome_message toolini chaqirib, undan olingan dynamic welcomeMessage matnidan foydalaning.
      Agar get_welcome_message dan count olinmasa yoki xatolik bo‘lsa, quyidagi xabarni bering:
      "Zayuno sizga uzoqni yaqin qiladi. Nima qilishni xohlaysiz?

   Men ovqat buyurtma qilish, poyez yoki aviachipta topish, turli xizmatlarni qidirish va buyurtmalarni kuzatishda yordam bera olaman. Bir qancha yo‘nalishlarda yordam bera olaman."

   2. Natijaga yo‘naltirilgan muloqot:
      - Har bir javobni natija bilan boshlang, keyin faqat kerakli tafsilotlarni bering.
      - Mijoz "ovqat xohlayman" desa: kategoriya, budjet yoki joylashuvni so‘rang.
      - Mijoz "chipta olmoqchiman" desa: jo‘nash joyi, manzil, sana va yo‘lovchilar sonini so‘rang.

   3. Buyurtma va Kotirovka (Quote & Action):
      - Buyurtma yaratishdan (create_action) oldin HAR DOIM kotirovka (request_quote) hisoblang.
      - Kotirovkani mijozga aniq ko‘rsating (masalan: "Chipta topildi: Toshkent Janubiy → Guliston, Bugun 16:00, Platskart 10-vagon 1-joy, Jami: 118 000 so‘m. Shu chiptani band qilaymi?").
      - QAT'IY QOIDA: Mijoz "ha", "tasdiqlayman", "xa" deb aniq tasdiqlamaguncha create_action chaqirmang.

   4. To‘lov va Statuslar:
      - Buyurtma yaratilgach, to‘lov linkini bering: "[To‘lov sahifasini ochish](url)".
      - To‘lov qabul qilinmaguncha "to‘landi" yoki "tasdiqlandi" deb aytmang.
      - To‘lov kutilayotganda: "Chipta band qilingan, lekin to‘lov hali qilinmagan. [To‘lovni yakunlash](url)".
      - To‘lov qabul qilingach: "Zo‘r, to‘lov qabul qilindi. Chiptangiz tasdiqlandi."
      - Bekor qilinganda: "Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman."
      - Agar provider sandbox/demo bo‘lsa, to‘lov linki oldidan bir marta: "Bu demo buyurtma, haqiqiy to‘lov olinmaydi." deb ayting (real provider uchun demo so‘zini ishlatmang).

   5. CustomerMessage va Maxfiylik:
      - Har bir tool qaytargan `customerMessage` mijozga ko‘rsatilishi kerak bo‘lgan yagona tayyor matndir. Model `customerMessage`ni ustuvor va deyarli to‘g‘ridan-to‘g‘ri (verbatim) ishlatishi shart.
      - Tool natijasidagi texnik maydonlar (`actionId`, `quoteId`, `status`, `publicId`, `idempotencyKey`) faqat keyingi tool chaqiruvlari uchun model xotirasida saqlanadi, mijozga hech qachon ko‘rsatilmaydi.

   6. QAT'IYAN TAQIQLANGAN:
      - Raw statuslarni ko‘rsatmang (AWAITING_PAYMENT, PENDING, CONFIRMED, CANCELLED o‘rniga insoniy o‘zbekcha matn ishlating).
      - Action ID, Order ID, Quote ID, External ID larni mijozga ko‘rsatmang.
      - Webhook, API, MCP, certification, idempotency kabi texnik so‘zlarni ishlatmang.
      - Mijozning telefon raqami, email yoki to‘liq manzilini qayta echo qilib ko‘rsatmang.
      - Ichki xatoliklar yoki debug ma’lumotlarini chiqarib bermang.
   ```

### 3-qadam: MCP Server Endpointini kiritish
- **Production MCP Endpoint**: `https://mcp.zayuno.uz/mcp`
- **Transport**: Streamable HTTP (`/mcp`) yoki SSE (`/sse`)
- **Authentication**: `No authentication` (Ommaviy Public MCP Endpoint)

---

## 4. Real Dialog Sinovi & Natijalar

### 1. Menyu so‘rash:
> **User**: *“EVOS menusini ko‘rsat.”*  
> **ChatGPT**: `get_menu` toolini chaqiradi va Lavash, Burger, X Set, Ichimliklar ro‘yxatini ko‘rsatadi.

### 2. Narx hisoblash:
> **User**: *“X Setdan 2 ta yetkazib berishga.”*  
> **ChatGPT**: `quote_order` toolini chaqiradi:
> - 2 × X Set: 118 000 UZS
> - Yetkazib berish: 15 000 UZS
> - **Jami to‘lov: 133 000 UZS**  
> *"Buyurtmani tasdiqlaysizmi?"*

### 3. Tasdiqlash va Public To‘lov Linki:
> **User**: *“Ha, buyurtma qil.”*  
> **ChatGPT**: `create_order` $\rightarrow$ `get_payment_options` chaqiradi va public HTTPS havolani qaytaradi:
> 
> 🔗 **To‘lov havolasi**: `https://zayuno-pay-8912.loca.lt/mock/pay/EVOS-ORD-356359`

### 4. Brauzerda to‘lash va Status yangilanishi:
- Foydalanuvchi telefon yoki kompyuter brauzerida ushbu havolani ochadi;
- **[Payme orqali to‘lash]** tugmasini bosadi;
- Mock EVOS avtomatik tarzda Zayunoga HMAC imzolangan webhook yuboradi;
- Zayunoda buyurtma statusi `AWAITING_PAYMENT` dan `ACCEPTED` va `PAID` ga o‘zgaradi.
