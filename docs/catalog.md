# Catalog & Offerings Specification

The Catalog capability allows AI agents to explore categories, offerings, variant pricing, modifier groups, and real-time inventory availability.

---

## 1. Catalog Schema Overview

A catalog represents the collection of services or goods offered by a provider.

```json
{
  "providerSlug": "acme-logistics",
  "locationId": "loc_tashkent_central",
  "categories": [
    {
      "id": "cat_express",
      "slug": "express-delivery",
      "name": "Express Delivery",
      "description": "Same-day courier dispatch",
      "sortOrder": 1
    }
  ],
  "offerings": [
    {
      "id": "offering_parcel_doc",
      "providerSlug": "acme-logistics",
      "categorySlug": "express-delivery",
      "offeringCode": "DOC_DELIVERY",
      "title": "Document Courier Service",
      "description": "Door-to-door envelope delivery within 2 hours",
      "basePrice": 25000,
      "currency": "UZS",
      "isAvailable": true,
      "optionGroups": [
        {
          "id": "grp_urgency",
          "name": "Delivery Speed",
          "minSelections": 1,
          "maxSelections": 1,
          "options": [
            {
              "id": "opt_standard",
              "name": "Standard (2 hours)",
              "priceDelta": 0,
              "isDefault": true
            },
            {
              "id": "opt_rush",
              "name": "Rush (45 minutes)",
              "priceDelta": 15000,
              "isDefault": false
            }
          ]
        }
      ]
    }
  ],
  "version": "2026.1",
  "updatedAt": "2026-08-17T15:00:00Z"
}
```

---

## 2. Option Groups & Modifiers

- **`minSelections`**: Minimum required selections (e.g. `1` for mandatory choice, `0` for optional add-on).
- **`maxSelections`**: Maximum allowed selections (e.g. `1` for radio-style, `5` for multi-select).
- **`priceDelta`**: Additional cost in provider currency added to `basePrice`.
