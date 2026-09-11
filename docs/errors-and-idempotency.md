# Errors & Idempotency

Explicit failures and persistent idempotency prevent duplicate transactions when clients, agents or networks retry.

## Error contract

Use the ErrorResponse schema in [OpenAPI](/openapi.json). Provider and Core errors may have different HTTP wrappers; do not assume a generic NestJS error object is an RFC 7807 problem response.

Return a safe, actionable message and the appropriate code. Do not expose secrets, full customer data or internal stack traces.

## Action idempotency

Every create-action request carries an idempotencyKey.

1. Store the key and associated action durably with a unique database constraint.
2. Make duplicate detection and order creation atomic.
3. A retry with the same key returns the existing action instead of creating or charging again.
4. An incompatible payload for an already used key must not silently mutate the original order.
5. Keep the behavior across process restarts and concurrent requests.

An in-memory map or cache alone is not sufficient for production order idempotency.

## Retry decisions

| Situation | Next step |
| --- | --- |
| Validation failure | Fix the request; do not retry unchanged |
| Invalid authentication | Fix credentials or signature direction |
| Expired quote | Obtain a fresh quote and confirmation |
| Unknown result after timeout | Query status or retry the same idempotency key |
| Temporary upstream failure | Bounded backoff; preserve request identity |
| State conflict | Inspect existing action before another mutation |

HTTP status varies by route and failure. Read the structured code and validation report as well as the status. See [troubleshooting](troubleshooting-faq.md).

## Tests before certification

Send concurrent duplicates, retry after a simulated timeout, restart the backend and resend a key. Verify one provider order exists and the same action ID is returned. Check cancellation and webhook duplicates separately.
