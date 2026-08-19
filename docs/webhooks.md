# Webhooks & Asynchronous Event Notification

Webhooks allow provider systems to push real-time status transitions, fulfillment updates, and courier milestones back into Zayuno.

---

## 1. Webhook Ingestion Endpoint

- **URL**: `POST https://api.zayuno.uz/api/v1/webhooks`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Required HTTP Headers:
- `x-provider`: Your unique `providerSlug` (e.g. `acme-logistics`).
- `x-signature`: HMAC-SHA256 hex digest of the raw JSON request body computed using your assigned `webhookSecret`.

---

## 2. Webhook Event Payload

```json
{
  "eventId": "evt_9841029481",
  "eventType": "action.status_updated",
  "providerSlug": "acme-logistics",
  "actionId": "act_8849102",
  "externalActionId": "acme_order_9981",
  "newStatus": "CONFIRMED",
  "newPaymentStatus": "PAID",
  "timestamp": "2026-08-17T15:35:00.000Z",
  "description": "Payment confirmed via Payme acquiring. Order sent to dispatch queue.",
  "payload": {
    "paymentReference": "payme_txn_998104"
  }
}
```

---

## 3. Supported Event Types

| Event Type | Description |
| :--- | :--- |
| `action.status_updated` | General status transition (`CONFIRMED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `FAILED`). |
| `action.completed` | Action successfully fulfilled. |
| `action.cancelled` | Action cancelled by merchant or store. |
| `catalog.updated` | Signals Zayuno to invalidate catalog cache. |
| `location.status_changed` | Signals branch closure or temporary outage. |
