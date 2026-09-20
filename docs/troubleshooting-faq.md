# Troubleshooting & FAQ

Start with the request direction, provider slug, HTTP status, trace ID and validation field path. Open the [Inspector](/?tab=inspector) for provider requests. Do not paste unredacted headers into a support ticket.

## 401: credentials and HMAC

| Request | Expected credential |
| --- | --- |
| Zayuno → provider, API_KEY mode | x-provider-api-key |
| Zayuno → provider, BEARER_TOKEN mode | Authorization: Bearer |
| Zayuno → provider, HMAC_SIGNATURE mode | x-zayuno-signature over rawBody |
| Provider → Zayuno webhook | x-zayuno-signature with ZAYUNO_WEBHOOK_SECRET |
| Portal → Zayuno Core | Account access token |

A provider API key is not a webhook signing secret. Confirm the portal's authMethod matches the backend. After secret rotation update both sides.

For rawBody verification, use exactly the bytes sent over HTTP; parsing and reserializing JSON can change whitespace and field order. Current signing does not prepend a timestamp. See [authentication](authentication.md) for a signing example.

## CORS & Preflight

Zayuno's normal provider API calls are server-to-server. CORS does not authorize those calls and is not a replacement for API authentication.

If your own browser-based development tool calls your backend, allow only its actual origin and required headers. The provider portal origin is https://partners.zayuno.uz. Handle OPTIONS if your tool uses preflight. Do not move production provider secrets into browser code to solve a CORS error.

## 404 or HTML instead of JSON

Check the configured base URL. For https://YOUR_HOST/zayuno, health resolves to https://YOUR_HOST/zayuno/health.

- Do not use the portal's frontend URL.
- Do not append /health to the base URL.
- Do not implement Core /api/v1/quotes where the provider expects POST /quote.
- Check reverse proxy prefixes and trailing slashes.

[Base URL guide](base-url.md) includes Express and FastAPI starting points.

## Latency & Timeout

Verify the backend is reachable from the hosted service, not only from your laptop. localhost and private IP addresses are not reachable provider hosts for hosted Zayuno. Use a public HTTPS test endpoint.

Inspect provider logs for slow database queries, downstream API delays and retries. A timeout after action creation has an unknown result; retry with the same idempotencyKey or query status, not a new key.

Do not return fake HEALTHY or successful actions to hide a timeout.

## Quote Math Validation

Calculate prices on the provider server from real catalog and selected variants/options.

~~~text
subtotal = sum(lines[].lineTotal)
total = subtotal + totalFees - totalDiscount
~~~

Return canonical id and lines, currency and expiresAt. Do not use only quoteId or items in new normalized responses. Quantity, option counts and decimal handling must match the contract. Do not recalculate totals in the client to disguise mismatched provider data.

