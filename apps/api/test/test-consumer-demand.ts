import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { prisma, UserRole } from '@zayuno/database';
import { emptyConversationState } from '@zayuno/contracts';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { classifyDemand } from '../src/modules/analytics/demand-classification';
import { ConsumerDemandService } from '../src/modules/analytics/consumer-demand.service';
import { ConsumerDemandController } from '../src/modules/analytics/consumer-demand.controller';
import { ConsumerChatService } from '../src/modules/consumer/chat/consumer-chat.service';

async function main() {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const makeCtx = (role?: any) => ({
    getHandler: () => ConsumerDemandController.prototype.report,
    getClass: () => ConsumerDemandController,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as any);

  assert.throws(() => guard.canActivate(makeCtx()), /No user role identified/);
  assert.throws(() => guard.canActivate(makeCtx(UserRole.API_CONSUMER)), /Requires one of roles/);
  assert.throws(() => guard.canActivate(makeCtx(UserRole.PROVIDER_OWNER)), /Requires one of roles/);
  assert.equal(guard.canActivate(makeCtx(UserRole.ADMIN)), true);
  assert.equal(guard.canActivate(makeCtx(UserRole.SUPER_ADMIN)), true);

  assert.equal(classifyDemand('salom'), null);
  assert.equal(classifyDemand('rahmat'), null);
  assert.equal(classifyDemand('qora sumka top, 500 minggacha')?.budgetMax, 500000);
  assert.equal(classifyDemand('lavash buyurtma qil, +998901234567')?.budgetMax, null);
  assert.equal(classifyDemand('EVOSdan lavash buyurtma qil')?.brands[0], 'EVOS');
  assert.equal(classifyDemand('Beshqozon eng yaqin filial Toshkent')?.intent, 'NEARBY');
  assert.equal(classifyDemand('Beshqozon delivery bormi')?.intent, 'DELIVERY');
  assert.equal(classifyDemand('закажи бургер в Ташкенте')?.category, 'food');
  assert.equal(classifyDemand('ish top')?.category, 'jobs');
  assert.notEqual(classifyDemand('ovqat buyurtma qilish')?.category, 'jobs');

  delete process.env.GEMINI_API_KEY;
  delete process.env.CONSUMER_UNAVAILABLE_MESSAGE;
  const live = { slug: 'uzum', name: 'Uzum', environment: 'LIVE', capabilities: ['SEARCH'], description: 'retail market' };
  const sandbox = { slug: 'demo-food', name: 'Demo Food', environment: 'SANDBOX', capabilities: ['SEARCH'] };
  let listed: any[] = [live, sandbox]; let saved = true; let dispatches = 0;
  const service: any = new ConsumerChatService({ listProviders: async () => listed } as any,
    { searchOfferings: async () => [] } as any, {} as any,
    { createAction: () => { dispatches++; } } as any, {} as any, undefined, undefined,
    { record: async () => saved } as any);
  service.resolver.resolve = async () => ({ intent: 'SEARCH', query: 'osh', unsupported: true });
  const input = { prompt: 'Beshqozondan osh buyurtma qil', userId: 'unit-user', messageId: 'one' };
  let result = await service.turn(input, emptyConversationState(), async () => {});
  assert.equal(result.content, 'Bu xizmat hozircha Zayunoga ulanmagan. So‘rovingiz saqlandi. Quyidagi hamkorlardan birini tanlashingiz mumkin.');
  assert.deepEqual(result.interaction.providers.map((p: any) => p.slug), ['uzum']);
  listed = [sandbox];
  result = await service.turn(input, emptyConversationState(), async () => {});
  assert.equal(result.interaction, undefined);
  assert.doesNotMatch(result.content, /quyidagi xizmatlar/);
  saved = false;
  result = await service.turn(input, emptyConversationState(), async () => {});
  assert.doesNotMatch(result.content, /saqladik|unutmaymiz/);
  const oldState = { ...emptyConversationState(), environment: 'SANDBOX', providerSlug: 'demo-food', action: { status: 'SUBMITTING' } };
  await service.turn(input, oldState, async () => {});
  assert.equal(oldState.environment, 'LIVE'); assert.equal(dispatches, 0);

  const url = new URL(process.env.DATABASE_URL || 'postgresql://localhost:5432/zayuno');
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Integration tests only run on localhost.');
  const originalCreate = prisma.consumerDemandEvent.createMany;
  const originalFindUser = prisma.user.findUnique;
  const originalQuery = prisma.$queryRaw;
  const env = { ...process.env };
  try {
    await prisma.$transaction(async tx => {
      const tables: any[] = await tx.$queryRaw`SELECT to_regclass('public."ConsumerDemandEvent"')::text AS name`;
      if (!tables[0].name) {
        const migration = readFileSync('../../packages/database/prisma/migrations/20261001000000_consumer_demand_events/migration.sql', 'utf8');
        for (const statement of migration.split(';').filter(s => s.trim())) await tx.$executeRawUnsafe(statement);
      }
      const a = randomUUID(), b = randomUUID(), reviewer = randomUUID(), staff = randomUUID();
      for (const [id, role] of [[a, 'API_CONSUMER'], [b, 'API_CONSUMER'], [reviewer, 'API_CONSUMER'], [staff, 'ADMIN']] as const) {
        await tx.user.create({ data: { id, email: `${id}@example.invalid`, name: 'Rollback demand test', passwordHash: 'test', role } });
      }
      prisma.consumerDemandEvent.createMany = tx.consumerDemandEvent.createMany.bind(tx.consumerDemandEvent) as any;
      prisma.user.findUnique = tx.user.findUnique.bind(tx.user) as any;
      prisma.$queryRaw = tx.$queryRaw.bind(tx) as any;
      const demand = new ConsumerDemandService();
      process.env.NODE_ENV = 'production'; process.env.CONSUMER_DEMAND_ENABLED = 'true'; process.env.PLAY_REVIEW_EMAIL = `${reviewer}@example.invalid`;
      const record = (userId: string, messageId: string, prompt = 'Beshqozon Toshkent osh buyurtma qil, 100 minggacha') => demand.record({ userId, messageId, prompt, outcome: 'UNFULFILLED', reason: 'NO_PROVIDER' });
      assert.equal(await record(a, 'first'), true);
      await Promise.all([record(a, 'first'), record(a, 'first')]);
      await record(a, 'second'); await record(b, 'first');
      assert.equal(await record(reviewer, 'ignored'), false);
      assert.equal(await record(staff, 'ignored'), false);
      process.env.NODE_ENV = 'development'; assert.equal(await record(a, 'dev'), false);
      process.env.NODE_ENV = 'production';
      // An old event must not inflate the selected period's repeats or users.
      await tx.consumerDemandEvent.create({ data: { userId: a, messageKey: 'old', category: 'food', intent: 'ORDER', brands: ['Beshqozon'], highIntent: true, outcome: 'UNFULFILLED', createdAt: new Date('2000-01-01') } });
      const captured = await tx.consumerDemandEvent.findMany({ where: { userId: { in: [a, b] }, messageKey: { not: 'old' } } });
      assert.equal(captured.length, 3);
      const captureTime = captured[0].createdAt.getTime();
      const report = await demand.report({ brand: 'Beshqozon', from: new Date(captureTime - 1000).toISOString(), to: new Date(captureTime + 60000).toISOString() });
      assert.equal(report.summary.requests, 3); assert.equal(report.summary.uniqueUsers, 2); assert.equal(report.summary.repeatUsers, 1);
      assert.equal(report.brands[0].orderRequests, 3); assert.equal(report.brands[0].averageBudgetMax, 100000);
      assert.equal(report.topics[0].label, 'osh'); assert.equal(report.daily.length, 1);
      assert.ok(!JSON.stringify(report).includes('@example.invalid')); assert.ok(!JSON.stringify(report).includes(a));
      await assert.rejects(demand.report({ from: 'wrong' }), /Davr/);
      await assert.rejects(demand.report({ outcome: 'SANDBOX' }), /outcome/);
      const empty = await demand.report({ brand: 'brand-that-does-not-exist' }); assert.equal(empty.summary.requests, 0);
      await tx.user.delete({ where: { id: b } });
      assert.equal(await tx.consumerDemandEvent.count({ where: { userId: b } }), 0, 'account deletion cascades');
      throw new Error('ROLLBACK_DEMAND_TEST');
    }, { timeout: 30000 });
  } catch (error: any) { if (error.message !== 'ROLLBACK_DEMAND_TEST') throw error; }
  finally {
    prisma.consumerDemandEvent.createMany = originalCreate;
    prisma.user.findUnique = originalFindUser;
    prisma.$queryRaw = originalQuery;
    process.env = env;
    await prisma.$disconnect();
  }
  console.log('PASS: classification, customer text/cards, sandbox guard, dedup, exclusions, period SQL, exports and deletion. All DB fixtures rolled back.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
