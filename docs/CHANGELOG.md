# Zayuno Contract Changelog

All externally visible API, MCP, provider-dashboard, certification, and
moderation changes must be recorded here.

## 2026-09-11 — Provider workspace and canonical developer docs

- Replaced repeated portal navigation and marketing/onboarding blocks with a
  responsive workspace, provider-state-based next steps, and separate
  orders/integration dashboard sections. Loading or failed requests no longer
  appear as zero orders.
- Consolidated portal documentation into the repository Markdown guides.
  Added full-text search, stable heading links, browser Back/Forward,
  clipboard/Markdown export and a framework-specific AI handoff.
- Generate crawlable HTML, Markdown, llms.txt, llms-full.txt, search corpus,
  OpenAPI, Postman, robots and sitemap from the same build. The portal Docker
  image now includes the canonical docs sources.
- Corrected provider/Core endpoint distinctions, API key ownership, HMAC
  header and raw-body rules, capability/location requirements, certification
  versus publishing, and normalized status guidance.
- Updated certification/validation documentation links to partners.zayuno.uz.
  OpenAPI webhook examples now reuse the canonical event with newStatus.
  No runtime authentication or transaction guard was relaxed.

## 2026-08-19

- Added provider-scoped action filters and pagination to
  `GET /api/v1/providers/me/dashboard`.
- Added provider-scoped action detail and timeline endpoint
  `GET /api/v1/providers/me/actions/:actionId`.
- Added structured `reasonCode` categories to action cancellation requests and
  MCP `cancel_action` while keeping the human-readable `reason`.
- Prevented rejected or suspended providers from bypassing moderation by
  editing integration settings and resetting themselves to `DRAFT`.
- Added an explicit admin-only provider reopen operation for correction flows.
- Added unified redacted integration/webhook/action/moderation logs with JSON
  and CSV support exports.
- Clarified one-time provider credentials in the admin UI and added copy and
  sandbox `.env` download controls.
- Exposed provider-reported payment state with an explicit source label.
- Added structured moderation decisions: `REQUEST_CHANGES`, `REJECT`, and
  `SUSPEND`, with partner-visible reasons and actionable required changes.
- Added admin provider filters and paginated `{ data, total, pagination }`
  response.
- Changed admin Swagger and sandbox links to environment-aware URLs; production
  UI no longer intentionally links to localhost.
- Added a documentation-contract test and the rule that public behavior changes
  update docs in the same change set.
- Corrected the generic availability fallback to return the complete documented
  result shape (`availableItems` and echoed safe `parameters`).
- Migrated deployment architecture from local TAR packaging to GitHub Actions +
  GHCR immutable container images with matrix build and changed-service detection.
- Introduced image-based production compose, bounded backoff health checking,
  automatic rollback to previous working commit SHA, and isolated database migrations.
- Implemented comprehensive Technical SEO for zayuno.uz: dynamic robots.txt,
  XML sitemap (/sitemap.xml), canonical URLs, Open Graph / Twitter meta tags,
  and JSON-LD structured data (Organization, WebSite, SoftwareApplication, FAQPage).
- Redesigned public landing page into a high-converting, modern SaaS aesthetic with
  interactive protocol visualizer, 3-step action workflow, and developer sandboxes.

