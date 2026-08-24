# Provider DX feedback implementation

This document maps the two external-provider feedback reports to concrete platform changes.

## Implemented now

- One canonical Provider Contract v1 manifest drives portal documentation, AI Kit exports, OpenAPI, Postman and certification endpoint metadata.
- Runtime responses are validated by the same Zod schemas used by production adapters. Errors include endpoint, JSON path, expected value, received value and a documentation anchor.
- Certification distinguishes root failures from dependency-blocked tests (`FAIL` vs `SKIPPED`) so one catalog/auth error does not look like ten independent bugs.
- Quote response is canonicalized to `id` + `lines`; payment options use a top-level array. Legacy aliases are accepted only at the adapter boundary and are labelled deprecated.
- Optional capabilities remain optional. `PAYMENT_OPTIONS`, `ACTION_CANCEL`, `SEARCH` and `LOCATIONS` are not silently added by onboarding.
- Webhook direction is explicit: providers send signed events to `POST /api/v1/webhooks/:providerSlug`; they do not host a `/webhook` endpoint.
- Portal provides downloadable OpenAPI 3.1 and Postman artifacts generated from the canonical manifest.
- AI Kit output is generated from the same manifest and includes structured certification diagnostics.
- `zy` CLI provides `init`, `doctor`, `test`, `test --local` and `dev --port`. There is deliberately no deploy command because provider hosting ownership has not been defined.
- Express, FastAPI and Go read-only starter projects are shipped with the CLI.

## Explicitly out of scope by product decision

- A second/public MCP server package. Zayuno's existing MCP integration remains unchanged.
- Telegram Bot SDK.

## Roadmap, not represented as completed

- Marketplace, provider analytics, billing/metering, SLA dashboards, advanced retry orchestration and managed hosting/deploy.
- Additional transactional starter templates once their checkout and webhook policies are finalized.

No fake provider counts, testimonials, compatibility claims or completion claims should be added for roadmap items.
