# Universal Managed Connectors va Uzum Market Integratsiyasi

Ushbu hujjat Zayuno platformasidagi **Universal Managed Connectors** arxitekturasi, xavfsizlik modeli, sinxronizatsiya sikli, katalog solishtirish API'si hamda birinchi reference ulagich — **Uzum Market** integratsiyasi bo‘yicha texnik qo‘llanmani taqdim etadi.

---

## 1. Arxitektura va Konseptsiya

Zayunoning an’anaviy modeli tashqi bizneslardan to‘g‘ridan-to‘g‘ri Zayuno Provider API spesifikatsiyasini amalga oshirishni talab qilar edi (`remote-http`). Ko‘plab sotuvchilar va xizmat ko‘rsatish korxonalari (Uzum, Billz, iiko, YCLIENTS, Ozon) esa tayyor tizimlarda ishlaydi va o‘z API'larini qayta yozish resursiga ega emas.

**Managed Connectors** modeli bizneslarga o‘z tizimlarining API kaliti yoki tokenini kiritish orqali 1-click no-code integratsiyani taqdim etadi:

```text
Seller (Provider Portal)
         ↓  (API Key kiritadi, do'kon tanlaydi)
Connector Credential (AES-256-GCM shifrlangan)
         ↓
Connector Instance (Holat, do'kon bog'lanishi, lock)
         ↓
Managed Connector Runtime (UzumMarketConnector, SyntheticRetailConnector, ...)
         ↓
Snapshot Staging & Diff Engine (SyncedProduct)
         ↓
Canonical Zayuno Provider Adapter (ManagedConnectorAdapter)
         ↓
Core Orchestrator / Search / Compare / Catalog
         ↓
ChatGPT / Claude / Zayuno Mobile / Web
```

### Muhim Asosiy Qoidalar
1. **Core Mustaqilligi:** Core Orchestrator va Catalog modullarida `if (connector === 'uzum')` kabi platformaga xos shartli tekshiruvlar mutlaqo yo‘q. Hamma narsa `ManagedConnector` interfeysi va `capabilities` orqali ishlaydi.
2. **Soxta Harakatlarga Yo‘l Qo‘yilmaydi:** Agar platforma (masalan, Uzum) tashqi savat, buyurtma yoki to‘lov API'sini taqdim qilmasa, connector faqat `METADATA`, `HEALTH`, `CATALOG` va `SEARCH` qobiliyatlariga ega bo‘ladi. `ACTION_CREATE`, `QUOTE` yoki `WEBHOOK` soxta tarzda kiritilmaydi. Xaridor to‘g‘ridan-to‘g‘ri mahsulotning rasmiy havolasiga (`productUrl`) yo‘naltiriladi.
3. **Multi-Tenant Izolyatsiya:** Bir nechta sotuvchi bir xil tashqi platformadan (masalan, Uzum) foydalansa ham, ularning mahsulotlari va hisob ma’lumotlari `providerId` va `instanceId` darajasida qat’iy ajratilgan.

---

## 2. Xavfsizlik va Shifrlash (AES-256-GCM)

Sotuvchilar kiritgan barcha API kalitlari va maxfiy ma’lumotlar bazada ochiq matn (plaintext) holatida saqlanmaydi:

- **Algoritm:** `AES-256-GCM` (authenticated encryption with associated data).
- **Format:** `iv:tag:ciphertext` (hex formatida).
- **Kalit Manbasi:** Muhit o‘zgaruvchisi `ENCRYPTION_KEY` (kamida 32 bayt).
- **Maskalash:** API javoblarida va UI'da maxfiy kalit doimo maskalangan ko‘rinishda qaytariladi (masalan, `3foS...EdC=`). Asl kalit yoki shifrlangan matn frontendga, audit loglariga yoki git'ga chiqarilmaydi.
- **Rotatsiya:** Sotuvchi istalgan vaqtda kalitni yangilashi (`rotateCredential`) mumkin. Yangilashdan oldin tashqi platforma orqali preflight tekshiruv bajariladi va yangi sinxronizatsiya ishga tushiriladi.

---

## 3. Ma’lumotlar Bazasi Modeli (Prisma)

Besh yangi model yaratilgan:

1. `ConnectorDefinition`: Mavjud platformalar ro‘yxati (`uzum`, `billz`, `iiko`, `synthetic-test`), ularning turi, qo‘llab-quvvatlaydigan qobiliyatlari (`capabilities`), ikonka va konfiguratsiya sxemasi.
2. `ConnectorCredential`: Shifrlangan kalitlar (`encryptedSecret`), maskalangan qiymat (`maskedSecret`), provayderga bog‘lanish.
3. `ConnectorInstance`: Provayderning ulangan instansi — holati (`CONNECTED`, `SYNCING`, `ERROR`, `DISCONNECTED`), tanlangan tashqi do‘koni (`selectedShopId`, `selectedShopName`), sinxronizatsiya qulfi (`syncLockUntil`) va oxirgi natijalar.
4. `ConnectorSyncRun`: Har bir sinxronizatsiya sikli logi — turi (`MANUAL`, `SCHEDULED`), holati (`RUNNING`, `SUCCESS`, `FAILED`, `CANCELLED`), import qilingan, faol va yashirilgan tovarlar soni.
5. `SyncedProduct`: Sinxronlangan tovarlar snapshot ombori. Unikal indeks: `[instanceId, externalShopId, externalProductId]`.

