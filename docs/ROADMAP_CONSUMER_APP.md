# Zayuno Strategic Roadmap: Consumer AI SuperApp & Architecture Evolution

Hujjat maqsadi: Zayuno platformasining qisqa va uzoq muddatli arxitektura, mahsulot va tarqatish (distribution) strategiyasini belgilash.

---

## 🏗 Arxitektura Kontseptsiyasi (Two-Tier Platform)

Zayuno ikki mustaqil, lekin uzviy bog‘liq qatlamdan iborat bo‘ladi:

```text
┌────────────────────────────────────────────────────────┐
│             Consumer Interface Layer (B2C)             │
│   • Zayuno Mobile App (React Native / Expo APK/iOS)     │
│   • Zayuno Telegram Mini App / Web Assistant           │
│   • ChatGPT / Claude / Gemini Ecosystems (MCP/Plugins) │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / JSON-RPC / SSE
┌──────────────────────────▼─────────────────────────────┐
│                 AI Orchestration Layer                 │
│   • Multi-Model Router (OpenAI / Claude / Gemini)      │
│   • Intent Classifier & Slot-Filling Pipeline          │
│   • Conversational State & Memory                      │
│   • Generative UI / Dynamic Component Streamer         │
└──────────────────────────┬─────────────────────────────┘
                           │ High-Performance RPC
┌──────────────────────────▼─────────────────────────────┐
│              Zayuno Core Infrastructure (B2B)          │
│   • Provider Registry & Discovery Engine               │
│   • Real-Time Quotation & Guarantee System             │
│   • Idempotent Action Lifecycle Engine                 │
│   • Payment Orchestration & Webhooks                   │
│   • Security, Guardrails & PII Redaction               │
└──────────────────────────┬─────────────────────────────┘
                           │ Provider SDKs / Connectors
┌──────────────────────────▼─────────────────────────────┐
│                   External Providers                   │
│   • Food & Beverage (Coffee Time, Evos, etc.)          │
│   • Transportation (Train, Taxi, Flights)              │
│   • Healthcare & Appointments (Clinics, Doctors)       │
│   • Retail, Flowers & Local Commerce                   │
└────────────────────────────────────────────────────────┘
```

---

## 📅 Bosqichma-bosqich Rivojlanish Rejasi (Phased Roadmap)

### 📌 1-Bosqich: AI Ekotizimlari orqali Distribution (Hozirgi Bosqich)

- **Maqsad:** Tayyor global AI auditoriyasi (ChatGPT, Claude, Gemini) orqali Zayuno infratuzilmasini real yuklamada sinash va ommalashtirish.
- **Vazifalar:**
  - [x] Streamable HTTP MCP JSON-RPC protokolini to‘liq standartlashtirish.
  - [x] OpenAI Apps / Plugin submission va certified katalogga kirish.
  - [x] Universal 15 ta tool annotatsiyalari va guardraillarini o‘rnatish.
  - [ ] Real provayderlarni onboarding qilish va sandboxdan jonli muhitga o‘tkazish.

### 📌 2-Bosqich: Frictionless Intermediate UI (Telegram Bot & Mini App)

- **Maqsad:** Mahalliy (O‘zbekiston) foydalanuvchilari uchun dastur o‘rnatish majburiyatisiz (zero-friction) test qilish.
- **Vazifalar:**
  - [ ] Zayuno AI Orchestrator mikroxizmatini yaratish (Intent parsing + Zayuno API client).
  - [ ] Telegram Bot va Telegram Mini App interfeysini ulash.
  - [ ] Chat ichida interaktiv mahsulot tanlash va bitta tugma bilan to‘lov qilish (Click/Payme/Uzum).

### 📌 3-Bosqich: Mustaqil Zayuno Consumer SuperApp (Native APK / iOS)

- **Maqsad:** Tashqi platformalarga bog‘liq bo‘lmagan, to‘liq shaxsiy ekotizim va brand egaligi.
- **Vazifalar:**
  - [ ] **Stack:** React Native + Expo (TypeScript).
  - [ ] **AI Router:** Narx, tezlik va kontekst sifatiga qarab OpenAI / Claude / Gemini orasida aqlli routing.
  - [ ] **Generative UI / Server-Driven Components:** Chat oqimida chiroyli interaktiv vizual vidjetlar (katalog kartochkasi, yetkazish xaritasi, kotirovka slayderi).
  - [ ] **Native Features:** Push notifications, biometriya (FaceID/barmoq izi), geolokatsiya bo‘yicha avtomatik eng yaqin filialni aniqlash.

---

## 🎯 Asosiy Strategik Xulosalar

1. **Infratuzilma ajratilganligi:** Core doim deterministic va xavfsiz bo‘lib qoladi. AI Orchestrator esa unga mijoz sifatida ulanadi.
2. **Distribution qoidasi:** Hozir `AI Platforms = Free Distribution`, kelajakda `Zayuno App = Owned Retention & Loyalty`.

## 📱 UX & Product Vision (Mobile v0)

**Концепция:** Chat + structured UI + action flow. Bu oddiy chatbot emas, universal harakatlar markazi.

Masalan, foydalanuvchi "Ertaga 18:00 dan keyin Yunusobodda ko‘z doktori top" desa, faqat matn emas, balki interaktiv **Dynamic Component**lar chiqadi:

- doctor cardlar
- experience, narx, rating
- bo‘sh slotlar
- Book tugmasi

Keyin foydalanuvchi "2-chisini 19:00 ga bron qil" deganda, AI suhbatning o‘zida kerakli aniqlashtirish va tasdiqlashni so‘raydi. Frontend alohida vertikal yoki provider kartalarini yasamaydi.

### Asosiy UX modeli (Bosh sahifa)

` ext
[ Ask Zayuno anything... ]

Quick actions:
Food
Doctors
Travel
Shopping
Tickets
Services
`
Kategoriyalar majburiy emas. Foydalanuvchi niyatini yozadi, AI live provider ma’lumotiga tayangan holda tabiiy, qisqa va strukturali matn bilan javob beradi. Frontend javobni qayta talqin qilmaydi va dinamik kartalar chiqarmaydi.

### Arxitektura

Core platformasi (Zayuno Platform) o'zgartirilmaydi. Mobile ilova hech qachon provayder API'lariga to'g'ridan-to'g'ri bormaydi, balki AI Orchestrator orqali Core platformaga ulanadi. Barcha provayderlar avvalgidek standart kontrakt orqali ishlaydi.

### Mobile ilova nima beradi? (UX va Ownership)

- Saqlangan chatlar va keyinchalik foydalanuvchi tanlaydigan shaxsiy sozlamalar.
- Barcha shaxsiy ma'lumotlarni markaziy profilda saqlash (masalan, bron qilishda ism, yosh, manzilni qayta-qayta yozmaslik).
- App asta-sekin foydalanuvchining **action memory**siga aylanadi.

### Mobile v0 uchun Fokus (MVP)

Hozircha katta "super-app" qurish shart emas. v0 faqat 3 narsaga qaratiladi:

1. Universal chat
2. Rich cards / confirmation UI
3. Action history

Test uchun 3 xil oqim (flow) tanlanadi: **food, booking, ticket**.

**Texnologiya:** React Native + Expo + TypeScript (Backend esa Zayuno va AI orchestration uchun lightweight service).

> **Long-term vision:** "One place to ask, compare, book, buy and manage real-world services." Zayuno'ning tarmog'i (network) tayyor bo'lganidan so'ng, Mobile app uni ishlatadigan eng yaxshi interfeysga aylanadi.
