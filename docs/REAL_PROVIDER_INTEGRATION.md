# Real Provider Integration Guide: Onboarding EVOS & Future Providers

This document explains the step-by-step process of integrating **real external fast-food providers (e.g. EVOS Production API)** into the Zayuno Action Infrastructure.

---

## Zero Core Modification Principle

> **Core Principle**: Zayuno core engine, MCP tools, and Public API contracts **never change** when connecting a new provider. All provider-specific communication logic is encapsulated in an isolated **Adapter** implementing the `FoodProviderAdapter` contract.

```
+-------------------------------------------------------------+
|                     Zayuno Core Platform                    |
| (API, Order State Machine, Idempotency, RBAC, NATS, Admin)  |
+-------------------------------------------------------------+
                              |
               FoodProviderAdapter Interface
                              |
     +------------------------+------------------------+
     |                                                 |
[MockEvosAdapter]                             [RealEvosAdapter]
(integrations/mock-evos)                     (integrations/evos)
     |                                                 |
Mock EVOS API (:4001)                         EVOS Production API
```

---

## 11-Step Onboarding Workflow

### Step 1: Obtain Credentials & API Specifications from Partner
Request the following from the EVOS engineering team:
1. Production Base URL (e.g. `https://api.evos.uz/v2`)
2. Partner API Key / Client Secret
3. Webhook Signing Secret (or configure mutual HMAC secret)
4. Sandbox / Staging testing environment URL

---

### Step 2: Create Provider Record in Zayuno Database
Run the provider setup command or configure via Zayuno Admin Portal:
- **Slug**: `evos`
- **Name**: `EVOS Fast Food`
- **Base URL**: `https://api.evos.uz/v2`
- **Status**: `SANDBOX`
- **Credentials**: Automatically encrypted using AES-256-GCM.

---

### Step 3: Implement the EVOS Adapter Class
Create `integrations/evos/src/evos-real-adapter.ts` extending `ZayunoFoodProvider`:

```typescript
import { ZayunoFoodProvider, ProviderConfig } from '@zayuno/provider-sdk';
import {
  NormalizedMenu,
  NormalizedOrderQuote,
  NormalizedProviderOrder,
  CreateOrderInput,
  QuoteOrderInput,
  GetOrderInput,
  NormalizedWebhookEvent,
  OrderStatus
} from '@zayuno/contracts';

export class RealEvosAdapter extends ZayunoFoodProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  // 1. Fetch live catalog and map to Zayuno universal schema
  async getMenu(input: GetMenuInput): Promise<NormalizedMenu> {
    const raw = await this.httpGet('/catalog/products');
    return this.mapToUniversalMenu(raw);
  }

  // 2. Compute quote via EVOS pricing engine
  async quoteOrder(input: QuoteOrderInput): Promise<NormalizedOrderQuote> {
    const quotePayload = this.transformToEvosQuote(input);
    const rawQuote = await this.httpPost('/orders/calculate', quotePayload);
    return this.mapToUniversalQuote(rawQuote);
  }

  // 3. Dispatch confirmed order
  async createOrder(input: CreateOrderInput): Promise<NormalizedProviderOrder> {
    const evosOrderPayload = this.transformToEvosOrder(input);
    const rawOrder = await this.httpPost('/orders/create', evosOrderPayload);
    return this.mapToUniversalOrder(rawOrder);
  }

  // 4. Track live status
  async getOrder(input: GetOrderInput): Promise<NormalizedProviderOrder> {
    const rawOrder = await this.httpGet(`/orders/${input.orderId}`);
    return this.mapToUniversalOrder(rawOrder);
  }

  // 5. Payment options (Cash, Payme checkout URL, Card)
  async getPaymentOptions(input: GetPaymentOptionsInput) {
    const res = await this.httpGet(`/orders/${input.orderId}/payment-urls`);
    return res.data;
  }

  // 6. Webhook verification & parsing
  async parseWebhookEvent(headers: any, rawBody: any): Promise<NormalizedWebhookEvent> {
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    return {
      eventId: payload.id,
      providerSlug: this.providerSlug,
      eventType: this.mapEvosEventType(payload.type),
      providerOrderId: payload.order_id,
      timestamp: new Date().toISOString(),
      rawPayload: payload
    };
  }
}
```

---

### Step 4: Catalog & Menu Mapping
Ensure all EVOS categories (Lavash, Burgers, Sets, Drinks) and modifiers (Extra Cheese, Without Onion, Sauces) are mapped to typed `NormalizedProduct` and `ModifierGroup` objects.

---

### Step 5: Branch & Geolocation Mapping
Map EVOS restaurant branches:
- Latitude / Longitude coordinates
- Delivery polygon / radius (km)
- Working hours

---

### Step 6: Order Transformation
Map universal `CreateOrderInput` items to EVOS specific POS format:
```json
{
  "external_id": "ZY-EVOS-98421",
  "client": { "name": "...", "phone": "+9989..." },
  "address": { "line": "...", "lat": 41.28, "lng": 69.21 },
  "cart": [
    { "sku": "evos_set_x", "quantity": 2 }
  ]
}
```

---

### Step 7: Payment URL Resolution
Ensure provider checkout links for Payme / Click / Card are passed through directly to the AI agent:
- Zayuno **never** stores or handles cardholder details.
- Returns direct `payment_url`.

---

### Step 8: Status Mapping Matrix

| EVOS Internal Status | Zayuno Universal Status |
|:---|:---|
| `NEW` / `PENDING_PAY` | `AWAITING_PAYMENT` |
| `PAID` | `PAID` |
| `ACCEPTED_BY_BRANCH` | `ACCEPTED` |
| `COOKING` | `PREPARING` |
| `READY_FOR_PICKUP` | `READY` |
| `COURIER_ASSIGNED` / `ON_WAY` | `DELIVERING` |
| `DELIVERED` / `CLOSED` | `COMPLETED` |
| `CANCELLED` / `REJECTED` | `CANCELLED` |

---

### Step 9: Webhook Signature Verification
Register webhook endpoint in EVOS developer console:
```text
https://api.zayuno.io/api/v1/webhooks/providers/evos
```
Verify HMAC-SHA256 signature against header `x-zayuno-signature`.

---

### Step 10: Automated Certification Testing
Run the Zayuno Certification Runner:
```bash
pnpm test:certify --provider=evos
```
Validates:
1. `catalog_test`: Menu schema and prices
2. `quote_test`: Accurate pricing & delivery fee
3. `create_order_test`: Live order creation
4. `idempotency_test`: Duplicate prevention
5. `webhook_test`: HMAC verification and status reflection

---

### Step 11: Production Activation
In Zayuno Admin Portal:
1. Switch EVOS status from `SANDBOX` to `ACTIVE`.
2. EVOS catalog and ordering actions immediately become discoverable and accessible to all connected AI agents (ChatGPT, Claude, Gemini).
