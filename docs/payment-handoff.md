# Payment Handoff & NextAction

**Zayuno does not process card payments in this contract.** The provider owns checkout, acquiring, receipts and payment verification.

## Action response

When payment is required, return the appropriate normalized action status and nextAction with a provider-owned checkout URL. Use [canonical action response](/docs/contract-reference/#contract-actions) and [OpenAPI](/openapi.json) for the complete NextAction schema.

Do not assume every NextAction type requires the same fields. Do not manufacture a payment URL or mark an action paid before the provider has verified it.

## Customer flow

1. Customer confirms the quote.
2. Zayuno creates the action with a stable idempotency key.
3. Provider returns the actual status and nextAction.
4. Customer opens the provider checkout and completes payment there.
5. Provider verifies payment and sends a signed status webhook to Zayuno.
6. Zayuno displays the resulting action and payment status.

A click on the checkout link is not proof of payment.

## Payment status evidence

Dashboard paymentStatus is labelled PROVIDER_REPORTED. It reflects the provider integration's report, not a separate guarantee of bank settlement. Action fulfillment and payment status are separate concepts.

If checkout expires, show the actual provider state and supported next step. Do not create a second order just to generate another payment link without checking the existing action.

## Optional payment options

When PAYMENT_OPTIONS is declared, implement GET /actions/:id/payment-options and return the canonical **top-level array**. See [payment-options reference](/docs/contract-reference/#contract-payment-options) and [webhooks](webhooks.md).
