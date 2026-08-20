# 14. Troubleshooting & Developer FAQ

This guide addresses the most common integration challenges, networking issues, cryptographic verification pitfalls, and error codes encountered when connecting external provider systems to Zayuno.

---

## 1. CORS & Preflight Requests

When testing from web-based simulators, developer dashboards, or frontend applications, your provider HTTP endpoints may receive browser preflight `OPTIONS` requests before the actual `POST` or `GET` request.

### Required CORS Headers
Your server must respond to `OPTIONS` preflight requests with `204 No Content` or `200 OK` and include:
```http
Access-Control-Allow-Origin: * (or https://developers.zayuno.uz)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-signature, x-provider, idempotency-key
Access-Control-Max-Age: 86400
```

### Express.js Example:
```typescript
import cors from 'cors';
app.use(cors({
  origin: ['https://developers.zayuno.uz', 'https://zayuno.uz'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-provider', 'idempotency-key']
}));
```

---

## 2. Webhook & Request HMAC Signature Verification (`rawBody`)

Zayuno signs all outbound webhook payloads using **HMAC-SHA256** and passes the hexadecimal digest in the `x-signature` header.

> [!IMPORTANT]
> **Use the Raw Request Body (`rawBody`)!**
> You must compute the HMAC digest on the **exact raw bytes** received over the wire. Parsing the JSON body first (`JSON.parse` or body-parser) and re-stringifying it (`JSON.stringify(req.body)`) alters whitespace, property order, and unicode escapes, causing signature mismatch!

### Node.js / Express Example:
```typescript
import crypto from 'crypto';
import express from 'express';

const app = express();
// Capture raw buffer before JSON parsing
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/api/zayuno-webhook', (req: any, res) => {
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.ZAYUNO_WEBHOOK_SECRET!;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature || '', 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  // Process event safely
  res.status(200).json({ received: true });
});
```

### Python (FastAPI / Flask) Example:
```python
import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/api/zayuno-webhook")
async def handle_webhook(request: Request):
    signature = request.headers.get("x-signature", "")
    raw_body = await request.body()
    secret = b"your_webhook_secret"

    expected_sig = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    payload = await request.json()
    return {"received": True}
```

---

## 3. Latency & Timeout Service Level Agreements (SLAs)

AI agents (ChatGPT, Claude, Autonomous Orchestrators) maintain a **15–30 second total timeout** for user conversational turns.

- **Quote & Search endpoints (`POST /quote`, `GET /search`)**: Must respond within **1.5 seconds**.
- **Action creation (`POST /action`)**: Must respond within **2.0 seconds**.
- **Health check (`GET /health`)**: Must respond within **500 milliseconds**.

If your backend requires asynchronous external inventory reservations or heavy billing calls, return a pending status with a checkout URL (`nextAction`) immediately rather than blocking the HTTP response.

---

## 4. Quote Math Validation

Zayuno strictly validates quote mathematics. All prices must adhere to the exact formula:
$$\text{total} = \text{subtotal} + \text{fees} - \text{discount}$$

- **Non-negative numbers**: `subtotal >= 0`, `fees >= 0`, `discount >= 0`, `total >= 0`.
- **Currency consistency**: `currency` must match across all lines and totals (e.g. `"UZS"`).
- **Line items summation**: `subtotal` must equal the sum of `line.total` across all quote lines.
- **Expiration**: `expiresAt` must be an ISO 8601 UTC timestamp in the future (recommended: 5–15 minutes).

---

## 5. Idempotency Guarantees

All quote and action creation requests carry an `idempotencyKey` (UUID or random string).
- If your system receives a duplicate `idempotencyKey` within 24 hours:
  1. **Do not create a duplicate order or charge.**
  2. **Return the original action record** with its current status.
  3. Ensure database constraints enforce uniqueness on `(provider_id, idempotency_key)`.

---

## 6. HTTPS & SSL Certificate Requirements

In production environments:
- Endpoints must use **`https://`**.
- SSL certificates must be issued by a recognized public Certificate Authority (Let's Encrypt, Cloudflare, DigiCert, Google Trust Services).
- Self-signed certificates or expired certificates will be rejected by the Zayuno Gateway and Certification Runner.

---

## 7. Common HTTP Error Codes & Diagnostics

| HTTP Status | Error Code | Reason & Solution |
| :--- | :--- | :--- |
| **`400 Bad Request`** | `RESERVED_BRAND_PROTECTED` | The brand or slug is reserved for verified enterprise onboarding. Contact `operations@zayuno.uz`. |
| **`400 Bad Request`** | `QUOTE_EXPIRED` | The quote validity window has elapsed. Request a fresh quote before creating an action. |
| **`401 Unauthorized`** | `INVALID_CREDENTIALS` | Check your API key or Bearer token header. Ensure your account is active and email verified. |
| **`403 Forbidden`** | `NOT_PUBLISHED` | The provider has not completed certification or administrator approval. |
| **`409 Conflict`** | `IDEMPOTENCY_CONFLICT` | An action with this idempotency key was already created with different parameters. |
| **`422 Unprocessable`** | `SCHEMA_VALIDATION_FAILED` | Check the error response details for missing required fields (e.g. `customer.phone`, `items`). |
| **`502 Bad Gateway`** | `UPSTREAM_UNREACHABLE` | Zayuno could not connect to your `baseUrl`. Verify firewall, DNS, and server health. |
