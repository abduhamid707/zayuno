# Uzum Market Seller API — Imkoniyatlar va Maydonlar Xaritasi (Capability Mapping)

Ushbu hujjat Uzum Market Seller OpenAPI 3.0 spetsifikatsiyasi (`https://api-seller.uzum.uz/api/seller-openapi/swagger/api-docs`) va Zayuno kanonik shartnomasi (`@zayuno/contracts`) o‘rtasidagi tasdiqlangan moslik xaritasidir.

## 1. Autentifikatsiya va Endpointlar

- **Base URL:** `https://api-seller.uzum.uz/api/seller-openapi`
- **Auth Header:** `Authorization: <token>`
  - OpenAPI `components.securitySchemes.TokenAuth` da aniq ko‘rsatilgan: `Токен авторизации без префикса Bearer`.
- **Do‘konlar ro‘yxati:**
  - `GET /v1/shops`
  - Javob: `OrganizationDto[]`
  - Har bir tashkilot ichida `shops: ShopDto[]` (`id`, `name`, `status`).
- **Mahsulotlar katalogi:**
  - `GET /v1/product/shop/{shopId}`
  - Parametrlar: `page` (0-dan boshlanadi), `size` (standart 50), `filter` (`ACTIVE` faol sotuvdagi tovarlar uchun), `searchQuery` (ixtiyoriy).
  - Javob: `AllProducts` (`productList: SellerProductCard[]`, `totalProductsAmount: number`).

## 2. Maydonlar Xaritasi (Field Mapping)

| Uzum API maydoni | Turi | Zayuno Kanonik maydoni (`Offering`) | Izoh va yetishmasa qanday ishlanishi |
| :--- | :--- | :--- | :--- |
| `productId` | `int64` | `offeringCode`, `metadata.externalProductId` | Mahsulotning Uzumdagi unikal identifikatori |
| `title` | `string` | `title` | Mahsulotning to‘liq nomi |
| `category.title` | `string` | `categoryTitle`, `categorySlug` | Kategoriya nomi va slugifikatsiya qilingan kaliti |
| `category.id` | `int64` | `metadata.externalCategoryId` | Tashqi kategoriya IDsi |
| `image` / `previewImg` | `string` | `imageUrl`, `media` | `isSafePublicHttpsUrl` orqali tekshirilgan HTTPS rasm havolasi |
| `rating` | `number` | `metadata.rating` | Mahsulot reytingi |
| `status` | `string` | `sourceStatus` | Uzumdagi status (`ACTIVE`, `INACTIVE`, `ARCHIVE` va h.k.) |
| `quantityActive` | `int32` | `metadata.warehouseStock` | FBO (Uzum omboridagi) qoldiq |
| `quantityFbs` | `int32` | `metadata.sellerStock` | FBS (Sotuvchi omboridagi) qoldiq |
| `skuList` | `array` | `variants: OfferingVariant[]` | Mahsulotning o‘lcham/rang variantlari |
| `skuList[].skuId` | `int64` | `variants[].sku`, `variants[].id` | Variant SKU identifikatori |
| `skuList[].skuTitle` | `string` | `variants[].name` | Variant nomi (masalan "Qora / 42") |
| `skuList[].price` | `int64` | `variants[].basePrice`, `basePrice` | Narx (so‘mda). Minimal variant narxi asosiy narx bo‘ladi |
| `skuList[].quantity*` | `int32` | `variants[].isAvailable` | `quantityActive + quantityFbs > 0` bo‘lsa `true` |
| `skuList[].blocked` | `boolean`| `variants[].isAvailable` | Agar bloklangan yoki arxivda bo‘lsa `false` |
| *(Mavjud emas)* | - | `description` | Uzum jadvalida to‘liq tavsif qaytmaydi. `null` qo‘yiladi, soxta to‘ldirilmaydi |
| *(Mavjud emas)* | - | `productUrl` | Qat’iy qoida: `https://uzum.uz/uz/product/${productId}?sku=${skuId}` |

## 3. Mahsulot Havolasi (Canonical Product URL)
Uzum Market veb-sayti va mobil ilovasining rasmiy havolalanish sxemasi:
- Asosiy mahsulot: `https://uzum.uz/uz/product/{productId}`
- Aniq SKU varianti: `https://uzum.uz/uz/product/{productId}?sku={skuId}`
Havola Zayunoning barcha xavfsiz HTTPS URL filtrlaridan o‘tadi va mijozga "Uzumda ko‘rish" handoff tugmasi orqali to‘g‘ridan-to‘g‘ri taqdim etiladi. Hech qanday soxta Quote yoki Action yaratilmaydi.

## 4. Rate-Limit va Xatoliklarni Boshqarish
- Uzum javob headerlari: `x-ratelimit-remaining`, `x-ratelimit-replenish-rate`, `x-ratelimit-burst-capacity`, `x-ratelimit-limit-per-day`.
- Qoida: Agar `x-ratelimit-remaining === '0'` bo‘lsa yoki 429 xatosi qaytsa, 1000ms eksponensial kutish qo‘llanadi.
- Ulanish xatosi (401/403): Foydalanuvchiga API kalit xato ekani yoki Uzum tomonidan bekor qilingani haqida aniq ko‘rsatma beriladi.
