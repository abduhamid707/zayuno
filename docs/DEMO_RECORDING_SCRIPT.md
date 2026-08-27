# Zayuno OpenAI Plugin Demo Video Recording Script (Sandbox Pilot)

This script provides an exact step-by-step recording guide for producing the demonstration video for OpenAI Plugin / Apps store submission, demonstrating the **Zayuno Action Layer Sandbox Provider (EVOS Mock Adapter)**.

---

## 🎬 Video Recording Setup

- **Tooling**: Screen recording (OBS / Loom / QuickTime) at 1080p (1920×1080) 60fps.
- **Window Layout**: Left side = ChatGPT interface with Zayuno plugin connected; Right side = Browser window for provider payment link.
- **Target Duration**: ~1 minute 30 seconds.

---

## ⏱️ Timeline & Action Breakdown

### Step 1: Menu Discovery (0:00 – 0:20)
- **User Prompt**: *"EVOS menusini ko‘rsat"* (or *"Show me the EVOS menu"*)
- **Tool Invoked**: `get_menu(providerSlug="evos")`
- **Display**: ChatGPT renders categorized menu (Lavash, X Set, Fit Set, Drinks) with exact UZS prices.
- **Narration**:
  > *Uzbek:* "Zayuno orqali ChatGPT provayder menyusini real vaqtda yuklaydi."
  > *English:* "Through Zayuno, ChatGPT discovers and renders the provider menu in real time."

---

### Step 2: Item Selection & Pricing Quote (0:20 – 0:45)
- **User Prompt**: *"X Setdan 2 ta Toshkent Yunusobodga yetkazib berishga hisoblab ber"*
- **Tool Invoked**: `quote_order(providerSlug="evos", items=[{ productId: "evos_set_x", quantity: 2 }], deliveryType="DELIVERY")`
- **Display**: ChatGPT returns the calculated quote:
  - 2 × X Set: **118,000 UZS**
  - Yetkazib berish (Delivery): **15,000 UZS**
  - Jami (Total): **133,000 UZS**
  - **Explicit Confirmation Prompt**: *"Buyurtmani tasdiqlaysizmi? (Ha / Yo‘q)"*
- **Narration**:
  > *Uzbek:* "Buyurtma berishdan oldin Zayuno aniq narxni hisoblaydi va foydalanuvchidan tasdiq so‘raydi."
  > *English:* "Before order creation, Zayuno calculates exact pricing and prompts for explicit confirmation."

---

### Step 3: Explicit Confirmation & Order Creation (0:45 – 1:05)
- **User Prompt**: *"Ha, buyurtma qil"* (or *"Yes, place the order"*)
- **Tool Invoked**: `create_order(...)` $\rightarrow$ `get_payment_options(...)`
- **Display**: ChatGPT returns order confirmation with Public Order ID (`ZY-EVOS-XXXXX`) and public HTTPS payment link:
  > `https://evos-sandbox.shopla.uz/mock/pay/EVOS-ORD-XXXXXX`
- **Narration**:
  > *Uzbek:* "Foydalanuvchi tasdiqlaganidan so‘ng buyurtma yaratiladi va provayder to‘lov havolasi beriladi."
  > *English:* "Upon user confirmation, the order is registered and a provider payment link is generated."

---

### Step 4: Provider Checkout & Webhook Delivery (1:05 – 1:30)
- **Action**: Click the payment link. Browser opens `https://evos-sandbox.shopla.uz/mock/pay/EVOS-ORD-XXXXXX`.
- **Payment Page Action**: Click **"Payme orqali to‘lash"** (Simulated Payment).
- **Display**: Page updates to green **"TO‘LOV MUVAFFAQITYATLI"** badge; status updates to `ACCEPTED / PAID`.
- **Narration**:
  > *Uzbek:* "To‘lov provayder sahifasida amalga oshiriladi. Karta ma’lumotlari Zayunoda saqlanmaydi. Webhook orqali order holati yangilanadi."
  > *English:* "Payment completes on the provider page with zero card storage. A webhook updates the order state."

---

### Step 5: Status Verification (1:30 – 1:45)
- **User Prompt**: *"Buyurtmam holati nima bo‘ldi?"* (or *"Check my order status"*)
- **Tool Invoked**: `get_order(...)`
- **Display**: ChatGPT confirms status: **ACCEPTED (Qabul qilindi)** and Payment Status: **PAID (To‘langan)**.
- **Narration**:
  > *Uzbek:* "ChatGPT buyurtma holatini tekshirib, to‘lov qabul qilinganini tasdiqlaydi."
  > *English:* "ChatGPT confirms the order is paid and ready for preparation."
