# Authentication & HMAC

Provider credentiallari portalga kirish credentiallaridan farq qiladi. Yo‘nalishni aniqlamasdan key almashtirmang.

## Ikki xil credential

| Qiymat | Kim yaratadi | Qayerda ishlatiladi |
| --- | --- | --- |
| PROVIDER_API_KEY | Dasturchi provider backend uchun maxfiy API key yaratadi | Zayuno → provider; odatda x-provider-api-key |
| ZAYUNO_WEBHOOK_SECRET | Zayuno webhook HMAC secret yaratadi | Provider → Zayuno; event imzosini hisoblash |
| Portal access token | Zayuno account auth | Portal → Core; Authorization: Bearer |

Self-service oqimida provider API key’ni backendda o‘rnating, keyin portalning API sozlamalariga kiriting. Zayuno yaratgan webhook secret handoff paytida ko‘rsatiladi. Boshqaruv orqali provision qilingan integratsiyalarda credential banneri ikkala qiymatni ham berishi mumkin; banner va o‘z backendingizdagi qiymatni moslang.

To‘liq secret dashboarddan qayta olinmaydi. Secret yo‘qolsa tegishli credentialni yangilang. Webhook secretni rotate qilish oldingi imzoni bekor qiladi; provider backenddagi qiymatni ham yangilash kerak.

## Zayuno → provider authentication

Portalda tanlangan authMethod har bir outbound requestga tatbiq qilinadi.

| authMethod | Header | Qiymat |
| --- | --- | --- |
| API_KEY | x-provider-api-key | Provider backend kutadigan key |
| BEARER_TOKEN | Authorization | Bearer + sozlangan token |
| HMAC_SIGNATURE | x-zayuno-signature | Raw request body ustidagi HMAC-SHA256 hex |

~~~http
GET /zayuno/health HTTP/1.1
Host: YOUR_HOST
x-provider-api-key: <PROVIDER_API_KEY>
Accept: application/json
~~~

HMAC_SIGNATURE uchun joriy remote adapter **faqat raw body**ni imzolaydi. Timestamp prefix qo‘shilmaydi. Body bo‘lmagan GET so‘rovda bo‘sh satr imzolanadi. Qabul qiluvchi backend aynan shu baytlarni tekshirishi kerak; JSON’ni parse qilib qayta stringify qilish imzoni o‘zgartirishi mumkin.

## Provider → Zayuno webhook signing

Canonical manzil:

~~~text
POST https://api.zayuno.uz/api/v1/webhooks/{providerSlug}
Content-Type: application/json
x-zayuno-signature: <HMAC_SHA256_HEX>
~~~

Backendda hisoblang; browserda yoki mobile clientda emas:

~~~typescript
import { createHmac } from 'node:crypto';

const secret = process.env.ZAYUNO_WEBHOOK_SECRET;
if (!secret) throw new Error('ZAYUNO_WEBHOOK_SECRET is required');

const rawBody = JSON.stringify(event);
const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

const response = await fetch(
  'https://api.zayuno.uz/api/v1/webhooks/' + encodeURIComponent(providerSlug),
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-zayuno-signature': signature
    },
    body: rawBody
  }
);
if (!response.ok) throw new Error('Webhook delivery failed: ' + response.status);
~~~

[Canonical event JSON](/docs/contract-reference/#contract-webhooks). x-provider-signature compatibility header ham qabul qilinadi; yangi integratsiyada x-zayuno-signature ishlating. x-signature canonical header emas.

## 401 bo‘lsa nimani tekshirasiz?

1. Request yo‘nalishini tekshiring: provider API key va webhook secret alohida.
2. Auth method va header nomi portalga mos bo‘lsin.
3. Secret boshida/oxirida ortiqcha whitespace bo‘lmasin.
4. HMAC uchun yuborilgan raw body va imzolangan rawBody bir xil bo‘lsin.
5. Webhook secret rotate qilingan bo‘lsa backendni ham yangilang.
6. [So‘rovlar jurnali](/?tab=inspector) orqali trace va xato kodini toping.

Kalitlarni logga, source control’ga yoki AI briefga qo‘shmang. Xato haqida ma’lumot berishda header qiymatini niqoblang.
