# Universal orchestrator refactor — implementation handoff

2026-09-20. **Universal refactor and isolated regression verification completed.** The user asked this agent to perform the regression work. No production deployment, commit or push was performed; APK remains a separate follow-up.

## 1. Previous architecture

ConsumerChatService contained domain-specific food/recruitment/ticket routing, pending-order memory fallbacks and presentation assumptions. Mobile logos branched on provider slugs. Customer name/phone and nonempty action items were globally assumed.

## 2. Removed shared behavior

The old consumer service was replaced with a smaller universal flow. Active code no longer imports FoodConstraints/readFoodBudget or recruitment-description regex extraction. Shared customer presenter no longer detects tickets/trips/trains/provider identity or special-cases coffee-time. Mobile ProviderPickerCard renders declared branding and a generic fallback.

## 3. Universal architecture

Provider discovery → manifest/capability inspection → canonical catalog/search → structured state → schema requirements → quote → explicit confirmation → action/status/payment. SemanticIntentResolver proposes structured data; ConsumerChatService validates selections and dispatches existing services. Action, eligibility, lifecycle and webhook services are retained.

## 4. Conversation state

`packages/contracts/src/conversation.ts`: version/revision, intent, environment, providerSlug, capability, manifest, selectedOffering/variant/options, quantity, parameters, customer, locations, fulfillment, quote, confirmation, action, payment, missingFields and current offerings.

`conversation-store.ts` uses direct Redis commands, a user/conversation-scoped hashed key, token-owned lock and atomic Lua save. Critical state has no memory fallback. Dispatch key is saved before action execution and reused after uncertain results. Existing legacy Redis pending-state keys are **not migrated yet**.

## 5. Slot filling

`conversation-requirements.ts` collects required fields from manifests, capability/fulfillment requirements, offering/catalog schemas, quote requirements and declared location roles. Variants/options derive from canonical offerings. Nested parameter fields are supported. Customer required declarations accumulate. Follow-up modifications invalidate quotes when financial inputs change. Model outputs cannot invent offering or variant IDs.

## 6. Provider manifest

`provider-manifest.ts` adds customerRequirements, per-capability inputMode/required/parametersSchema, fulfillment requirements, supported location roles/payment methods/currencies, branding, presentation hints, lifecycle declarations and non-production certificationInput fixtures. Registration stores declarations in provider metadata; public API/MCP expose allowlisted branding/manifest. Successful certification imports adapter-declared metadata. Capability declarations still require existing eligibility checks.

The final parameter-only certification fixture patch was compiled and exercised by the certification-focused suites. Offering-specific adversarial probes remain excluded for PARAMETERS mode; parameter-specific adversarial coverage is still a follow-up.

## 7. Projection

`CatalogProjectionSchema`, `projectOffering` and `projectCatalog` implement MINIMAL/COMPACT/STANDARD/FULL plus nested select paths, including array traversal. Default is existing full response. API projects at controller boundaries; MCP projects after full canonical data is obtained. Adapter/cache objects remain full and unchanged. MCP legacy aliases remain on default FULL responses.

## 8. Action/quote changes

Customer name and phone are optional in contracts and nullable in persistence; fabricated runtime defaults were removed. Parameter-only actions require declarative input mode. Generic role/address/locationId inputs are passed to adapters and stored on actions. New quotes store canonical input snapshots; actions compare parameters, selections, routes, fulfillment and payment/promotion context against the reviewed snapshot. Quote-declared requirements are retained in the snapshot. Legacy item-based quotes retain their previous checks; parameter-only actions require a bound snapshot.

## 9. Mobile renderer

UniversalRenderer renders OfferingCard, VariantSelector, OptionSelector, FieldInput, DateInput, LocationInput, QuoteSummary, ConfirmationCard, ActionStatusCard and PaymentCard. ProviderPickerCard supplies generic ProviderCard behavior. Fields remain editable through natural language. Field paths/values now survive mobile API serialization. Date/location primitives are text-based inputs, not native pickers/maps. Older interaction types remain supported.

