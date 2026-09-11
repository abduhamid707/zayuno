# AI agent integration guide

Use this guide when implementing a Zayuno provider adapter with Codex, Claude Code, Cursor or another coding agent. The target is the provider's backend, not the Zayuno consumer app.

## Read in this order

1. [Quickstart](getting-started.md) and [base URL](base-url.md): identify the system you are building.
2. [Capabilities](capabilities.md): select DISCOVERY_READONLY or TRANSACTIONAL and fulfillment mode.
3. [OpenAPI](/openapi.json) and [generated endpoint reference](/docs/contract-reference/): exact request, response, direction and required fields.
4. [Authentication](authentication.md), [quotes](quotes.md), [actions](actions.md), [webhooks](webhooks.md).
5. [Certification](certification.md) and [troubleshooting](troubleshooting-faq.md).

## Machine-readable entry points

| URL | Purpose |
| --- | --- |
| https://partners.zayuno.uz/llms.txt | Compact discovery index |
| https://partners.zayuno.uz/llms-full.txt | All provider docs in one text document |
| https://partners.zayuno.uz/docs/{id}.md | One guide as raw Markdown |
| https://partners.zayuno.uz/docs/search-index.json | Titles, keywords and complete guide text |
| https://partners.zayuno.uz/openapi.json | Provider schemas and example payloads |
| https://partners.zayuno.uz/postman.json | Importable collection |
| https://partners.zayuno.uz/docs/ | Crawlable HTML, no JavaScript required |

These resources are generated in the same build as the portal. AI Kit can also export a framework-specific task and a provider-specific contract summary.

## Contract precedence

Schema and canonical endpoint definitions in packages/contracts/src are the implementation source of truth. The generated OpenAPI and reference are derived from them. Explanatory guides describe workflow; they do not invent fields or loosen validation.

If an example, legacy provider response or AI-generated code conflicts with a schema, identify the mismatch and fix the adapter. Do not silently change the core contract. Optional values should be omitted when unavailable unless the schema explicitly permits null.

## Implementation checklist

1. Read the existing provider backend and its order model before editing.
2. Record the task, files to change, tests and next steps in a local checklist.
3. Map real catalog IDs, prices, variants, modifiers and availability.
4. Implement only declared capabilities plus mandatory fulfillment requirements.
5. Use server environment variables for keys. The provider creates PROVIDER_API_KEY; Zayuno supplies ZAYUNO_WEBHOOK_SECRET. Never paste their values in a prompt.
6. Keep provider endpoints and Zayuno Core endpoints distinct. Status webhooks go from provider to Zayuno.
7. Recompute quote totals server-side. Reject expired quotes and preserve explicit user confirmation before action creation.
8. Persist idempotency across restarts. Retry with the same key returns the existing action.
9. For HMAC, sign the exact raw body. The current protocol does not prepend a timestamp to the signature input.
10. Return a provider-owned checkout URL when required; do not invent payment success.
11. Run local schema and negative tests, then provider certification in an isolated test environment.
12. Report completed vs unverified work, commands and remaining steps. Do not claim production readiness from the demo sandbox.

## Minimum verification matrix

| Scenario | Evidence |
| --- | --- |
| Wrong API key | Rejected request |
| Malformed catalog | Schema identifies invalid field |
| Quantity or option changes | Server-calculated quote matches selection |
| Expired quote | No action created from stale terms |
| Duplicate action create | Same action ID, no double fulfillment |
| Invalid webhook signature | Rejected event |
| Provider timeout | Explicit error, no fake success |
| Payment pending | nextAction and status reflect provider truth |

## Handoff template

~~~text
Goal:
Provider type / fulfillment mode:
Capability profile:
Backend framework:
Contract version:
Completed:
Changed files:
Tests and exact results:
Not verified:
Next action:
~~~

## Ready-to-use Agent Prompts

### Prompt for Claude Code / Cursor / Codex

~~~markdown
You are building the Zayuno Provider Adapter for our backend.

Canonical documentation:
- Full contract: https://partners.zayuno.uz/llms-full.txt
- OpenAPI Schema: https://partners.zayuno.uz/openapi.json
- Base URL & Quickstart: https://partners.zayuno.uz/docs/base-url.md

Your Task:
Expose provider endpoints under our backend prefix (e.g. /zayuno):
1. GET /health: Health check, verifies x-provider-api-key header.
2. GET /catalog: Returns active offerings with categories, variants, and modifiers.
3. POST /quote: Calculates authoritative total, fees, and discounts from our database.
4. POST /actions: Creates a confirmed order with idempotencyKey deduplication.
5. GET /actions/:id: Returns canonical order status.
6. Webhook: Sends signed POST requests with x-zayuno-signature (HMAC-SHA256 over rawBody) when order status updates.

Strict Rules:
- Never guess prices or stock; calculate strictly from database records.
- Protect secrets: read PROVIDER_API_KEY and ZAYUNO_WEBHOOK_SECRET from environment variables.
- Verify each endpoint with cURL before declaring the task done.
~~~

Use **AI Kit → framework → goal** for a concrete task with canonical payloads and, when available, redacted certification errors. This page remains accessible without signing in.
