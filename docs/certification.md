# Provider Certification Engine

The **Provider Certification Runner** is an automated compliance verification engine that tests a provider integration against the Zayuno Provider Contract v1.

---

## 1. Automated Test Suite

When certification is triggered from the Developer Dashboard (`POST /api/v1/providers/:slug/certify`), the engine executes the following checks:

1. **Provider Metadata Verification**:
   - Validates non-empty slug, name, category, and declared capabilities list.
2. **Health Check Protocol**:
   - Asserts health endpoint returns `HEALTHY` and measures round-trip latency.
3. **Locations & Facilities Query** *(if declared)*:
   - Verifies active branches, addresses, and coordinates format.
4. **Catalog Structure & Offerings**:
   - Asserts catalog categories, offerings list, base pricing, and individual offering retrieval.
5. **Catalog Search Indexing** *(if declared)*:
   - Tests keyword search query response formats.
6. **Verified Quote Pricing**:
   - Calculates a live multi-item quote, validating positive subtotals, itemized lines, and fee calculations.
7. **Action Creation & Payment Handoff**:
   - Creates a test action and validates that `status: "AWAITING_PAYMENT"` contains a valid `nextAction` of type `OPEN_URL`.
8. **Action Idempotency Protection**:
   - Submits a duplicate creation with the same `idempotencyKey` and verifies that the exact same action ID is returned.
9. **Action Status Lookup**:
   - Queries action status and verifies audit timeline structure.
10. **Action Cancellation Lifecycle** *(if declared)*:
    - Tests cancellation transition.
11. **Webhook HMAC Verification & Event Parsing**:
    - Generates a valid HMAC-SHA256 signature and tests ingestion.
    - Generates a forged signature and asserts that the provider/system rejects it.

---

## 2. Capability-Gated Testing

The certification runner tests **only** capabilities declared by the provider. It will never fail certification for an undeclared optional capability (such as `LOCATIONS` or `SEARCH`).

However, to be marked **Production Ready**, all 7 mandatory capabilities must be implemented and pass.
