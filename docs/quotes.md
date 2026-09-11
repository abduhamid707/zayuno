# Quotes & Pricing

A quote is the provider's verified price for a specific selection. The AI must not invent prices, fees or availability. A quote ID is an identifier; the contract does not require it to be a cryptographic token.

## Endpoint and source of truth

**Implement POST /quote on your provider backend.** Zayuno Core's POST /api/v1/quotes is a different endpoint that orchestrates provider requests.

Use the [generated request and response](/docs/contract-reference/#contract-quote) and [OpenAPI](/openapi.json). Examples are derived from the contract rather than maintained separately in this guide.

## Calculation

1. Resolve real offering IDs, variant IDs and selectedOptions.
2. Check availability, quantity and option selection limits.
3. Compute line totals, delivery/service fees and validated discounts.
4. Return canonical id, lines, subtotal, totalFees, totalDiscount, total, currency and expiresAt.
5. Bind the quote to the selection and fulfillment terms so it cannot authorize a different order.

~~~text
subtotal = sum(lines[].lineTotal)
total = subtotal + totalFees - totalDiscount
~~~

Use the contract's line price semantics. In particular, do not count an option price once in the line and again in fees.

## Expiry and confirmation

Provider controls expiresAt. Do not copy an old example date or assume all providers use the same validity duration.

If a quote expires, or items, quantities, options or destination change, obtain a fresh quote. Show its total and terms to the customer and obtain explicit confirmation before an action.

## Promo codes and unavailable items

Validate a promo code against provider data. Return its actual effect in discounts and total; do not promise a discount from an AI guess.

If a requested item or variant is unavailable, return a clear error or supported alternative. Never silently replace the item in a confirmed quote.

## Verification

Test quantity changes, modifiers, zero/invalid quantities, unavailable stock, invalid discount, expired quote and mismatched totals. See [troubleshooting](troubleshooting-faq.md) and [actions](actions.md).
