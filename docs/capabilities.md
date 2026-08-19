# Capabilities Specification & Categorization

Zayuno uses a composable capability matrix to determine which operations can be executed against a provider.

---

## 1. Capability Matrix

| Capability Flag | Category | Method in SDK / HTTP Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **`METADATA`** | **MANDATORY** | `GET /provider-info` | Provider details, category, geography, support contact. |
| **`HEALTH`** | **MANDATORY** | `GET /health` | Real-time health status, operational latency. |
| **`CATALOG`** | **MANDATORY** | `GET /catalog`, `GET /offerings/:id` | Structured offerings, categories, option groups, and prices. |
| **`QUOTE`** | **MANDATORY** | `POST /quote` | Verified itemized quotation calculation with expiration. |
| **`ACTION_CREATE`** | **MANDATORY** | `POST /actions` | Action initiation with idempotency & `NextAction` handoff. |
| **`ACTION_STATUS`** | **MANDATORY** | `GET /actions/:id` | Status lookup, fulfillment stages, tracking timeline. |
| **`WEBHOOK`** | **MANDATORY** | `POST /webhooks` | Asynchronous status push updates with HMAC validation. |
| **`LOCATIONS`** | *OPTIONAL* | `GET /locations` | Physical branch facilities, coordinates, service radius. |
| **`SEARCH`** | *OPTIONAL* | `GET /search` | Keyword and semantic search indexing across offerings. |
| **`ACTION_CANCEL`** | *OPTIONAL* | `POST /actions/:id/cancel` | User-initiated cancellation before fulfillment lock. |
| **`PAYMENT_OPTIONS`** | *OPTIONAL* | `GET /actions/:id/payment-options`| Discovery of provider-supported checkout options. |

---

## 2. Mandatory Capabilities Requirement

> [!IMPORTANT]
> To achieve **Production Certification**, a provider MUST implement all 7 mandatory capabilities:
> `METADATA`, `HEALTH`, `CATALOG`, `QUOTE`, `ACTION_CREATE`, `ACTION_STATUS`, and `WEBHOOK`.
>
> The automated certification runner will verify these 7 capabilities. Undeclared optional capabilities will be skipped and will not cause certification failure.

---

## 3. Dynamic Capability Discovery

AI agents query a provider's supported capabilities before invoking specialized tools. If a provider does not support `LOCATIONS`, the AI agent will not prompt the user for physical store branches. If a provider does not support `ACTION_CANCEL`, the AI agent will inform the user that cancellations must go through provider customer support.
