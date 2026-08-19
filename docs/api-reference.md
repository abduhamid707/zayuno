# Zayuno Core API Reference

Base URL: `https://api.zayuno.uz/api/v1`

---

## Provider Discovery & Management

### `GET /providers/find`
Discover and filter registered capability providers.
- **Query Parameters**:
  - `category` *(optional)*: Filter by category (e.g. `food_delivery`, `logistics`, `general_services`).
  - `capability` *(optional)*: Filter by capability flag (e.g. `ACTION_CREATE`, `LOCATIONS`).
  - `geography` *(optional)*: Filter by country/region coverage (`UZ`, `Tashkent`).
  - `query` *(optional)*: Search keyword.
  - `limit` *(optional)*: Default 20.
  - `offset` *(optional)*: Default 0.

### `POST /providers/register`
Self-serve provider application registration.
- **Request Body**:
  ```json
  {
    "name": "Acme Logistics",
    "slug": "acme-logistics",
    "type": "DELIVERY",
    "category": "logistics",
    "geography": ["UZ", "Tashkent"],
    "baseUrl": "https://api.acme.example",
    "authMethod": "API_KEY",
    "capabilities": ["METADATA", "HEALTH", "CATALOG", "QUOTE", "ACTION_CREATE", "ACTION_STATUS", "WEBHOOK"]
  }
  ```

### `POST /providers/:slug/certify`
Execute automated capability certification suite.

### `POST /providers/:slug/submit-review`
Submit certified integration for platform review.

### `GET /providers/me/dashboard`
Return provider-scoped metrics and filtered action summaries. Supports
`query`, `status`, `paymentStatus`, `from`, `to`, `minTotal`, `maxTotal`,
`sort`, `limit`, and `offset`. The provider scope always comes from the JWT.

### `GET /providers/me/actions/:actionId`
Return one action owned by the authenticated provider, including item lines,
provider-reported payment status, cancellation reason, and timeline.

See [Provider Operations Dashboard and Moderation](./provider-operations.md).

### `GET /admin/providers`
Admin-only provider list with filters for provider/review status, type,
capability, category, geography, certification, owner email, and date range.
Returns `{ data, total, pagination }`.

### `POST /admin/providers/:slug/review`
Admin-only structured moderation decision. Accepts `REQUEST_CHANGES`, `REJECT`,
or `SUSPEND` plus `reasonCode`, partner-visible `reason`, optional
`requiredChanges`, and optional operations-only `internalNote`.

### `POST /admin/providers/:slug/reopen`
Admin-only operation that reopens a `REJECTED` or `SUSPENDED` application as
`DRAFT`, invalidates its prior certification, and allows corrections.

### `GET /admin/logs/events`
Admin-only redacted operational event stream. See
[Operations Logs and Support Export](./operations-observability.md).

### `GET /admin/logs/export`
Download the filtered redacted event stream as `json` or `csv`.

---

## Quotes & Actions

### `POST /quotes`
Calculate a verified real-time quotation.

### `POST /actions`
Create an action with idempotency. Requires `userConfirmed: true`.

### `GET /actions/:id`
Retrieve live status and fulfillment timeline.

### `POST /actions/:id/cancel`
Cancel an active action.

### `POST /webhooks`
Ingest provider status transition events with HMAC-SHA256 signature verification.
