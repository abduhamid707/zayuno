import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const schema = read("packages/database/prisma/schema.prisma");
const authService = read(
  "apps/api/src/modules/consumer/auth/consumer-auth.service.ts",
);
const authController = read(
  "apps/api/src/modules/consumer/auth/consumer-auth.controller.ts",
);
const authStore = read("apps/mobile/src/store/authStore.ts");
const apiClient = read("apps/mobile/src/lib/api.ts");
const rootLayout = read("apps/mobile/app/_layout.tsx");
const historyService = read(
  "apps/api/src/modules/consumer/history/consumer-history.service.ts",
);
const historyController = read(
  "apps/api/src/modules/consumer/history/consumer-history.controller.ts",
);
const chatStore = read("apps/mobile/src/store/chatStore.ts");
const accountSheet = read("apps/mobile/src/components/AccountSheet.tsx");

assert.match(schema, /model ConsumerSession[\s\S]*familyId[\s\S]*revokedAt/);
assert.match(schema, /model ConsumerChatSession[\s\S]*userId[\s\S]*messages/);
assert.match(authService, /REFRESH_TTL_SECONDS = 365 \* 24 \* 60 \* 60/);
assert.match(authService, /prisma\.consumerSession\.findUnique/);
assert.match(authService, /prisma\.\$transaction/);
assert.match(
  authService,
  /where: \{ familyId: session\.familyId, revokedAt: null \}/,
);
assert.match(authController, /@Post\("revoke-all"\)/);

assert.match(authStore, /expo-secure-store/);
assert.ok(
  authStore.indexOf("REFRESH_TOKEN_KEY, persistedRefreshToken") <
    authStore.indexOf("ACCESS_TOKEN_KEY, accessToken"),
  "Rotated refresh token must be stored before the access token.",
);
assert.match(authStore, /let refreshInFlight: Promise<boolean> \| null/);
assert.match(authStore, /if \(refreshInFlight\) return refreshInFlight/);
assert.match(
  authStore,
  /if \(\[400, 401, 403\]\.includes\(response\.status\)\)/,
);
assert.match(apiClient, /response\.status === 401[\s\S]*refreshSession/);
assert.match(rootLayout, /AppState\.addEventListener\("change"/);

assert.match(historyController, /@UseGuards\(JwtAuthGuard\)/);
assert.match(historyService, /where: \{ userId \}/);
assert.match(historyService, /existing\.updatedAt > session\.updatedAt/);
assert.match(chatStore, /zayuno_chat_sessions_v2:\$\{userId\}/);
assert.match(chatStore, /const remoteQueues = new Map/);
assert.match(chatStore, /queueRemote\(id,[\s\S]*method: "DELETE"/);

assert.match(accountSheet, /Hisobdan chiqasizmi\?/);
assert.match(accountSheet, /Chatlaringiz hisobingizda saqlanadi/);
assert.match(accountSheet, /Bu oddiy logout emas/);
assert.match(accountSheet, /Keyingi sahifada yana tasdiqlaysiz/);
assert.match(accountSheet, /Barcha qurilmalardan chiqish/);

console.log("Consumer auth persistence and account safety contracts passed.");
