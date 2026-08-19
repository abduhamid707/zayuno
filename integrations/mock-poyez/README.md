# Poyez Sandbox Provider

Fictional railway-ticketing provider used to exercise Zayuno's dynamic inventory, quote, action, secure handoff, payment, cancellation, and webhook flows.

It is **not affiliated with O‘zbekiston Temir Yo‘llari** and must never accept real passport, identity-document, or bank-card data.

## Production identity

- Public base URL: `https://poyez-sandbox.shopla.uz`
- Provider slug: `poyez-sandbox`
- Provider type: `TICKETING`
- Category: `railway_tickets`
- Geography: `UZ`
- Shared secret env: `POYEZ_SANDBOX_SHARED_SECRET`

Use the same generated sandbox secret for the provider API key and Zayuno webhook HMAC secret. The provider must initially be created through the Zayuno admin onboarding form as `DRAFT`; do not seed it directly into the database.

## Capabilities and endpoints

- `METADATA`: `GET /provider-info`
- `HEALTH`: `GET /health`
- `LOCATIONS`: `GET /locations` and `GET /stations`
- `CATALOG`: `GET /catalog`, `GET /offerings/:id`
- `SEARCH`: `GET /search?q=&context={...}`
- live inventory: `POST /availability`, `GET /trips/:id/cars`, `GET /trips/:tripId/cars/:carId/seats`
- `QUOTE`: `POST /quote`
- `ACTION_CREATE`: `POST /actions`
- `ACTION_STATUS`: `GET /actions/:id`
- `ACTION_CANCEL`: `POST /actions/:id/cancel`
- `PAYMENT_OPTIONS`: `GET /actions/:id/payment-options`
- secure sandbox handoff: `GET /pay/:id`
- `WEBHOOK`: signed outbound status notifications to Zayuno

All provider-contract endpoints except `/health` and `/pay/*` require `x-provider-api-key`.

## Structured search example

```json
{
  "providerSlug": "poyez-sandbox",
  "query": "",
  "parameters": {
    "origin": "Toshkent Janubiy",
    "destination": "Guliston",
    "departureDate": "2026-08-20",
    "passengers": { "adults": 1, "children": 0, "infants": 0 },
    "preferences": { "carClass": "KUPE", "seatLevel": "LOWER", "departurePeriod": "EVENING" }
  }
}
```

Search and availability never reserve seats. `request_quote` is read-only and expires after two minutes. Only a confirmed `create_action` places a ten-minute seat hold and returns a provider-owned secure handoff URL.
