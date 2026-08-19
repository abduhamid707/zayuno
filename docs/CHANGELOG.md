# Zayuno Contract Changelog

All externally visible API, MCP, provider-dashboard, certification, and
moderation changes must be recorded here.

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

