# Operations Logs and Support Export

Zayuno Operations provides one redacted event stream for integration calls,
provider webhooks, action timelines, and provider moderation decisions.

## Query events

```http
GET /api/v1/admin/logs/events
Authorization: Bearer <admin-jwt>
```

Filters: `source`, `provider`, `actionId`, `query`, `from`, `to`, and `limit`.
Sources are `INTEGRATION`, `WEBHOOK`, `ACTION`, and `MODERATION`.

The response includes event time, severity, type, provider, action/trace IDs,
status, duration, a human message, and redacted details. It is an operations
trace, not a copy of a user's complete ChatGPT conversation.

## Export

```http
GET /api/v1/admin/logs/export?format=json
GET /api/v1/admin/logs/export?format=csv
Authorization: Bearer <admin-jwt>
```

Exports use the same filters, set `Content-Disposition: attachment`, disable
caching, and are capped at 500 events per request. JSON is intended for support
analysis; CSV is intended for spreadsheet review.

## Redaction boundary

The export recursively masks fields whose names indicate passwords, secrets,
tokens, authorization headers, cookies, API keys, payment-card data, CVV, OTP,
PIN, passports, identity documents, customer/contact fields, or precise
locations. Common email, phone, bearer-token, and Zayuno credential patterns in
free text are scrubbed as well. Large values and deeply nested payloads
are truncated. Applications must still avoid writing sensitive values to logs
in the first place; redaction is a second line of defence.

PostHog is not part of this implementation. Operational/audit data remains in
Zayuno's own data stores.

## Deployment Observability & Release State

Production host (`158.220.100.58`) tracks deployment release state under `/root/zayuno`:
- `.current_release_sha`: The active Git commit SHA currently serving traffic.
- `.previous_release_sha`: The previous known-good Git commit SHA used for automatic rollbacks.
- Deploy lock (`/tmp/zayuno-deploy.lock`): Prevents overlapping deployments via `flock`.
- Health checks: Multi-attempt exponential backoff verifying internal container ports and public HTTPS reverse-proxy domains.

