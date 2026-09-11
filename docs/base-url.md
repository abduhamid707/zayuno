# API Base URL & Endpoints

**Provider API Base URL — siz qurgan backend manzili.** Masalan https://YOUR_HOST/zayuno. Zayuno shu URL oxiriga /provider-info, /health, /catalog va profilingizdagi qolgan yo‘llarni qo‘shadi.

## Uchta manzilni ajrating

| Surface | Base URL | Credential |
| --- | --- | --- |
| Provider API: siz qurasiz | https://YOUR_HOST/zayuno | Provider API key / tanlangan auth |
| Zayuno Core: siz qurmayapsiz | https://api.zayuno.uz/api/v1 | Tegishli account yoki integration token |
| Provider webhook: siz yuborasiz | https://api.zayuno.uz/api/v1/webhooks/{providerSlug} | ZAYUNO_WEBHOOK_SECRET bilan HMAC |

Portal frontend URL’ini API Base URL sifatida kiritmang. Oxiriga /health ham qo‘shmang: /health route’ini Zayuno o‘zi qo‘shadi.

## 1. Birinchi health endpoint

Quyidagi minimal misollar server va auth ulanishini boshlash uchun. Ular to‘liq provider implementation emas. Metadata, catalog, offering va profilingiz talab qilgan qolgan route’larni [generated reference](/docs/contract-reference/) bo‘yicha yozing.

### Express & TypeScript

~~~typescript
import express from 'express';
const app = express();
const key = process.env.PROVIDER_API_KEY;
if (!key) throw new Error('Set PROVIDER_API_KEY on the server');

app.use('/zayuno', (req, res, next) => {
  if (req.header('x-provider-api-key') !== key) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  next();
});
app.get('/zayuno/health', (_req, res) => {
  res.json({ status: 'HEALTHY', latencyMs: 0, timestamp: new Date().toISOString() });
});
app.listen(4001);
~~~

### Python (FastAPI)

~~~python
import os
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()
key = os.environ["PROVIDER_API_KEY"]
if not key:
    raise RuntimeError("Set PROVIDER_API_KEY on the server")

@app.get("/zayuno/health")
def health(x_provider_api_key: str = Header(default="")):
    if x_provider_api_key != key:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    return {
        "status": "HEALTHY",
        "latencyMs": 0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
~~~

latencyMs: 0 yuqorida faqat minimal liveness namunasidir. Ishlab chiqarish muhitida haqiqiy dependency holatini o‘lchang; nosog‘lom tizimni HEALTHY deb qaytarmang.

## 2. Serverga bevosita so‘rov

~~~bash
curl "http://localhost:4001/zayuno/health" \
  -H "x-provider-api-key: $PROVIDER_API_KEY"
~~~

Local test sizning kompyuteringizda ishlaydi. Hosted Zayuno localhost yoki private IP’ga kira olmaydi. Provider portal uchun public HTTPS test host/tunnel kerak; key himoyasini o‘chirmang.

## 3. Contractni joriy qilish

1. [Capability profilingizni](capabilities.md) tanlang.
2. [OpenAPI JSON](/openapi.json) orqali request/response schema’larini oling.
3. Provider route’larni canonical shaklda yozing: masalan quote uchun **POST /quote**, Core’dagi POST /api/v1/quotes emas.
4. Backendning haqiqiy ID, variant, narx va mavjudligini normalized response’ga map qiling.
5. Idempotency’ni barqaror storage’da saqlang. Buyurtmalarni in-memory demo bilan productionga chiqarmang.

## 4. Portalda ulash

[Mening biznesim](/?tab=apps) → Provider API Base URL → Authentication → Capabilitylar → saqlash. Keyin [API tekshiruvi](/?tab=certification).

Frameworkdan qat’i nazar response bir xil contractga mos bo‘lishi kerak. [AI Kit](/?doc=ai-agents) shu contract asosida vazifani agentingizga tayyorlab beradi.

## 5. Networking va xatolar

401 — key/auth method; 404 — base path; HTML response — frontend URL; timeout — public reachability yoki backend. [Batafsil troubleshooting](troubleshooting-faq.md).
