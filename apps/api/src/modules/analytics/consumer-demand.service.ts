import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { prisma, Prisma } from '@zayuno/database';
import { classifyDemand } from './demand-classification';

export type DemandOutcome = 'AVAILABLE' | 'UNFULFILLED' | 'ERROR';
export type DemandFilters = { from?: string; to?: string; category?: string; brand?: string; city?: string; outcome?: string };

@Injectable()
export class ConsumerDemandService {
  private readonly logger = new Logger(ConsumerDemandService.name);

  async record(input: { userId: string; messageId?: string; conversationId?: string; prompt: string;
    outcome: DemandOutcome; reason?: string; providers?: Array<{ name: string; slug: string }> }) {
    // Development, tests and staging never feed the sales report.
    if (process.env.NODE_ENV !== 'production' || process.env.CONSUMER_DEMAND_ENABLED !== 'true') return false;
    const facts = classifyDemand(input.prompt, input.providers);
    if (!facts) return false;
    try {
      const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true, email: true, isActive: true } });
      const excluded = [process.env.PLAY_REVIEW_EMAIL, ...(process.env.DEMAND_EXCLUDED_EMAILS || '').split(',')]
        .filter(Boolean).map(email => email!.trim().toLowerCase());
      if (!user?.isActive || user.role !== 'API_CONSUMER' || excluded.includes(user.email.toLowerCase())) return false;
      // New mobile versions supply the persisted message ID. Legacy clients use
      // a conservative ten-minute hash; this can undercount repeats, never inflate them.
      const identity = input.messageId || `${input.conversationId || 'default'}:${input.prompt.trim().toLowerCase()}:${Math.floor(Date.now() / 600000)}`;
      const messageKey = createHash('sha256').update(identity).digest('hex');
      await prisma.consumerDemandEvent.createMany({ data: [{ userId: input.userId, messageKey, ...facts,
        outcome: input.outcome, reason: input.reason || null, createdAt: new Date() }], skipDuplicates: true });
      return true;
    } catch {
      this.logger.error('Consumer demand capture failed; inspect database migration/availability.');
      return false;
    }
  }

  async report(filters: DemandFilters = {}) {
    const to = filters.to ? new Date(filters.to) : new Date();
    const from = filters.from ? new Date(filters.from) : new Date(to.getTime() - 30 * 86400000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to.getTime() - from.getTime() > 366 * 86400000) {
      throw new BadRequestException('Davr to‘g‘ri sana bo‘lishi va 366 kundan oshmasligi kerak.');
    }
    if (filters.outcome && !['AVAILABLE', 'UNFULFILLED', 'ERROR'].includes(filters.outcome)) throw new BadRequestException('Noto‘g‘ri outcome.');
    const tableCheck: any[] = await prisma.$queryRaw`SELECT to_regclass('public."ConsumerDemandEvent"')::text AS name`;
    if (!tableCheck[0]?.name) {
      return {
        title: 'Demand waiting for your integration', generatedAt: new Date().toISOString(),
        period: { from: from.toISOString(), to: to.toISOString(), timezone: 'Asia/Tashkent', endExclusive: true },
        filters, summary: { requests: 0, uniqueUsers: 0, highIntentRequests: 0, unfulfilledRequests: 0, availableRequests: 0, errors: 0, budgetRequests: 0, repeatUsers: 0 },
        categories: [], brands: [], cities: [], intents: [], reasons: [], topics: [], daily: [],
        methodology: 'Authenticated LIVE consumer discovery messages; unique message IDs deduplicated. High intent = SEARCH or ORDER. AVAILABLE means routed to a live service, not an order. Brand counts are mentions, not commitments. Unknown city/budget stays unknown. Tests, staff and configured reviewer accounts excluded. No historical backfill. Classification v1.'
      };
    }
    const where = Prisma.sql`"createdAt" >= (${from}::timestamptz AT TIME ZONE 'UTC') AND "createdAt" < (${to}::timestamptz AT TIME ZONE 'UTC') AND "environment" = 'LIVE'
      ${filters.category ? Prisma.sql`AND "category" = ${filters.category}` : Prisma.empty}
      ${filters.brand ? Prisma.sql`AND ${filters.brand} = ANY("brands")` : Prisma.empty}
      ${filters.city ? Prisma.sql`AND "city" = ${filters.city}` : Prisma.empty}
      ${filters.outcome ? Prisma.sql`AND "outcome" = ${filters.outcome}` : Prisma.empty}`;
    const summary = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "requests", COUNT(DISTINCT "userId")::int AS "uniqueUsers",
        COUNT(*) FILTER (WHERE "highIntent")::int AS "highIntentRequests",
        COUNT(*) FILTER (WHERE "outcome" = 'UNFULFILLED')::int AS "unfulfilledRequests",
        COUNT(*) FILTER (WHERE "outcome" = 'AVAILABLE')::int AS "availableRequests",
        COUNT(*) FILTER (WHERE "outcome" = 'ERROR')::int AS "errors",
        COUNT(*) FILTER (WHERE "budgetMax" IS NOT NULL)::int AS "budgetRequests"
      FROM "ConsumerDemandEvent" WHERE ${where}`);
    const repeat = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "repeatUsers" FROM (
        SELECT "userId" FROM "ConsumerDemandEvent" WHERE ${where} GROUP BY "userId" HAVING COUNT(*) > 1
      ) repeats`);
    const dimension = async (field: string, brands = false) => {
      const key = brands ? Prisma.sql`brand` : Prisma.raw(`COALESCE("${field}"::text, 'unknown')`);
      return prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT ${key} AS "label", COUNT(*)::int AS "requests", COUNT(DISTINCT "userId")::int AS "uniqueUsers",
          (COUNT(*) - COUNT(DISTINCT "userId"))::int AS "repeatRequests",
          COUNT(*) FILTER (WHERE "highIntent")::int AS "highIntentRequests",
          COUNT(*) FILTER (WHERE "outcome" = 'UNFULFILLED')::int AS "unfulfilledRequests",
          COUNT(*) FILTER (WHERE "intent" = 'ORDER')::int AS "orderRequests",
          COUNT(*) FILTER (WHERE "intent" = 'NEARBY')::int AS "nearbyRequests",
          COUNT(*) FILTER (WHERE "intent" = 'DELIVERY')::int AS "deliveryRequests",
          ROUND(AVG("budgetMax"))::int AS "averageBudgetMax"
        FROM "ConsumerDemandEvent" ${brands ? Prisma.sql`CROSS JOIN LATERAL unnest("brands") AS brand` : Prisma.empty}
        WHERE ${where} GROUP BY ${key} ORDER BY "requests" DESC, "label" ASC`);
    };
    const [categories, brands, cities, intents, reasons, topics, daily] = await Promise.all([
      dimension('category'), dimension('', true), dimension('city'), dimension('intent'), dimension('reason'), dimension('topic'),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS "date",
        COUNT(*)::int AS "requests", COUNT(DISTINCT "userId")::int AS "uniqueUsers",
        (COUNT(*) - COUNT(DISTINCT "userId"))::int AS "repeatRequests",
        COUNT(*) FILTER (WHERE "highIntent")::int AS "highIntentRequests",
        COUNT(*) FILTER (WHERE "outcome" = 'UNFULFILLED')::int AS "unfulfilledRequests",
        COUNT(*) FILTER (WHERE "intent" = 'ORDER')::int AS "orderRequests",
        COUNT(*) FILTER (WHERE "intent" = 'NEARBY')::int AS "nearbyRequests",
        COUNT(*) FILTER (WHERE "intent" = 'DELIVERY')::int AS "deliveryRequests",
        ROUND(AVG("budgetMax"))::int AS "averageBudgetMax"
        FROM "ConsumerDemandEvent" WHERE ${where} GROUP BY 1 ORDER BY 1`),
    ]);
    return { title: 'Demand waiting for your integration', generatedAt: new Date().toISOString(),
      period: { from: from.toISOString(), to: to.toISOString(), timezone: 'Asia/Tashkent', endExclusive: true },
      filters, summary: { ...summary[0], ...repeat[0] }, categories, brands, cities, intents, reasons, topics, daily,
      methodology: 'Authenticated LIVE consumer discovery messages; unique message IDs deduplicated. High intent = SEARCH or ORDER. AVAILABLE means routed to a live service, not an order. Brand counts are mentions, not commitments. Unknown city/budget stays unknown. Tests, staff and configured reviewer accounts excluded. No historical backfill. Classification v1.' };
  }
}