When a quote expires or selections change, request a new quote and get confirmation for its terms before creating an action. [Quote reference](/docs/contract-reference/#contract-quote).

## Capability or location failure

READONLY requires METADATA, HEALTH, CATALOG. Transactional integrations additionally require QUOTE, ACTION_CREATE, ACTION_STATUS, WEBHOOK.

Physical fulfillment (DELIVERY, PICKUP, ONSITE, HYBRID) requires active locations. Removing LOCATIONS from declared capabilities does not remove this requirement. See [capability profiles](capabilities.md).

## Common diagnostic codes

| Code / signal | Next step |
| --- | --- |
| UNAUTHORIZED / 401 | Match auth method, credential and signature direction |
| NOT_FOUND / 404 | Check base URL, endpoint and real resource ID |
| QUOTE_MATH_INVALID | Reconcile lines, fees, discounts and total |
| Quote expired / state conflict | Get a fresh quote or inspect existing action before retry |
| RESERVED_BRAND_PROTECTED | Use the authorized business identity; contact operations for an existing protected brand |
| CHANGES_REQUESTED | Read review notes and requiredChanges in the dashboard |
| Schema field path | Compare that field with generated OpenAPI; do not rename guessed fields |
| Timeout / upstream failure | Check public reachability, server logs and downstream dependencies |

HTTP mappings depend on the route and failure; use the returned code and report instead of assuming every failure has one fixed status.

## Certification v2 (Strict) xatolari va yechimlari

### 1. `Provider manifest must explicitly declare manifest.certification.safeTestEnvironment = true`
- **Sababi:** Provider o‘z backendida test harakatlarini xavfsiz qabul qila olishini tasdiqlamagan.
- **Yechim:** `GET /provider-info` javobidagi `manifest` obyektiga `"certification": { "safeTestEnvironment": true }` maydonini qo‘shing.

### 2. `Provider rejected with disallowed error code (e.g. QUOTE_EXPIRED, QUOTE_NOT_FOUND, ACTION_NOT_CONFIRMED)`
- **Sababi:** Test majburiy maydon yo‘qligini (masalan, `customer.phone`) tekshirayotganda, backend kutilgan validatsiya xatosi o‘rniga quote muddati o‘tgani yoki action tasdiqlanmaganini bahona qilib rad etdi.
- **Yechim:** So‘rov body’si parametrlarini tekshirishni (input validation) quote expiry yoki boshqa biznes mantiqlaridan oldin bajaring. Majburiy maydon bo‘lmasa HTTP 400 yoki 422 bilan `VALIDATION_ERROR` qaytaring.

### 3. `No verified action status webhook was received for the current certification action`
- **Sababi:** `action-create` testi muvaffaqiyatli buyurtma yaratgandan so‘ng, provider backend Zayunoga buyurtma holati yangilanganligi haqida imzolangan webhook yubormadi yoki webhook yetib bormadi.
- **Yechim:**
  - Action yaratilgach, backenddan `POST https://api.zayuno.uz/api/v1/webhooks/{providerSlug}` ga so‘rov yuboring.
  - Headerda `x-zayuno-signature` (portal bergan `webhookSecret` bilan hisoblangan HMAC-SHA256 hex digest) bo‘lishi shart.
  - Payload formati: `{ "eventId": "evt-123", "eventType": "action.status_updated", "providerSlug": "{providerSlug}", "actionId": "{actionId}", "newStatus": "CONFIRMED", "timestamp": "..." }`.

### 4. `Webhook signature valid but isProcessed: false`
- **Sababi:** Webhook Zayunoga yetib borgan va imzosi to‘g‘ri, ammo bazadagi action statusi yangilanmagan (masalan, `actionId` noto‘g‘ri yoki mavjud bo‘lmagan status ko‘rsatilgan).
- **Yechim:** Webhook payloadidagi `actionId` Zayuno `POST /actions` so‘rovida olgan `id` bilan bir xil ekanligiga va `newStatus` `CONFIRMED` kabi standart ActionStatus qiymati ekanligiga ishonch hosil qiling.

### 5. `QAYTA SERTIFIKATLASH TALAB ETILADI (ESKI HISOBOT)`
- **Sababi:** Mavjud sertifikat v1 yoki STANDARD diagnostika rejimida olingan bo‘lib, Strict v2 talablariga javob bermaydi.
- **Yechim:** Portalda 3-bosqichga (Sertifikatlash) o‘ting va "Qayta sertifikatlash" tugmasini bosing. STRICT rejimida muvaffaqiyatli o‘tgach, "Ko‘rib chiqishga topshirish" tugmasi faollashadi.

## Sandbox works but certification fails

The portal sandbox uses a sample provider. It proves the example flow works, not that your backend implements the contract.

Certification runs your configured adapter. Check providerSlug, base URL, capabilities and test data. It may create a test action for transactional integrations. A passing certification is still separate from approval and ACTIVE status.

## What should an AI agent receive?

Give the agent the [canonical workflow](ai-agents.md), contract version, framework, capability profile and redacted failure. AI Kit can include the certification context. Ask it to report changed files, tests, remaining work and the exact next step.
