# Webhooks & asynchronous events

Provider buyurtma holati o‘zgarganda Zayunoga imzolangan event yuboradi. Provider action ID, event ID va status haqiqiy ma’lumotlardan olinadi.

## Canonical endpoint

~~~text
POST https://api.zayuno.uz/api/v1/webhooks/{providerSlug}
Content-Type: application/json
x-zayuno-signature: <HMAC_SHA256_HEX>
~~~

providerSlug URL ichida beriladi. Event ichidagi providerSlug ham shu providerga tegishli bo‘lsin. Yangi integratsiyalar canonical route’dan foydalanadi.

## Event schema va namuna

Aniq JSON, required fieldlar va response [generated webhook reference](/docs/contract-reference/#contract-webhooks) ichida.

- eventId: shu hodisa uchun barqaror ID; retry’da almashtirmang.
- eventType: contractga mos event turi.
- providerSlug: ro‘yxatdan o‘tgan provider.
- actionId yoki externalActionId: to‘g‘ri buyurtmani aniqlash uchun.
- timestamp: hodisa vaqti, ISO 8601.
- newStatus va newPaymentStatus: o‘zgarayotgan normalized holatlar.

Faqat backend tasdiqlagan statusni yuboring. To‘lov uchun PAID qiymati provider xabari hisoblanadi; u bank settlement’i mustaqil tekshirilganini anglatmaydi.

## Raw body va HMAC

HMAC-SHA256 hex digest’ni ZAYUNO_WEBHOOK_SECRET bilan **aynan yuboriladigan rawBody** ustida hisoblang. x-zayuno-signature headerga yozing. Timestampni signature stringiga qo‘shmang. [Tayyor TypeScript signing misoli](authentication.md).

## Delivery va retry

HTTP natijasini tekshiring. Timeout yoki vaqtinchalik server xatosida o‘sha eventId bilan cheklangan backoff retry qiling. 401 da key va imzoni tuzatmasdan doimiy retry qilmang.

Event statusi o‘zgarsa yangi eventId bering. Bir xil eventni qayta yuborish takroriy buyurtma yaratmasligi kerak. Idempotency event va action darajasida alohida ahamiyatga ega.

## Diagnostika

[So‘rovlar jurnali](/?tab=inspector) va [troubleshooting](troubleshooting-faq.md) yordamida provider slug, trace ID, signature header nomi va timestamp’ni tekshiring. Raw secretlarni diagnostika xabariga qo‘shmang.
