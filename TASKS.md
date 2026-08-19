# Deferred tasks

## Before the next production deploy

- [ ] Fix the Mock EVOS sandbox checkout state machine so a cancelled order can
  never transition to `PAID` or `CONFIRMED`.
  - Reject `simulate-success` after `CANCELLED` (and other terminal states).
  - Reject cancellation after a terminal state.
  - Hide or disable checkout controls that are invalid for the current state.
  - Add regression coverage for `AWAITING_PAYMENT -> CANCELLED` followed by a
    payment attempt; the payment attempt must fail and the action must remain
    `CANCELLED` with `PENDING` payment status.
  - Deploy and run the sandbox E2E test after verification.

> This affects only the Mock EVOS sandbox. No real payment was processed.

## Before opening provider self-service onboarding publicly

- [ ] Prevent provider impersonation and unreviewed publishing.
  - Every new provider must start as `DRAFT` or `SANDBOX`; never as
    `ACTIVE`/discoverable.
  - Require an authenticated provider account and record its ownership of the
    provider record.
  - Verify ownership before review: company-domain email, domain/DNS challenge,
    business documentation, and provider API credential verification as
    applicable.
  - Require an internal/manual approval step before `PUBLISHED`; only approved
    providers may be returned by MCP discovery.
  - Reserve and protect recognised brand names/slugs (for example `evos`) so
    a third party cannot create a deceptive `fake-evos` provider.
  - Add abuse controls: rate limiting, audit trail, report/takedown workflow,
    and alerts for brand-like names.
  - Add tests proving an unverified provider cannot be published or discovered
    through MCP.

> A public registration form alone is not provider verification. This is needed
> to prevent brand impersonation and spam before external onboarding is opened.

## Product initiative: Zayuno Integration Studio

- [ ] Build an assisted provider-integration flow with the product promise:
  **"Integrate your business with AI in 30 minutes."**
  - Let a verified provider submit an API documentation URL or upload an
    OpenAPI specification (JSON/YAML).
  - Fetch and validate the specification safely; keep provider credentials
    private and never execute arbitrary instructions from documentation.
  - Analyse endpoints and propose a Provider Contract mapping, for example:
    - `GET /products` -> `get_catalog`
    - `POST /checkout/calculate` -> `quote_order`
    - `POST /orders` -> `create_action`
    - `GET /orders/{id}` -> `get_action`
    - `POST /orders/{id}/cancel` -> `cancel_action`
  - Generate an editable integration draft: authentication mapping, request and
    response transformations, location/catalog/quote/action endpoints, webhook
    configuration, and provider-owned checkout handoff.
  - Run sandbox certification and contract tests against the provider's test
    environment; show each result and failure clearly.
  - Require the verified provider owner to review and explicitly confirm the
    generated mapping before it can be enabled or submitted for review.
  - Keep the integration in `DRAFT`/`SANDBOX` until certification and platform
    approval succeed; never auto-publish a generated integration.
  - Preserve test logs, mapping revisions, approval history, and rollback
    capability for auditability.

> This is an assisted integration workflow, not permission for Zayuno to
> autonomously create live provider actions or publish a provider.

## Future product ideas: AI-native business discovery + action network

### Product positioning

- [ ] Evolve the long-term positioning from an action-only platform toward:
  **"Zayuno makes businesses discoverable and usable through AI."**
- [ ] Use a three-layer product model:
  1. **Discover** — find businesses, products, services, locations, availability.
  2. **Decide** — filter, compare, recommend, and quote.
  3. **Act** — order, book, pay, and track when the provider supports it.

### Capability-based providers

- [ ] Support two provider modes:
  - **Discovery provider:** structured business/service/product information;
    may only return results and links.
  - **Action provider:** supports transactions such as ordering, booking,
    payment handoff, and status tracking.
- [ ] Make all capabilities independently declared rather than requiring a
  full commerce implementation: `DISCOVERY`, `CATALOG`, `SEARCH`, `QUOTE`,
  `ORDER`, `PAYMENT`, `BOOKING`, `DELIVERY`, `STATUS`.
- [ ] Examples to validate later:
  - Doctor: `DISCOVERY + BOOKING`
  - Florist: `DISCOVERY + CATALOG + ORDER`
  - Shopla seller: `CATALOG + ORDER + PAYMENT + STATUS`
  - Non-transactional business: discovery data plus an external contact/shop
    link only.

### AI-visible business profiles

- [ ] Explore a paid business profile/listing model, potentially around
  **$10/month**, with structured name, categories, services, price range,
  experience, location, delivery coverage, hours, contacts, verification, and
  photos.
- [ ] Validate intent-based search examples such as a nearby experienced doctor
  under a consultation budget, or a flower bouquet under a delivery-inclusive
  budget.
- [ ] Differentiate from a general map listing through structured filtering,
  intent matching, recommendation, and optional action execution.

### Vertical and partnership roadmap (ideas only)

- [ ] Start go-to-market with **food + local commerce**; keep the architecture
  vertical-agnostic.
- [ ] Evaluate **Shopla seller -> Zayuno -> AI client** integration as an early
  second vertical. A seller with order APIs can support actions; otherwise
  Zayuno returns discoverable products and the seller's shop link.
- [ ] Later evaluate discovery-heavy verticals: florists, beauty salons,
  doctors, repair/services, and hotels.
- [ ] Keep merchant analytics as a separate possible product line, **Zayuno for
  Merchants**, rather than mixing it into consumer discovery initially:
  sales, SKU performance, stockout risk, conversion, and returns insights via
  explicitly authorised seller APIs.

> Strategy note: prioritise one narrow, real integration wedge before expanding
> into multiple verticals. These are product hypotheses, not committed scope.

## Future information architecture: public site, developer docs, provider portal

- [ ] Keep the public-facing responsibilities clearly separated as the product
  grows:
  - `zayuno.uz` — public landing, SEO content, product positioning, and public
    discovery entry points.
  - `developers.zayuno.uz` — API documentation, Provider Contract,
    Integration Studio, sandbox, certification, and technical onboarding.
  - `portal.zayuno.uz` or `partners.zayuno.uz` — provider operations: incoming
    actions/orders, catalog, locations, analytics, team access, billing, and
    operational settings.
- [ ] Until provider volume and roles justify a dedicated operations subdomain,
  keep this as a clearly named **Provider Portal** area inside
  `developers.zayuno.uz`, with navigation such as Overview, Integrate,
  Operations, Analytics, and Settings.
- [ ] When separating the portal, preserve existing documentation URLs and add
  redirects/navigation so technical integrators and business operators have a
  clear path without breaking links.

## Future product idea: visual catalog discovery and rich client UI

- [ ] Extend the normalized catalog contract to support provider-supplied product
  media: HTTPS image URLs, alt text, ordering, thumbnails, optional aspect
  ratio, and safe fallback imagery.
- [ ] Validate, proxy or safely render external media as appropriate; prevent
  unsafe URLs, broken images, excessive payloads, and misleading product media.
- [ ] Keep MCP responses universally usable: structured product data plus
  text/table/image-link fallback for clients that do not support custom UI.
- [ ] Build an optional Zayuno rich shopping/discovery UI for supported clients
  and the web experience:
  - responsive product cards and image galleries/carousels;
  - mobile-first grids and horizontal scrolling where appropriate;
  - search, category, budget, location and availability filters;
  - product detail, variants/add-ons, comparison, and quote handoff;
  - accessible loading, empty, error, and image-fallback states.
- [ ] Preserve a clear separation: MCP remains the universal data/action layer;
  the rich client UI is an optional presentation layer and must not be required
  to complete an action safely.
