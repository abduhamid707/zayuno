# Quotes & Pricing Engine

The Quote capability calculates verified real-time pricing before an action is executed. Quotes guarantee price predictability and provide the exact numbers presented to the end user for confirmation.

---

## 1. Why Quotes are Mandatory

Conversational AI agents must never create binding orders or debit funds based on estimated or stale prices. 

Calling `request_quote`:
1. Calculates item subtotals, variant adjustments, and modifier add-ons.
2. Applies dynamic fees (delivery, service, packaging).
3. Applies applicable promo codes or tier discounts.
4. Returns a cryptographically valid `quoteId` with an explicit `expiresAt` timestamp (typically 10–15 minutes).

---

## 2. Requesting a Quote

### Endpoint
`POST /api/v1/quotes`

### Request Payload
```json
{
  "providerSlug": "acme-logistics",
  "locationId": "loc_tashkent_central",
  "fulfillmentType": "EXPRESS",
  "destination": {
    "raw": "Amir Timur Avenue 15, Tashkent"
  },
  "items": [
    {
      "offeringId": "offering_parcel_doc",
      "quantity": 1,
      "selectedOptions": [
        {
          "groupId": "grp_urgency",
          "optionId": "opt_rush",
          "quantity": 1
        }
      ]
    }
  ]
}
```

### Normalized Quote Response
```json
{
  "id": "quote_894103859",
  "providerSlug": "acme-logistics",
  "locationId": "loc_tashkent_central",
  "lines": [
    {
      "offeringId": "offering_parcel_doc",
      "offeringTitle": "Document Courier Service",
      "unitPrice": 25000,
      "quantity": 1,
      "optionsTotal": 15000,
      "lineTotal": 40000,
      "selectedOptions": [
        {
          "groupId": "grp_urgency",
          "optionId": "opt_rush",
          "quantity": 1
        }
      ]
    }
  ],
  "subtotal": 40000,
  "fees": [
    { "name": "Express Handling Fee", "amount": 10000 }
  ],
  "totalFees": 10000,
  "discounts": [],
  "totalDiscount": 0,
  "total": 50000,
  "currency": "UZS",
  "expiresAt": "2026-08-17T16:15:00.000Z",
  "estimatedDurationMinutes": 45
}
```
