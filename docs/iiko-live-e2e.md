# iiko demo sinovi

Skript: `tests/test-iiko-live-e2e.ts`. Buyruqlarni repo ildizidan ishga tushiring.
API kaliti yo‘qligida hech qanday so‘rov yuborilmaydi; jarayon `BLOCKED`, exit code **2** bilan tugaydi.

## 1. Kalit va faqat o‘qish rejimi

Maxfiy qiymatlarni mahalliy `.env.iiko-demo.local` fayliga kiriting. Bu nom `.gitignore` orqali chiqarib tashlangan.
Faylni commit qilmang; kalitlarni chat, log yoki `TASKS.md` ga yozmang.

- v1 uchun `IIKO_API_LOGIN` — iikoWeb API kaliti. Veb-interfeysning login/paroli bu kalit o‘rnida ishlamaydi.
- v2 uchun `IIKO_APP_ID`, `IIKO_CLIENT_SECRET`, `IIKO_API_KEY` — uchalasi birga.
- `IIKO_E2E_MODE=read-only` — standart rejim; buyurtma yaratmaydi va bekor qilmaydi.

### iikoWeb tashqi menyusi

iikoWeb → **Внешние меню**da menyu yarating. So‘ng **Настройки Cloud API → Интеграции**da
shu API login uchun **Внешнее меню**ni tanlab saqlang. `/api/2/menu` ro‘yxatidan olingan IDni
`IIKO_EXTERNAL_MENU_ID` sifatida mahalliy env fayliga yozing. Adapter shu qiymat mavjud bo‘lsa
`/api/menu/v3/by_id` orqali katalogni o‘qiydi; mavjud bo‘lmasa eski `/api/1/nomenclature`
yo‘lini ishlatadi. Ko‘p restoranda menyu IDni providerning `config.externalMenuId` maydonida
alohida belgilang. iiko rasmiy [OpenAPI sxemasi](https://api-ru.iiko.services/api-docs/docs)
ushbu V3 endpointni ham ko‘rsatadi.

2026-10-02 demo sinovida `/api/2/menu` menyuni ro‘yxatga qaytardi, `/api/2/menu/by_id`
esa serverning 500 xatosini berdi. `/api/menu/v3/by_id` xuddi shu menyudan 1 ta taom va 100 ₽
narxni qaytardi. Terminal offline bo‘lsa live E2E quote bosqichiga o‘tmaydi.

### Yangi kalit v2 talab qilsa

2026-10-01 real demo sinovida `/api/1/access_token` HTTP 403 bilan kalit faqat
`/api/v2/access_token`ni qo‘llashini bildirdi. Bunday kalit uchun
[iiko Developer Portal](https://public-api.iikoweb.ru/portal)da kompaniya ma’lumotlarini
to‘ldirib, application yarating. Berilgan `appId` va bir marta ko‘rsatiladigan
`clientSecret`ni mahalliy env fayliga `IIKO_APP_ID` va `IIKO_CLIENT_SECRET` sifatida qo‘shing.
Mavjud `IIKO_API_LOGIN`ni almashtirish shart emas: harness uni v2 `apiKey` maydoniga ham uzatadi.
Rasmiy talablar: [iiko OpenAPI](https://api-ru.iiko.services/api-docs/docs).

Node.js 20.6 yoki undan yangi versiya bilan:

```powershell
node --env-file=.env.iiko-demo.local --import tsx tests/test-iiko-live-e2e.ts
```

Birinchi chaqiruv autentifikatsiya qilib, ko‘rinadigan organization UUIDlarini chiqaradi va `BLOCKED` bo‘ladi.
Demo tashkilot UUIDsini `IIKO_ORGANIZATION_ID` sifatida kiriting. Keyingi chaqiruv terminal UUIDlarini ko‘rsatadi;
demo terminalni `IIKO_TERMINAL_GROUP_ID` sifatida kiriting. Birinchi tashkilot yoki terminal avtomatik tanlanmaydi.

To‘g‘ri target bilan skript terminalning onlayn holati, menyu, stop-list va quoteni tekshiradi.
Mavjud oddiy mahsulot va variant UUIDlari, summa va valyuta chiqariladi.
`READ_ONLY_PASSED` to‘liq order E2E o‘tganini anglatmaydi.

## 2. Demo buyurtma

Faqat demo-stend uchun ajratilgan API kaliti va tashkilot/terminaldan foydalaning.
API javobidan tashkilot demo ekanini avtomatik aniqlash imkoni bu skriptda yo‘q;
quyidagi tasdiq aynan tanlangan target sinov muhiti ekanini bildiradi.

Mahalliy konfiguratsiyaga quyidagilarni kiriting:

| O‘zgaruvchi | Qiymat |
| --- | --- |
| `IIKO_E2E_MODE` | `order` |
| `IIKO_E2E_CONFIRM_DEMO_ORDER` | `true` — shu demo targetga bitta buyurtma yuborish va bekor qilishga ruxsat |
| `IIKO_ORGANIZATION_ID` | Tanlangan demo tashkilot UUIDsi |
| `IIKO_TERMINAL_GROUP_ID` | Shu tashkilotga tegishli onlayn demo terminal UUIDsi |
| `IIKO_TEST_OFFERING_ID` | Menyudan tanlangan mahsulot UUIDsi |
| `IIKO_TEST_VARIANT_ID` | Mavjud variant UUIDsi; o‘lchamsiz mahsulotda katalog variant IDsi |
| `IIKO_TEST_CUSTOMER_NAME` | Test uchun ajratilgan mijoz nomi |
| `IIKO_TEST_PHONE` | Siz nazorat qiladigan, sinov uchun tasdiqlangan xalqaro formatdagi raqam |
| `IIKO_TEST_ADDRESS`, `IIKO_TEST_CITY` | Demo yetkazish sozlamalariga mos tasdiqlangan test manzili |
| `IIKO_TEST_CURRENCY` | Ko‘rilgan quote valyutasi, masalan `RUB` |
| `IIKO_TEST_MAX_TOTAL` | Shu sinov uchun ruxsat etilgan eng katta summa, musbat son |

Avvalgi buyruqni qayta ishga tushiring. Skript bir dona oddiy mahsulot uchun yangi quote oladi.
Majburiy/default modifierli mahsulotlarni bu smoke test tanlamaydi; ular uchun demo menyuda oddiy mahsulot tayyorlang.
Telefon, manzil yoki boshqa zarur maydon bo‘lmasa order yuborilmaydi. Soxta ma’lumotlar sukut bo‘yicha qo‘yilmaydi.

Buyurtma yaratilgach, iiko bergan order ID qayd etiladi. Yaralish holati va iiko hisoblagan summa tekshiriladi.
Keyin cancel bir marta yuboriladi; yakuniy `Cancelled` holati iiko javobi va adapter orqali tasdiqlanishi kerak.
Status so‘rovlari har ikki soniyada, ko‘pi bilan 15 marta bajariladi; har bir HTTP so‘rovining alohida timeouti bor.

Order ID ma’lum bo‘lsa, keyingi tekshiruv xatosida ham cleanup bajariladi. Create javobi yo‘qolib ID olinmasa,
skript orderni qayta yubormaydi: demo terminaldagi buyurtmalarni tekshiring. Cleanup tasdiqlanmasa,
logdagi order ID bo‘yicha iiko ichida holatni tekshiring. Terminal uzilishi yoki jarayon to‘xtatilishi
cleanup bajarilishini kafolatlamaydi.

## Natijalar va lokal tekshiruv

- `E2E_PASSED`, exit **0**: order yaratilishi, iiko summasi va yakuniy cancel tasdiqlandi.
- `READ_ONLY_PASSED`, exit **0**: faqat o‘qish va quote tekshirildi.
- `FAILED`, exit **1**: API, quote, order yoki cleanup tekshiruvi o‘tmadi.
- `BLOCKED`, exit **2**: konfiguratsiya yoki sinovga mos menyu yetishmaydi. Bu PASS emas.

Tarmoqsiz regressiya va turlarni tekshirish:

```powershell
node --import tsx tests/test-iiko-live-e2e-guardrails.ts
pnpm exec tsc -p tests/tsconfig.iiko-live-e2e.json
```

Haqiqiy kalit bilan o‘tilgan natijagina live E2E hisoblanadi; mock testlar uning o‘rnini bosmaydi.
