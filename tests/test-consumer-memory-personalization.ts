import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const schema = read("packages/database/prisma/schema.prisma");
const migration = read(
  "packages/database/prisma/migrations/20260909010000_consumer_memory/migration.sql",
);
const demandMigration = read(
  "packages/database/prisma/migrations/20260909020000_unmet_demand_requesters/migration.sql",
);
const memory = read(
  "apps/api/src/modules/consumer/memory/consumer-memory.service.ts",
);
const controller = read(
  "apps/api/src/modules/consumer/memory/consumer-memory.controller.ts",
);
const history = read(
  "apps/api/src/modules/consumer/history/consumer-history.service.ts",
);
const chat = read(
  "apps/api/src/modules/consumer/chat/consumer-chat.service.ts",
);
const mobile = read("apps/mobile/src/components/MemorySheet.tsx");
const home = read("apps/mobile/app/(app)/index.tsx");
const privacy = read(
  "apps/api/src/modules/public-pages/public-pages.controller.ts",
);
const unmetDemand = read(
  "apps/api/src/modules/analytics/unmet-demand.service.ts",
);
const productAnalytics = read(
  "apps/api/src/modules/analytics/product-analytics.service.ts",
);
const mobileAnalytics = read("apps/mobile/src/lib/analytics.ts");
const adminAnalytics = read("apps/admin/src/lib/analytics.ts");
const providerAnalytics = read("apps/provider-portal/src/lib/analytics.ts");
const dataSafety = read("apps/mobile/play-store/data-safety-draft.md");
const admin = read("apps/admin/src/App.tsx");

assert.match(
  schema,
  /model ConsumerMemoryProfile[\s\S]*enabled\s+Boolean\s+@default\(false\)/,
);
assert.match(
  schema,
  /model ConsumerMemorySignal[\s\S]*confidence\s+Float[\s\S]*evidenceMessageIds\s+String\[\][\s\S]*expiresAt/,
);
assert.match(
  schema,
  /model ConsumerMemoryJob[\s\S]*status[\s\S]*attempts[\s\S]*runAfter/,
);
assert.match(schema, /model ConsumerSuggestionEvent/);
assert.match(
  schema,
  /model UnmetDemandRequester[\s\S]*userId[\s\S]*intentKey[\s\S]*notifyWhenAvailable/,
);
assert.match(schema, /suggestionVariant\s+String\s+@default\("balanced"\)/);
assert.match(
  migration,
  /FOREIGN KEY \("userId"\) REFERENCES "User"\("id"\) ON DELETE CASCADE/,
);
assert.match(demandMigration, /UnmetDemandRequester_userId_intentKey_key/);
assert.match(demandMigration, /ON DELETE CASCADE/);

assert.match(memory, /ANALYSIS_BATCH_SIZE = 10/);
assert.match(memory, /CONSENT_VERSION = "consumer-memory-v1"/);
assert.match(memory, /if \(!profile\?\.enabled\) return/);
assert.match(
  memory,
  /consumerMemorySignal\.deleteMany\(\{ where: \{ userId \} \}\)/,
);
assert.match(memory, /FORBIDDEN_PROFILE_PATTERN/);
assert.match(memory, /evidenceMessageIds/);
assert.match(memory, /DECISION_STYLE/);
assert.match(memory, /PRICE_SENSITIVITY/);
assert.match(memory, /NOVELTY_PREFERENCE/);
assert.match(memory, /RESPONSE_STYLE/);
assert.match(memory, /FRICTION_PATTERN/);
assert.match(memory, /behavioralKinds\.has\(kind\) \? 0\.65 : 0\.55/);
assert.match(
  memory,
  /behavioralKinds\.has\(kind\) && evidenceMessageIds\.length < 2/,
);
assert.match(memory, /Math\.min\(14, Math\.max\(1, requestedExpiry\)\)/);
assert.match(memory, /Math\.min\(180, Math\.max\(30, requestedExpiry\)\)/);
assert.match(memory, /Math\.min\(365, Math\.max\(30, requestedExpiry\)\)/);
assert.match(
  memory,
  /redactMemoryInput\(this\.decryptStoredText\(message\.content\)\)/,
);
assert.match(memory, /RECOVERED_STALE_JOB/);
assert.match(
  memory,
  /consumerSuggestionEvent\.deleteMany[\s\S]*180 \* 86_400_000/,
);
assert.match(
  memory,
  /status: \{ in: \["COMPLETED", "CANCELLED", "FAILED"\] \}/,
);
assert.match(memory, /rankProviders/);
assert.match(memory, /getSuggestions/);
assert.match(memory, /variantForUser/);
assert.match(memory, /profile\.suggestionVariant === "precision"/);

