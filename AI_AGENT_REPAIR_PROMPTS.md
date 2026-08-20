# Zayuno — implementation review repair prompts

These prompts are the follow-up work identified by an independent review after
Prompts 1–4. Run them in order. Do not deploy, call production services, send
real emails, or change a deployed sandbox. Preserve unrelated working-tree
changes. For every completed item: add regression tests, run the relevant
tests and `pnpm build`, then update `TASKS.md` truthfully.

## REPAIR PROMPT A — P0: never expose verification credentials in logs

The current email verification implementation prints the complete verification
URL and raw 32-byte token through `DevEmailTransport`. This contradicts the
safe-observability work: anyone with development/staging logs can take over an
unverified provider-owner account.

Implement the fix completely:

1. Ensure no application log, error, audit event, exception, response, or test
   output contains a raw email-verification token or a URL with that token.
   Remove the raw-token and full-URL log statements.
2. Keep a development/test transport only when explicitly enabled with a safe
   environment switch. Its log must contain only a non-sensitive correlation
   ID / masked recipient / expiry, never the token. In production, fail closed
   at startup or registration time when no real configured mail transport is
   available; do not silently use `DevEmailTransport`.
3. The dev/test-only token retrieval helper may exist only outside production,
   must not be documented in public Swagger, must be guarded by an explicit
   development/test feature flag, rate-limited, and return no token in any
   other environment. Prefer test injection of an in-memory mail transport
   over an HTTP endpoint that returns a credential.
4. Verification state (token hash, expiry, single-use flag, resend limits)
   must be durable and safe across an API restart. Add a Prisma migration and
   use persisted, hashed tokens or a secure one-time-token table. Never store
   raw verification tokens.
5. Keep the public response enumeration-safe. Avoid logging raw email where
   it is not needed.
6. Add tests proving: raw token/full verification URL never appears in captured
   logs; a dev endpoint is unavailable by default and in production; expired,
   reused, and restart-surviving tokens behave correctly; resend limits survive
   restart; no raw token is persisted.

Do not add a real email vendor, real delivery, deployment, or business-owner
verification in this task.

## REPAIR PROMPT B — P1: make catalog media actually safe and persistent

Review found that `MediaItemSchema` currently accepts `http:` despite the task
and `TASKS.md` saying HTTPS-only; `thumbnailUrl` does not receive the same
credential/protocol validation; legacy `imageUrl` remains unrestricted. Fix
the contract and all consumers.

1. Create one reusable `SafePublicHttpsUrlSchema` / validator used by `url`,
   `thumbnailUrl`, and the legacy `imageUrl` field. It must permit only absolute
   `https:` URLs; reject credentials, `http:`, non-web protocols, whitespace
   tricks, and unsafe/malformed hosts. Do not fetch URLs from validation.
2. Preserve backward compatibility deliberately: document and implement a
   migration boundary for legacy HTTP image data. Existing provider records may
   still be read as legacy data, but newly submitted/updated catalog payloads
   must not introduce HTTP URLs. Do not silently upgrade an HTTP URL to HTTPS.
3. Validate media field limits (bounded number of items, URL/alt text length,
   bounded aspect-ratio format) to prevent payload abuse. Sort/return media in
   deterministic `order` order, with a stable tie-breaker.
4. Make unmet-demand analytics durable. Replace process-local `Map` storage
   with a privacy-safe Prisma-backed aggregate/bucket and migration. Preserve
   the ten-minute deduplication semantics atomically, bounded retention, admin
   filters, aggregation, and PII scrubbing. It must work after restart and in
   more than one API instance.
5. Add migration-safe tests for all rejected URL variants, legacy compatibility,
   deterministic media order, restart persistence, concurrent/deduplicated
   unmet-demand recording, retention, and that PII never reaches the database.

No external image downloading/proxy, deployment, live data migration, or
external-service connection is authorized.

## REPAIR PROMPT C — P1: truthful task state and review-focused regression suite

Bring documentation and tests in line with the actual implementation without
claiming unverified production work.

1. Update `TASKS.md`: mark the public Developer Portal / onboarding items that
   are actually complete as complete; retain only real remaining work. Keep
   deployed Mock EVOS E2E explicitly unchecked. Do not mark a deployed test as
   complete, and do not deploy.
2. Add a single review-oriented test command (or documented command) that runs
   all Prompts 1–4 tests plus the new repair tests from a clean local database.
   It must avoid production/live URLs and must fail on a test failure.
3. Add regression coverage that exercises the HTTP boundary rather than only
   direct service calls for public/protected portal auth, provider log tenant
   isolation, redaction of integration/webhook responses, canonical discovery
   gate, and local Mock EVOS cancellation/payment behavior.
4. Run the suite and `pnpm build`. Report precise commands and results in the
   final handoff; do not say “100%” if a required test is skipped or cached
   without execution.

No deployment, live sandbox test, real payment, provider ownership
verification, or external email sending.