---

## 4. Sinxronizatsiya Sikli (Snapshot Staging & Diff Engine)

Sinxronizatsiya quyidagi bosqichlarda amalga oshiriladi:

1. **Konkurentlik Qulfi (Concurrency Lock):** Bir vaqtda bir nechta parallel sinxronizatsiyani oldini olish uchun `syncLockUntil` (5 daqiqalik ijaraga berish) tekshiriladi. Agar jarayon davom etayotgan bo‘lsa, `409 Conflict` qaytariladi.
2. **Sahifalab Olish (Pagination):** Tashqi API'dan tovarlar `pageSize=100` bilan sahifama-sahifa olinadi. Olingan tovarlar soni umumiy kutilgan songa yetganda yoki sahifa to‘lmaganda to‘xtatiladi.
3. **Snapshot Staging:** Olingan har bir tovar `SyncedProduct` jadvaliga `upsert` qilinadi va unga joriy `lastSeenRunId = syncRun.id` belgilanadi.
4. **Active $\rightarrow$ Inactive O‘tish:** Joriy muvaffaqiyatli sinxronizatsiyada ko‘rinmagan (`lastSeenRunId != syncRun.id` yoki `null`) eski tovarlar `isVisible: false` qilib yashiriladi.
5. **Xatolikka Bardoshlilik (Fault Tolerance):** Agar tashqi API o‘rtada xato bersa (500 Internal Server Error), eski muvaffaqiyatli snapshot mahsulotlari saqlanib qoladi (ular yashirilmaydi yoki o‘chirilmaydi).
6. **Keshni Yangilash:** Muvaffaqiyatli sinxronizatsiyadan so‘ng Redis keshidagi tegishli provayder katalogi bekor qilinadi (`invalidateAdapterCache`).

---

## 5. Uzum Market Integratsiyasi (Spesifikatsiya)

Uzum Seller OpenAPI asosida quyidagi xaritalash amalga oshirilgan:

- **Autentifikatsiya:** `GET /v1/shops` (Header: `Authorization: Bearer <API_KEY>`).
- **Do‘konlar:** Sotuvchiga tegishli barcha do‘konlar ro‘yxati olinadi.
- **Katalog:** `GET /v1/product/shop/{shopId}?page={page}&size={size}`.
- **Mahsulot Xaritalash:**
  - `id`: `{product.id}_{firstSku.skuId}`
  - `title`: Mahsulot nomi (O‘zbek kirill/lotin/rus).
  - `description`: Matnli tavsif.
  - `brand`: Brend nomi.
  - `category`: Categoriya ma’lumotlari.
  - `basePrice`: Eng arzon faol variant narxi (`sku.price / 100` agar tiyinda bo‘lsa, yoki nominal so‘m).
  - `currency`: `'UZS'`.
  - `productUrl`: `https://uzum.uz/uz/product/{productId}`.
  - `attributes`: Mahsulot xususiyatlari (`characteristics`).
  - `media`: Rasm va galereya (xavfsiz HTTPS havolalar filtrlanadi).
- **Qidiruv va Normalizatsiya:** O‘zbek tilidagi tutuq belgisi (`o‘`, `g‘`, `'`, `‘`, `’`, `` ` ``) va harflar qidiruvda normalizatsiya qilinadi.

---

## 6. Mahsulotlarni Solishtirish (Compare Offerings)

Mijozlar 2 tadan 4 tagacha mahsulotni solishtirishi uchun `POST /api/v1/catalog/compare` endpointi ishlab chiqilgan.

- **Talab:** 2 tadan kam yoki 4 tadan ko‘p taklif yuborilsa, `400 Bad Request` qaytariladi.
- **Matritsa:** Barcha tanlangan mahsulotlarning atributlari (xususiyatlari) umumlashtirilib, dinamik taqqoslash matritsasi tuziladi.
- **Yetishmayotgan Qiymatlar:** Agar biror mahsulotda muayyan parametr mavjud bo‘lmasa, u avtomatik tarzda `"Ma’lumot yo‘q"` sifatida to‘ldiriladi.
- **Narx va Do‘kon:** Narxlar oxirgi sinxronizatsiya holati bo‘yicha ko‘rsatiladi va rasmiy ogohlantirish beriladi.

---

## 7. Yangi Connector Qo‘shish Bo‘yicha Qo‘llanma

Kelgusida yangi tizimlarni (masalan, Billz, iiko, YCLIENTS, Ozon) qo‘shish uchun:

1. `packages/provider-sdk/src/connectors/` ichida `ManagedConnector` interfeysini amalga oshiruvchi yangi klass yarating:
   ```ts
   export class BillzConnector implements ManagedConnector {
     readonly definitionId = 'billz';
     readonly name = 'Billz POS';
     // authenticate, getShops, fetchCatalog
   }
   ```
2. `packages/provider-sdk/src/index.ts` orqali uni eksport qiling.
3. `apps/api/src/modules/connectors/connectors.service.ts` ichida `registerBuiltinConnectors` metodiga ro‘yxatdan o‘tkazing:
   ```ts
   this.registeredConnectors.set('billz', new BillzConnector());
   ```
4. `packages/database/prisma/seed.ts` ga yangi `ConnectorDefinition` qo‘shing.
5. **Tayyor!** Provider portali va Zayuno core hech qanday o‘zgarishsiz ushbu yangi ulagichni qabul qiladi.
