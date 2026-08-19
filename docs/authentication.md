# Provider Authentication & Security

Security and mutual authentication between Zayuno and external provider systems ensure that all requests, quotes, actions, and status updates are verified and tamper-proof.

## One-time provider credentials

When Operations creates a provider application, the UI shows two values once:

- `PROVIDER_API_KEY`: placed on the provider server and expected in
  `x-provider-api-key` on Zayuno-to-provider requests;
- `ZAYUNO_WEBHOOK_SECRET`: shared HMAC secret used by the provider to sign
  provider-to-Zayuno webhook bodies.

Closing the credential banner or refreshing the page does not delete the
provider. It only removes the plaintext credential display. The banner offers
copy controls and a local `.env` download for sandbox setup. Full secret values
are not retrieved again from the dashboard.

---

## 1. Authentication Methods

Providers configure how Zayuno authenticates against their APIs during registration:

### Option A: Header API Key (`API_KEY`)
Zayuno sends a secret key in a designated HTTP header on every outbound request:
```http
POST /api/actions HTTP/1.1
Host: api.provider.example
x-provider-api-key: zy_live_prov_secret_847192
Content-Type: application/json
```

### Option B: Bearer Token (`BEARER_TOKEN`)
Zayuno passes a static or rotating Bearer token in the standard `Authorization` header:
```http
Authorization: Bearer <TOKEN>
```

### Option C: HMAC Request Signing (`HMAC_SIGNATURE`)
For high-security enterprise integrations, Zayuno signs outbound HTTP payloads with SHA-256 HMAC:
- `x-zayuno-timestamp`: Unix timestamp (milliseconds)
- `x-zayuno-signature`: `HMAC_SHA256(timestamp + "." + rawBody, providerSharedSecret)`

---

## 2. Encryption at Rest

All provider API keys, client secrets, and webhook secrets stored in Zayuno are encrypted using **AES-256-GCM** with authenticated encryption tags. Decryption keys are stored strictly in environment variables and never logged or exposed via public APIs.

---

## 3. Webhook Authentication

When a provider pushes status updates to Zayuno (`POST https://api.zayuno.uz/api/v1/webhooks`), the provider must compute an HMAC-SHA256 signature using their assigned `webhookSecret`:

```typescript
import crypto from 'crypto';

const payloadString = JSON.stringify(webhookPayload);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payloadString)
  .digest('hex');

// In outbound webhook HTTP request:
// Header: x-signature: <signature>
// Header: x-provider: <providerSlug>
```

Zayuno rejects any webhook with an invalid or missing signature with `HTTP 401 Unauthorized`.