assert.match(history, /encryptSecret/);
assert.match(history, /decryptSecret/);
assert.match(history, /enc:v1:/);
assert.match(history, /encryptJson/);
assert.match(history, /decryptJson/);
assert.match(history, /onHistorySaved/);
assert.match(controller, /@Put\("consent"\)/);
assert.match(controller, /@Get\("export"\)/);
assert.match(controller, /@Patch\("signals\/:id"\)/);
assert.match(controller, /@Delete\("signals\/:id"\)/);
assert.match(controller, /@Post\("suggestion-events"\)/);

assert.match(chat, /PERSONALIZATION=/);
assert.match(chat, /The current request always wins/);
assert.match(home, /consumer\/memory\/suggestions/);
assert.match(home, /trackSuggestion/);
assert.match(mobile, /Roziman, yoqilsin/);
assert.match(mobile, /Memory’ni tozalash/);
assert.match(mobile, /Xotiramni eksport qilish/);
assert.match(mobile, /Xotirani tuzatish/);
assert.match(privacy, /Mahsulot talabi va ixtiyoriy personalization/);
assert.match(privacy, /Chat text is encrypted at rest/);
assert.match(unmetDemand, /userId_intentKey/);
assert.match(unmetDemand, /optInLatestNotification/);
assert.match(unmetDemand, /optOutLatestNotification/);
assert.match(unmetDemand, /uniqueRequesters/);
assert.match(unmetDemand, /unmet_demand_recorded/);
assert.match(unmetDemand, /demand_notification_preference/);
assert.match(chat, /CAPABILITY_UNSUPPORTED/);
assert.match(chat, /Qo‘shilganda xabar ber/);
assert.match(admin, /Mijozlar nimani so‘rayapti/);
assert.match(admin, /notificationSubscribers/);
assert.match(admin, /adminAnalytics\.trackDemandView/);
assert.match(privacy, /Product Demand and Optional Personalization/);
assert.match(privacy, /pseudonymous account identifikatori/);
assert.match(privacy, /Behavior signali kamida ikki interaction daliliga tayanadi/);

assert.match(productAnalytics, /createHash\('sha256'\)/);
assert.match(productAnalytics, /ANALYTICS_PSEUDONYM_SALT/);
assert.match(productAnalytics, /BLOCKED_PROPERTY/);
assert.match(productAnalytics, /AbortSignal\.timeout\(1_500\)/);
assert.match(memory, /memory_analysis_completed/);
assert.match(memory, /personalized_suggestions_generated/);
assert.match(memory, /personalized_suggestion_interacted/);

assert.doesNotMatch(mobileAnalytics, /prompt_preview/);
assert.match(mobileAnalytics, /maskAllTextInputs: true/);
assert.match(mobileAnalytics, /maskAllImages: true/);
assert.match(mobileAnalytics, /captureLog: false/);
assert.match(mobileAnalytics, /chat_response_received/);
assert.match(mobileAnalytics, /suggestion_interacted/);
assert.doesNotMatch(
  mobileAnalytics.match(/identifyUser:[\s\S]*?reset:/)?.[0] || "",
  /email:|name:/,
);
assert.doesNotMatch(
  adminAnalytics.match(/identifyAdmin:[\s\S]*?reset:/)?.[0] || "",
  /\n\s*email,/,
);
assert.match(adminAnalytics, /admin_unmet_demand_viewed/);
assert.match(adminAnalytics, /cleanProperties\(properties\)/);
assert.doesNotMatch(
  providerAnalytics.match(/identifyProvider:[\s\S]*?reset:/)?.[0] || "",
  /\n\s*email,|provider_name:/,
);
assert.match(providerAnalytics, /cleanProperties\(properties\)/);
assert.match(dataSafety, /PostHog’ga pseudonymous account ID/);
assert.match(dataSafety, /maskalanadi, console loglar yozib olinmaydi/);

console.log(
  "Consent-based consumer memory and personalization contracts passed.",
);
