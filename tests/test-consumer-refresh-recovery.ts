import assert from "node:assert/strict";
import { prisma } from "../packages/database/src/client.ts";
import { ConsumerAuthService } from "../apps/api/src/modules/consumer/auth/consumer-auth.service";

async function main() {
  process.env.CONSUMER_REFRESH_TOKEN_SECRET =
    "test-only-refresh-secret-with-more-than-32-characters";
  const user = {
    id: "customer",
    email: "test@example.test",
    name: "Test",
    role: "API_CONSUMER" as any,
    isActive: true,
  };
  const sessions = new Map<string, any>();
  const delegate: any = {
    findUnique: async ({ where }: any) => {
      const s = sessions.get(where.id);
      return s ? { ...s } : null;
    },
    create: async ({ data }: any) => {
      const s = { createdAt: new Date(), revokedAt: null, ...data };
      sessions.set(data.id, s);
      return s;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const row of sessions.values()) {
        if (!Object.entries(where).every(([key, value]) => row[key] === value))
          continue;
        Object.assign(row, data);
        count++;
      }
      return { count };
    },
  };
  Object.assign(prisma.consumerSession, delegate);
  prisma.user.findUnique = (async () => user) as any;
  let transaction: Promise<any> = Promise.resolve();
  (prisma as any).$transaction = (fn: any) => {
    const result = transaction.then(() => fn({ consumerSession: delegate }));
    transaction = result.catch(() => undefined);
    return result;
  };
  const jwt = {
    signAsync: async (payload: any) => JSON.stringify(payload),
    verifyAsync: async (token: string) => JSON.parse(token),
  };
  const service = new ConsumerAuthService(
    jwt as any,
    {
      get: async () => null,
      set: async () => undefined,
      del: async () => undefined,
    } as any,
  );
  const initial = await (service as any).issueSession(user);
  const first = await service.refreshSession(initial.refreshToken);
  const recovered = await service.refreshSession(initial.refreshToken);
  assert.equal(
    JSON.parse(first.refreshToken).jti,
    JSON.parse(recovered.refreshToken).jti,
    "a lost response must recover the same successor",
  );
  assert.equal(sessions.size, 2);
  const second = await service.refreshSession(recovered.refreshToken);
  await assert.rejects(
    service.refreshSession(initial.refreshToken),
    /no longer active/,
  );
  assert.equal(
    sessions.get(JSON.parse(second.refreshToken).jti).revokedAt,
    null,
    "stale retry must not revoke the healthy session family",
  );
  const concurrent = await Promise.all([
    service.refreshSession(second.refreshToken),
    service.refreshSession(second.refreshToken),
  ]);
  assert.equal(
    JSON.parse(concurrent[0].refreshToken).jti,
    JSON.parse(concurrent[1].refreshToken).jti,
  );
  await service.revokeSession(second.refreshToken);
  await assert.rejects(
    service.refreshSession(concurrent[0].refreshToken),
    /no longer active/,
  );
  await assert.rejects(
    service.refreshSession(second.refreshToken),
    /no longer active/,
    "logout must also revoke a successor from a lost response",
  );
  delete process.env.CONSUMER_REFRESH_TOKEN_SECRET;
  await assert.rejects(
    service.refreshSession(initial.refreshToken),
    (error: any) => error.getStatus() === 503,
    "server configuration outage must not invalidate local sessions",
  );
  console.log(
    "Consumer refresh: lost response, concurrent retry, old replay, logout family revocation, and configuration outage passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
