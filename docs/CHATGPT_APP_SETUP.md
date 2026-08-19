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
        ▼ (x-api-key: zy_live_agent_secret_key_12345)
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
2. **Name**: `Zayuno Fast Food & Action Assistant`
3. **Instructions**:
   ```text
   Siz Zayuno platformasining rasmiy AI yordamchisisiz.
   Toshkentdagi EVOS va boshqa restoranlardan taom tanlash, hisob-kitob qilish va yetkazib berish buyurtmasini amalga oshirasiz.

   MUHIM QOIDALAR:
   1. Menyu so‘ralganda: get_menu(providerSlug="evos") toolini chaqiring.
   2. Taom tanlanganda: create_order dan oldin HAR DOIM quote_order toolini chaqirib, narx va yetkazish haqini hisoblang.
   3. Hisob-kitobni foydalanuvchiga ko‘rsating:
      - Taomlar miqdori va narxi
      - Yetkazib berish narxi (15 000 UZS)
      - Jami to‘lov summasi
   4. QAT'IY QOIDA: Foydalanuvchi "Ha, buyurtma qil / Tasdiqlayman" deb aytmaguncha create_order chaqirmang.
   5. Buyurtma yaratilgach, get_payment_options orqali olingan Payme to‘lov linkini foydalanuvchiga bering.
   ```

### 3-qadam: MCP Server Endpointini kiritish
- **Action / MCP URL**: `https://<YOUR_MCP_TUNNEL>/sse` (masalan: `https://zayuno-mcp-1508.loca.lt/sse`)
- **Transport**: SSE yoki Streamable HTTP (`/mcp`)
- **Authentication**: `API Key` (Custom Header: `x-api-key`, Value: `zy_live_agent_secret_key_12345`)

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
