# Catalog & Offerings

The catalog supplies real categories, products, variants, modifiers, prices and availability to Zayuno. Stable identifiers are essential: the order flow uses IDs, not display names.

## Provider endpoints

- GET /catalog — categories and offerings.
- GET /offerings/:id — one offering by its stable ID.
- GET /search — when SEARCH is declared.
- GET /locations — when declared or required by physical fulfillment.

Use [canonical catalog JSON](/docs/contract-reference/#contract-catalog) and [offering JSON](/docs/contract-reference/#contract-offering). The OpenAPI schema specifies required fields; a short UI card is not a complete API payload.

## Map the real catalog

Map providerId, offeringCode, title, description, categorySlug, categoryTitle, basePrice, currency, isAvailable and declared optional metadata according to the schema.

Do not rename canonical fields to a merchant's internal field names. Keep that translation inside the provider adapter. Missing data should not become a fabricated default price or stock status.

## Variants and modifiers

Variants have their own IDs, labels, prices and availability. Option groups define selectable modifiers; minSelections and maxSelections constrain the choices. priceDelta is used in verified quote calculation, not merely in the product card.

Keep IDs stable across catalog refreshes. Changed or unavailable choices must be checked again by POST /quote.

## Catalog versus quote

Catalog prices help discovery. The quote is the authoritative calculation for the customer's exact selection, destination, fees and discounts. A catalog refresh does not replace quote validation.

Test catalog, single-offering and search results against the same schema and ensure they refer to the same provider and product IDs. See [quotes](quotes.md).
