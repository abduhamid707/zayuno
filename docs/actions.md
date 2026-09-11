# Actions & Execution Lifecycle

An action is a confirmed real-world operation sent to a provider. For food ordering, it represents the provider order and its fulfillment state.

## Provider endpoints versus Core endpoints

Implement POST /actions and GET /actions/:id on the provider backend. ACTION_CANCEL adds POST /actions/:id/cancel. Core orchestration routes such as POST /api/v1/actions belong to Zayuno.

Use [canonical action request and response](/docs/contract-reference/#contract-actions), [status response](/docs/contract-reference/#contract-action-status), and [OpenAPI](/openapi.json). Do not infer field or enum names from a UI label.

## Preconditions

1. Resolve real catalog IDs, variants, options and quantities.
2. Obtain a server-calculated quote for that selection and fulfillment.
3. Verify the quote is still valid.
4. Obtain explicit customer confirmation of the current price and terms.
5. Create the action with a persistent idempotencyKey.

Changing the selection or expired terms requires a new quote and confirmation. User contact details alone do not mean the user has confirmed a purchase.

## Normalized statuses

Use the NormalizedAction schema's status enum: CREATED, AWAITING_PAYMENT, CONFIRMED, PROCESSING, COMPLETED, CANCELLED and FAILED.

Map the merchant's internal statuses at the adapter boundary. The Core dashboard may display operational statuses such as SUBMITTED or IN_PROGRESS; those are not a replacement for the provider contract enum. The allowed transition depends on the current action and provider operation.

## Payment evidence is separate

Provider dashboards display paymentStatus separately from action status. PAID is labelled **PROVIDER_REPORTED**: it represents the provider integration's status report, not independent proof of bank settlement.

Return the provider-owned checkout via nextAction when needed. See [payment handoff](payment-handoff.md) and [Provider Operations Dashboard and Moderation](provider-operations.md).

## Idempotency and retries

Persist the incoming idempotencyKey with the created order. Concurrent duplicates and retries after a restart must return the existing action instead of creating another order.

On an uncertain timeout, query the existing action or retry the same key. Do not generate a fresh key simply because the first response was lost. [Idempotency guide](errors-and-idempotency.md).

## Cancellation and status updates

When ACTION_CANCEL is supported, use the canonical cancellation route and payload. A stable reasonCode and safe human-readable reason help explain the result.

Provider sends signed status events to Zayuno's webhook endpoint. Polling GET /actions/:id must reflect the same order identity and authoritative state. Cancellation, payment and fulfillment should remain consistent.
