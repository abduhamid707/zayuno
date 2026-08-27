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
* **Maqsad:** Tayyor global AI auditoriyasi (ChatGPT, Claude, Gemini) orqali Zayuno infratuzilmasini real yuklamada sinash va ommalashtirish.
* **Vazifalar:**
  - [x] Streamable HTTP MCP JSON-RPC protokolini to‘liq standartlashtirish.
  - [x] OpenAI Apps / Plugin submission va certified katalogga kirish.
  - [x] Universal 15 ta tool annotatsiyalari va guardraillarini o‘rnatish.
  - [ ] Real provayderlarni onboarding qilish va sandboxdan jonli muhitga o‘tkazish.

### 📌 2-Bosqich: Frictionless Intermediate UI (Telegram Bot & Mini App)
* **Maqsad:** Mahalliy (O‘zbekiston) foydalanuvchilari uchun dastur o‘rnatish majburiyatisiz (zero-friction) test qilish.
* **Vazifalar:**
  - [ ] Zayuno AI Orchestrator mikroxizmatini yaratish (Intent parsing + Zayuno API client).
  - [ ] Telegram Bot va Telegram Mini App interfeysini ulash.
  - [ ] Chat ichida interaktiv mahsulot tanlash va bitta tugma bilan to‘lov qilish (Click/Payme/Uzum).

### 📌 3-Bosqich: Mustaqil Zayuno Consumer SuperApp (Native APK / iOS)
* **Maqsad:** Tashqi platformalarga bog‘liq bo‘lmagan, to‘liq shaxsiy ekotizim va brand egaligi.
* **Vazifalar:**
  - [ ] **Stack:** React Native + Expo (TypeScript).
  - [ ] **AI Router:** Narx, tezlik va kontekst sifatiga qarab OpenAI / Claude / Gemini orasida aqlli routing.
  - [ ] **Generative UI / Server-Driven Components:** Chat oqimida chiroyli interaktiv vizual vidjetlar (katalog kartochkasi, yetkazish xaritasi, kotirovka slayderi).
  - [ ] **Native Features:** Push notifications, biometriya (FaceID/barmoq izi), geolokatsiya bo‘yicha avtomatik eng yaqin filialni aniqlash.

---

## 🎯 Asosiy Strategik Xulosalar
1. **Infratuzilma ajratilganligi:** Core doim deterministic va xavfsiz bo‘lib qoladi. AI Orchestrator esa unga mijoz sifatida ulanadi.
2. **Distribution qoidasi:** Hozir `AI Platforms = Free Distribution`, kelajakda `Zayuno App = Owned Retention & Loyalty`.
