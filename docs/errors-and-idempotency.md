# Errors & Idempotency Guidelines

Robust error handling and idempotency prevent duplicate transactions, double payments, and unexpected state inconsistencies.

---

## 1. Standard Error Responses

Zayuno returns standard RFC 7807 problem details:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Quote has expired. Please calculate a new quote before submitting action.",
  "timestamp": "2026-08-17T15:40:00Z"
}
```

### Common Error Codes:
- `400 BAD_REQUEST`: Missing required fields, invalid parameters, or unconfirmed quote.
- `401 UNAUTHORIZED`: Missing or invalid API key / webhook signature.
- `404 NOT_FOUND`: Offering, location, quote, or action not found.
- `409 CONFLICT`: Conflicting state or concurrency collision.
- `410 GONE`: Quote expired (`QuoteExpiredError`).
- `422 UNPROCESSABLE_ENTITY`: Fulfillment unavailable or item out of stock.
- `502 BAD_GATEWAY`: External provider backend timeout or unhandled exception.

---

## 2. Idempotency Implementation

To ensure safe retries over unreliable mobile or conversational networks, every action creation request includes an `idempotencyKey`.

### Provider Responsibilities:
1. Store the incoming `idempotencyKey` alongside the created action record.
2. If a second request arrives with the same `idempotencyKey`:
   - Do **NOT** create a new internal order.
   - Do **NOT** charge the customer a second time.
   - Return the **exact same** action payload originally created.