## 10. Migration

`20260920000000_universal_action_inputs`: Action.customerName/customerPhone nullable; adds customerEmail, locations; Quote.requestInput JSONB. All 10 migrations applied successfully to a new isolated PostgreSQL database. No existing customer or production database was migrated. Prisma client was regenerated normally.

## 11. Checks actually performed

- PASS during implementation: test-catalog-projection, test-public-provider-dto, test-mcp-tool-consistency.
- PASS against isolated Redis: test-universal-conversation-state (restart, concurrency lock, tenant/session isolation, fail-closed outage, generic fields/roles).
- PASS: test-universal-orchestrator (Mangu 5 → VIP → quote → quantity 2 → reconstructed service → acceptance → phone → single action → status/cancel), with synthetic services and deterministic interpreter, **not live Gemini/provider execution**.
- PASS: test-action-guardrails; test-consumer-chat-error-mapping with API tsconfig.
- PASS at intermediate/final-pre-handoff snapshots: contracts/shared/API/MCP builds; provider-sdk/API/MCP TypeScript and mobile typecheck.
- `git diff --check` passed before the last certification/schema edits.
- Final focused checks after the last edits: contracts/shared/provider-sdk/API/MCP builds, mobile typecheck, projection, Redis conversation, synthetic orchestrator, action guardrails, controller error mapping, MCP consistency and git diff check all passed.
- Full review runner: **42 / 42 suites passed** with the isolated PostgreSQL database; HTTP boundary and real health/lease E2E passed against that database. Legacy tests that targeted removed private domain methods were migrated to public universal state/manifest/interactions, and presenter/MCP expectations now assert declarative generic output.

## 12. Provider #1001

The focused orchestrator fixture uses the slug provider-1001 without a core branch. This is **not** the requested full adapter/config/manifest/certification onboarding proof. That proof and the seven-domain matrix remain for the next agent.

## 13. Regressions

The final `tests/run-all-review-tests.ts` run passed all 42 suites. The customer presenter test now uses provider-declared presentation hints and generic quote/action wording. The old onboarding and provider-cache tests now exercise the Redis-backed public conversation flow, canonical offerings and manifest requirements rather than removed food/recruitment private methods. The MCP contract test reflects parameter-only `request_quote`/`create_action` inputs. No provider-specific branches were restored.

## 14. Known limitations and next steps

- Chat currently supports one selected offering. Multiple offering selections are explicitly rejected, never silently discarded. Core action API still accepts items[].
- Existing provider manifests need declarative requirements populated and validated against actual adapters. Do not restore provider-specific shared branches.
- Legacy chat-state migration and memory/personalization integration need review; the replaced service does not currently use the injected memory/unmet-demand services.
- Live Gemini semantics, relative dates, context corrections, provider switching, old confirmation cards and full mobile flows need testing. Output prompts are currently primarily Uzbek.
- Parameter-only certification and dynamic quote requirements need focused checks; the seven-provider certification matrix remains unimplemented.
- Quote authority/idempotency/lifecycle protections were retained or extended, but full invariant verification is outstanding. Review uncertain action reconciliation and lock expiry behavior.
- Provider error mapping retains the existing typed mapper. No new provider-specific error branches were added.

## 15. APK and handoff environment

No new APK was built. APK path: **not produced by this task**. Existing app.json versionCode 13 was already user-modified at task start and was preserved. APK/build-device validation remains the next agent's scope.

Test containers are still running: `zayuno-universal-refactor-redis` (127.0.0.1:16379) and `zayuno-universal-refactor-db` (127.0.0.1:15432, database zayuno_universal_test). They are isolated from existing containers/databases. New files are untracked and changes uncommitted; include them deliberately when the next agent finishes. Preserve the user's pre-existing audit document and app.json changes.

Next concrete step, when authorized: inspect this handoff and git diff, rebuild contract/shared dependencies, typecheck the last certification patch, then complete the listed code gaps and regression matrix before APK/release work.
