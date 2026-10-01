import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const authService = read("apps/api/src/modules/consumer/auth/consumer-auth.service.ts");
const authController = read("apps/api/src/modules/consumer/auth/consumer-auth.controller.ts");
const accountSheet = read("apps/mobile/src/components/AccountSheet.tsx");
const analyticsLib = read("apps/mobile/src/lib/analytics.ts");

// 1. Controller contract
assert.match(authController, /@Delete\("account"\)/, "ConsumerAuthController must expose DELETE /account endpoint");
assert.match(authController, /@UseGuards\(JwtAuthGuard\)/, "deleteAccount must be guarded by JwtAuthGuard");
assert.match(authController, /this\.authService\.deleteConsumerAccount\(req\.user\.id\)/, "deleteAccount must call deleteConsumerAccount with authenticated user ID");

// 2. Service deletion contract
assert.match(authService, /async deleteConsumerAccount\(userId: string\)/, "ConsumerAuthService must have deleteConsumerAccount method");
assert.match(authService, /prisma\.\$transaction/, "Deletion must execute inside a durable database transaction");
assert.match(authService, /tx\.consumerSession\.deleteMany/, "Must cascade delete all consumer sessions");
assert.match(authService, /tx\.consumerChatMessage\.deleteMany/, "Must cascade delete all chat messages");
assert.match(authService, /tx\.consumerChatSession\.deleteMany/, "Must cascade delete all chat sessions");
assert.match(authService, /tx\.consumerMemorySignal\.deleteMany/, "Must cascade delete all memory signals");
assert.match(authService, /tx\.consumerMemoryProfile\.deleteMany/, "Must cascade delete memory profile");
assert.match(authService, /tx\.userReport\.updateMany/, "Must anonymize technical user reports");
assert.match(authService, /tx\.user\.delete/, "Must delete user record from database");
assert.match(authService, /consumer:refresh:/, "Must invalidate Redis session tokens");

// 3. Reviewer Account Support
assert.match(authService, /PLAY_REVIEW_EMAIL/, "Must support environment-configured reviewer email");
assert.match(authService, /PLAY_REVIEW_OTP/, "Must support environment-configured reviewer OTP");

// 4. In-App mobile deletion flow
assert.match(accountSheet, /apiFetch\("\/api\/v1\/consumer\/auth\/account",\s*\{\s*method:\s*"DELETE"/, "AccountSheet must have an in-app deletion button calling DELETE /account");
assert.match(accountSheet, /publicLinks\.accountDeletion/, "AccountSheet must also support web deletion request as fallback");

// 5. Analytics data masking
assert.match(analyticsLib, /maskAllTextInputs:\s*true/, "PostHog Session Replay must mask all text inputs");
assert.match(analyticsLib, /maskAllImages:\s*true/, "PostHog Session Replay must mask all images");
assert.match(analyticsLib, /sanitizeStringValue/, "PostHog properties must scrub sensitive patterns from values");

console.log("✅ Consumer account deletion, reviewer access, and privacy contracts passed!");
