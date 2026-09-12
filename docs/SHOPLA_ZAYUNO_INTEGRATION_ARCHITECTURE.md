# Shopla <-> Zayuno Integratsiya Arxitekturasi va Kontrakt Spetsifikatsiyasi

**Hujjat versiyasi:** 1.0.0  
**Sana:** 2026-09-12  
**Maqsad:** Shopla platformasidagi do'konlarni Zayuno AI ekotizimiga universal provayder sifatida ulash uchun yagona texnik kontrakt.

---

## 1. Asosiy Prinsiplar va Haqiqat Manbai (Source of Truth)

1. **Yagona Adapter - Ko'p Do'konlar:**
   - Zayuno tomonida har bir Shopla do'koni uchun alohida server yoki kod yozilmaydi.
   - Yagona `ShoplaProviderAdapter` (yoki standartlashtirilgan Remote HTTP controller) ishlaydi.
   - Har bir do'kon Zayunoda alohida provayder identifikatori (`providerSlug = shopla-${shop._id}`) sifatida ro'yxatdan o'tadi.

2. **Shopla - Tijorat va Ombor Manbai (Source of Truth):**
   - Mahsulot katalogi, narxlar, SKU variantlari, ombor qoldiqlari (`StockService`), yetkazib berish tariflari (`DeliverySettings`) va Payme to'lov havolalari faqat va faqat Shopla tizimida boshqariladi.
   - Zayuno qidiruv va dialog tezligi uchun kesh saqlashi mumkin, lekin **hech qachon eskirgan kesh bo'yicha buyurtma tasdiqlamaydi**. Har bir `quote` va `action` chaqiruvida Shopladan real narx va qoldiq tekshiriladi.

3. **Mavjud Savatdan Mustaqillik (Direct Headless Checkout):**
   - Mavjud Shopla checkout (`orders.service.ts:239`) oddiy foydalanuvchining shaxsiy sessiya savatidan (`Cart`) ishlaydi.
   - Zayuno orqali keladigan buyurtmalar mijozning saytdagi savatini buzmasligi uchun Shopla backendida to'g'ridan-to'g'ri `items: [{ variantId, quantity }]` qabul qiluvchi **Direct Order** API ishlatiladi.

---

## 2. Identifikatorlar Xaritasi (ID & Entity Mapping)

| Zayuno Konsepsiyasi | Shopla Konsepsiyasi | Format / Namuna | Izoh |
| :--- | :--- | :--- | :--- |
| `providerSlug` | `Shop._id` / `Shop.slug` | `shopla-66a1b2c3d4e5f67890123456` | Zayunoda do'konning unikal slug'i |
| `offeringId` | `Product._id` + `ProductVariant._id` | `prod123:var456` | Aniq tanlangan mahsulot va variant kombinatsiyasi |
| `quoteId` | Shopla durable Quote ID | `qt_a1b2c3...` | MongoDB TTL bilan 15 daqiqa yashaydigan narx kotirovkasi |
| `actionId` | `Order._id` / Zayuno Action UUID | `order_66f1a...` | Shopla tizimidagi haqiqiy buyurtma |
| `paymentReference` | `Order.paymentGroupId` | `pg_uuid_v4` | Payme to'lov tranzaksiyasi bog'lovchisi |
| `idempotencyKey` | Idempotency Key | `idem_uuid_v4` | Takroriy buyurtmalarni oldini oluvchi unikal kalit |

---

## 3. Zayuno Provider Protocol v1 <-> Shopla API Mapping

Shopla backend (`brend-market`) quyidagi xavfsiz integratsiya endpointlarini taqdim etadi (`/api/v1/zayuno/shops/:shopId/...`):

### 3.1 Metadata & Health
- `GET /health` -> `HealthCheckResult`: Do'kon holati (APPROVED, faol, ish vaqti ochiq).
- `GET /info` -> `ProviderInfo`: Do'kon nomi, logo, telefon, toifa, yetkazib berish zonalari.

### 3.2 Filiallar va Joylashuv
- `GET /locations` -> `Location[]`: Do'konning asosiy manzili va filiallari koordinatalari (`lat`, `lng`).

### 3.3 Katalog va Qidiruv
- `GET /catalog` -> `Catalog`: Do'konning barcha faol mahsulotlari, variantlari, narxlari va rasmlari.
- `GET /catalog/search?q=...` -> `Offering[]`: Do'kon ichida qidiruv.
- **Offering tuzilishi:**
  - `id`: `${productId}:${variantId}`
  - `title`: `${product.name} - ${variant.name}`
  - `price`: `variant.salePrice || variant.price` (UZS)
  - `imageUrl`: `variant.images[0]?.url || product.images[0]?.url`
  - `attributes`: `variant.attributes` (rang, o'lcham, hajm)
  - `stock`: ombordagi mavjud qoldiq (`quantity - reserved`)

### 3.4 Quote (Yakuniy hisob-kitob)
- `POST /quote`:
  - **Request:** `{ items: [{ offeringId, quantity }], destination: { raw, region } }`
  - **Validation:** Har bir variant uchun omborda yetarli qoldiq bormi? Do'kon yetkazib berish zonasi narxi qancha?
  - **Response (`NormalizedQuote`):**
    - `lines`: Mahsulotlar summasi
    - `deliveryFee`: Do'kon zonalari bo'yicha yetkazish narxi (yoki bepul)
    - `total`: Jami summa (UZS)
    - `expiresAt`: 15 daqiqa (agar narx yoki qoldiq o'zgarsa, quote bekor bo'ladi)

### 3.5 Action Create (Haqiqiy buyurtma yaratish)
- `POST /actions`:
  - **Request:** `{ quoteId, items, customer: { name, phone }, deliveryAddress, paymentMethod: 'PAYME', idempotencyKey }`
  - **Jarayon:**
    1. Idempotency tekshiriladi (takroriy so'rov bo'lsa, mavjud buyurtma qaytariladi).
    2. `StockService.reserveForOrder` orqali ombordan tovar atomik band qilinadi.
    3. Shopla `Order` obyekti yaratiladi (`status: 'PURCHASED'`, `paymentStatus: 'PENDING'`).
    4. Payme checkout havolasi generatsiya qilinadi.
  - **Response (`NormalizedAction`):**
    - `id`: Shopla Order ID
    - `status`: `AWAITING_PAYMENT`
    - `nextAction`: `{ type: 'OPEN_URL', url: 'https://checkout.payme.uz/...' }`

### 3.6 Action va to'lov holati
- `GET /actions/:actionId` -> Buyurtma va to'lov holati.
- Payme server callback'i Shopla orderining `paymentStatus` maydonini yangilaydi. Zayuno status endpointini qayta o'qiganda `PAID` holat `CONFIRMED` sifatida qaytadi. Alohida Shopla -> Zayuno webhook push oqimi keyingi kengaytma bo'lib qoladi.

---

## 4. Moliyaviy va Valyuta Qoidalari

1. Barcha hisob-kitoblar so'mda (`UZS`).
2. Payme URL shakllantirishda `tiyin`ga o'giriladi: `amountInTiyin = Math.round(total * 100)`.
3. Barcha to'lovlar Shopla kassasi / Payme orqali to'g'ridan-to'g'ri amalga oshiriladi. Zayuno mijozning karta ma'lumotlarini ko'rmaydi va saqlamaydi.
