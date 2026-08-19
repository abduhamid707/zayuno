# Provider Operations Dashboard and Moderation

This document is part of the public Zayuno provider contract. Any externally
visible change to provider onboarding, action visibility, payment reporting,
moderation, or lifecycle rules must update this document and the changelog in
the same change set.

## Provider-scoped action dashboard

Authenticated provider owners, developers, and analysts can use:

```http
GET /api/v1/providers/me/dashboard
Authorization: Bearer <provider-dashboard-jwt>
```

Supported filters:

| Parameter | Meaning |
| --- | --- |
| `query` | Action ID, external action ID, customer name, or phone |
| `status` | Normalized action status |
| `paymentStatus` | `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, or `REFUNDED` |
| `from`, `to` | ISO date or timestamp range |
| `minTotal`, `maxTotal` | Non-negative action total range |
| `sort` | `newest`, `oldest`, `total_asc`, or `total_desc` |
| `limit`, `offset` | Pagination; limit is capped at 100 |

The response includes global provider metrics, filtered action summaries, and
pagination. The API always derives the provider ID from the authenticated
account. A provider ID supplied by the browser is never trusted.

```json
{
  "metrics": {
    "totalActions": 32,
    "pendingActions": 4,
    "paidActions": 19,
    "completedActions": 17,
    "failedActions": 2
  },
  "actions": [
    {
      "publicId": "ZY-EXAMPLE-10001",
      "status": "IN_PROGRESS",
      "paymentStatus": "PAID",
      "paymentStatusSource": "PROVIDER_REPORTED",
      "total": 155000,
      "currency": "UZS",
      "customerName": "Example Customer",
      "customerPhoneMasked": "+99890***567"
    }
  ],
  "pagination": { "total": 1, "limit": 50, "offset": 0, "hasMore": false }
}
```

`PAID` means the provider integration reported that payment state. It does not
prove bank settlement unless the provider's payment integration explicitly
supplies settlement data.

## Provider-scoped action detail

```http
GET /api/v1/providers/me/actions/:actionId
Authorization: Bearer <provider-dashboard-jwt>
```

The endpoint accepts a Zayuno public ID, internal action ID, or provider
external action ID. It returns the item lines, normalized action and payment
status, provider-reported payment source, customer fulfillment details,
cancellation/failure explanation, and chronological timeline. It returns 404
for actions belonging to another provider.

## Cancellation and failure reasons

Provider adapters should send a concise, user-safe explanation for terminal
events. Prefer a stable machine-readable reason code in the event payload and
a clear human description. Suggested codes include:

- `CUSTOMER_CANCELLED`
- `PROVIDER_REJECTED`
- `ITEM_UNAVAILABLE`
- `PAYMENT_TIMEOUT`
- `PAYMENT_FAILED`
- `DUPLICATE_ACTION`
- `INVALID_CUSTOMER_INFORMATION`
- `PROVIDER_TIMEOUT`
- `SYSTEM_ERROR`
- `OTHER`

Do not place secrets, card data, passwords, OTP values, or unnecessary identity
documents in a reason or timeline description.

## Moderation lifecycle

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> ACTIVE
                     |-> CHANGES_REQUESTED -> DRAFT -> PENDING_APPROVAL
                     |-> REJECTED
ACTIVE --------------------------------------> SUSPENDED
```

Every non-approval decision requires:

- `reasonCode`: stable category;
- `reason`: partner-visible explanation (minimum 12 characters);
- `requiredChanges`: actionable checklist when applicable;
- `internalNote`: optional operations-only note.

Partner-visible reasons are returned in provider metadata. Review history and
internal notes are kept only for operations and must never be exposed by public
discovery endpoints. Resubmitting an integration clears the current visible
reason while preserving the audit history.

`CHANGES_REQUESTED` applications may update their integration and resubmit.
`REJECTED` or `SUSPENDED` applications cannot reset themselves to `DRAFT` by
editing the base URL; Operations must explicitly reopen them.

```http
POST /api/v1/admin/providers/:slug/reopen
Authorization: Bearer <admin-jwt>
```

## Operations provider filters

The admin endpoint supports filtering by query, provider status, review status,
provider type, capability, category, geography, certification state, owner
email, and registration date range:

```http
GET /api/v1/admin/providers?reviewStatus=PENDING_APPROVAL&certified=true
Authorization: Bearer <admin-jwt>
```

The response is `{ data, total, pagination }`.

## Documentation rule

The following changes require documentation and changelog updates in the same
pull request or release bundle:

- public API request or response changes;
- MCP tool or capability changes;
- provider onboarding and certification changes;
- action, payment, cancellation, or moderation lifecycle changes;
- dashboard workflows that providers depend on.

Run `pnpm test:docs-contract` before release. Internal refactors that do not
change observable behavior do not require a public contract update.
