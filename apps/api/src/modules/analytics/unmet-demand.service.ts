import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@zayuno/database';
import { scrubSensitiveString } from '@zayuno/shared';
import { ProductAnalyticsService } from './product-analytics.service';

export interface UnmetDemandEvent {
  category?: string;
  geography?: string;
  capability?: string;
  queryIntent?: string;
  reasonCode: 'NO_PROVIDER_IN_CATEGORY' | 'NO_PROVIDER_IN_GEOGRAPHY' | 'CAPABILITY_UNSUPPORTED' | 'OUT_OF_COVERAGE' | 'NO_MATCHING_PROVIDERS';
  source?: string;
  timestamp?: string;
  correlationId?: string;
  userId?: string;
}

export interface StoredUnmetDemand {
  id: string;
  category?: string | null;
  geography?: string | null;
  capability?: string | null;
  queryIntent?: string | null;
  reasonCode: string;
  source: string;
  count: number;
  lastOccurredAt: Date;
  createdAt: Date;
}

@Injectable()
export class UnmetDemandService {
  private logger = new Logger('UnmetDemandService');
  private readonly RETENTION_DAYS = 30;

  constructor(private readonly productAnalytics?: ProductAnalyticsService) {}

  /**
   * Sanitizes search intent by stripping sensitive strings, phone numbers, emails, and digits.
   */
  sanitizeQueryIntent(rawIntent?: string): string | undefined {
    if (!rawIntent || typeof rawIntent !== 'string') return undefined;
    return scrubSensitiveString(rawIntent.trim().toLowerCase(), 100)
      .replace(/[0-9+()\-]/g, '') // remove numbers/phone patterns
      .replace(/\s+/g, ' ')
      .trim() || undefined;
  }

  /**
   * Records an unmet customer demand event when search/discovery returns zero providers.
   * Enforces privacy by stripping any PII, phone, email, or address from search intents.
   * Uses a durable 10-minute time bucket for atomic deduplication across restarts and API instances.
   */
  async recordUnmetDemand(input: UnmetDemandEvent): Promise<void> {
    const cleanIntent = this.sanitizeQueryIntent(input.queryIntent);
    const cleanCategory = input.category
      ? input.category.trim().toLowerCase()
      : this.inferCategory(cleanIntent);
    const cleanGeography = input.geography ? input.geography.trim().toUpperCase() : undefined;
    const cleanCapability = input.capability ? input.capability.trim() : undefined;
    const source = input.source || 'AI_AGENT';
    const reasonCode = input.reasonCode || 'NO_MATCHING_PROVIDERS';
    const intentKey = this.canonicalIntentKey(cleanIntent, cleanCategory, cleanCapability, reasonCode);

    const now = new Date();
    // 10-minute bucket timestamp (rounded down)
    const timeBucketMs = Math.floor(now.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000);
    const timeBucketIso = new Date(timeBucketMs).toISOString();

    // Deduplication Key: group identical requests within 10-minute bucket
    const bucketKey = `${cleanCategory || 'none'}:${cleanGeography || 'none'}:${cleanCapability || 'none'}:${cleanIntent || 'none'}:${reasonCode}:${timeBucketIso}`;

    try {
      await prisma.unmetDemandRecord.upsert({
        where: { bucketKey },
        create: {
          bucketKey,
          category: cleanCategory,
          geography: cleanGeography,
          requestedCapability: cleanCapability,
          queryIntent: cleanIntent,
          reasonCode,
          source,
          count: 1,
          lastOccurredAt: now
        },
        update: {
          count: { increment: 1 },
          lastOccurredAt: now
        }
      });
      if (input.userId) {
        try {
          await prisma.unmetDemandRequester.upsert({
            where: { userId_intentKey: { userId: input.userId, intentKey } },
            create: {
              userId: input.userId,
              intentKey,
              queryIntent: cleanIntent,
              category: cleanCategory,
              geography: cleanGeography,
              requestedCapability: cleanCapability,
              reasonCode,
              source,
              lastRequestedAt: now
            },
            update: {
              queryIntent: cleanIntent,
              category: cleanCategory,
              geography: cleanGeography,
              requestedCapability: cleanCapability,
              reasonCode,
              source,
              requestCount: { increment: 1 },
              lastRequestedAt: now
            }
          });
        } catch (err: any) {
          // Keep legacy aggregate capture working during rolling deploys before the new table exists.
          if (err?.code !== 'P2021') throw err;
        }
      }
      this.productAnalytics?.capture('unmet_demand_recorded', input.userId, {
        intent_key: intentKey,
        category: cleanCategory,
        capability: cleanCapability,
        reason_code: reasonCode,
        event_source: source
      });
    } catch (err: any) {
      this.logger.error(`Failed to record unmet demand: ${err.message}`);
    }
  }

  async optInLatestNotification(userId: string) {
    const latest = await prisma.unmetDemandRequester.findFirst({
      where: { userId },
      orderBy: { lastRequestedAt: 'desc' }
    });
    if (!latest) return null;
    const updated = await prisma.unmetDemandRequester.update({
      where: { id: latest.id },
      data: { notifyWhenAvailable: true, notificationStatus: 'WAITING' }
    });
    this.productAnalytics?.capture('demand_notification_preference', userId, {
      intent_key: updated.intentKey,
      category: updated.category,
      enabled: true
    });
    return updated;
  }

  async optOutLatestNotification(userId: string) {
    const latest = await prisma.unmetDemandRequester.findFirst({
      where: { userId, notifyWhenAvailable: true },
      orderBy: { lastRequestedAt: 'desc' }
    });
    if (!latest) return null;
    const updated = await prisma.unmetDemandRequester.update({
      where: { id: latest.id },
      data: { notifyWhenAvailable: false, notificationStatus: 'OPTED_OUT' }
    });
    this.productAnalytics?.capture('demand_notification_preference', userId, {
      intent_key: updated.intentKey,
      category: updated.category,
      enabled: false
    });
    return updated;
  }

  /**
   * Cleans up records older than the retention limit (default 30 days).
   */
  async cleanupOldRecords(retentionDays = this.RETENTION_DAYS): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    try {
      const result = await prisma.unmetDemandRecord.deleteMany({
        where: { createdAt: { lt: cutoff } }
      });
      await prisma.unmetDemandRequester.deleteMany({
        where: {
          lastRequestedAt: {
            lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          }
        }
      }).catch((err: any) => {
        if (err?.code !== 'P2021') throw err;
      });
      return result.count;
    } catch (err: any) {
      this.logger.error(`Failed to clean up old unmet demand records: ${err.message}`);
      return 0;
    }
  }

  /**
   * Returns aggregated analytics on missing services, top unfulfilled categories,
   * and underserved geographic zones for platform operations.
   */
  async getAggregatedDemand(filters?: {
    from?: string;
    to?: string;
    category?: string;
    geography?: string;
    reasonCode?: string;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category.toLowerCase().trim();
    }
    if (filters?.geography) {
      where.geography = filters.geography.toUpperCase().trim();
    }
    if (filters?.reasonCode) {
      where.reasonCode = filters.reasonCode;
    }
    if (filters?.from || filters?.to) {
      where.lastOccurredAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {})
      };
    }

    const records = await prisma.unmetDemandRecord.findMany({
      where,
      orderBy: { lastOccurredAt: 'desc' }
    });
    const requesterWhere: any = {};
    if (filters?.category) requesterWhere.category = filters.category.toLowerCase().trim();
    if (filters?.geography) requesterWhere.geography = filters.geography.toUpperCase().trim();
    if (filters?.reasonCode) requesterWhere.reasonCode = filters.reasonCode;
    if (filters?.from || filters?.to) {
      requesterWhere.lastRequestedAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {})
      };
    }
    const requesterRows = await prisma.unmetDemandRequester.findMany({
      where: requesterWhere,
      orderBy: { lastRequestedAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 1000
    }).catch((err: any) => {
      if (err?.code === 'P2021') return [];
      throw err;
    });

    const categoryCounts = new Map<string, number>();
    const geographyCounts = new Map<string, number>();
    const capabilityCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    let totalUnmetCount = 0;

    for (const item of records) {
      totalUnmetCount += item.count;

      if (item.category) {
        categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + item.count);
      }
      if (item.geography) {
        geographyCounts.set(item.geography, (geographyCounts.get(item.geography) || 0) + item.count);
      }
      if (item.requestedCapability) {
        capabilityCounts.set(item.requestedCapability, (capabilityCounts.get(item.requestedCapability) || 0) + item.count);
      }
      reasonCounts.set(item.reasonCode, (reasonCounts.get(item.reasonCode) || 0) + item.count);
    }

    const toSortedArray = (map: Map<string, number>, keyName: string) =>
      Array.from(map.entries())
        .map(([name, count]) => ({ [keyName]: name, count }))
        .sort((a, b) => b.count - a.count);

    const customerRequestGroups = new Map<string, any>();
    for (const item of requesterRows) {
      const current = customerRequestGroups.get(item.intentKey) || {
        intentKey: item.intentKey,
        queryIntent: item.queryIntent,
        category: item.category,
        capability: item.requestedCapability,
        requestCount: 0,
        requesterCount: 0,
        notificationSubscribers: 0,
        lastRequestedAt: item.lastRequestedAt,
        requesters: []
      };
      current.requestCount += item.requestCount;
      current.requesterCount += 1;
      current.notificationSubscribers += Number(item.notifyWhenAvailable);
      if (item.lastRequestedAt > current.lastRequestedAt) {
        current.lastRequestedAt = item.lastRequestedAt;
        current.queryIntent = item.queryIntent;
      }
      if (current.requesters.length < 20) {
        current.requesters.push({
          userId: item.user.id,
          name: item.user.name,
          email: item.user.email,
          requestCount: item.requestCount,
          lastRequestedAt: item.lastRequestedAt,
          notifyWhenAvailable: item.notifyWhenAvailable,
          notificationStatus: item.notificationStatus
        });
      }
      customerRequestGroups.set(item.intentKey, current);
    }

    return {
      totalEvents: totalUnmetCount,
      uniquePatterns: records.length,
      uniqueRequesters: new Set(requesterRows.map(item => item.userId)).size,
      notificationSubscribers: requesterRows.filter(item => item.notifyWhenAvailable).length,
      topMissingCategories: toSortedArray(categoryCounts, 'category'),
      topMissingGeographies: toSortedArray(geographyCounts, 'geography'),
      topMissingCapabilities: toSortedArray(capabilityCounts, 'capability'),
      reasonsBreakdown: toSortedArray(reasonCounts, 'reasonCode'),
      topCustomerRequests: [...customerRequestGroups.values()]
        .sort((left, right) =>
          right.requesterCount - left.requesterCount ||
          right.requestCount - left.requestCount ||
          right.lastRequestedAt.getTime() - left.lastRequestedAt.getTime()
        )
        .slice(0, 100),
      recentUnmetDemand: records.slice(0, 50).map(r => ({
        id: r.id,
        category: r.category,
        geography: r.geography,
        capability: r.requestedCapability,
        queryIntent: r.queryIntent,
        reasonCode: r.reasonCode,
        source: r.source,
        count: r.count,
        lastOccurredAt: r.lastOccurredAt,
        createdAt: r.createdAt
      }))
    };
  }

  private inferCategory(intent?: string) {
    if (!intent) return undefined;
    const rules: Array<[RegExp, string]> = [
      [/universitet|institut|maktab|kurs|ta['‘’`]?lim|ustoz/, 'education'],
      [/taksi|transport|avtobus|poyezd|avia|samolyot/, 'transport'],
      [/mehmonxona|otel|sayohat|tur|bilet/, 'travel'],
      [/doktor|shifokor|klinika|dori|apteka/, 'healthcare'],
      [/ish|vakansiya|rezyume|job/, 'jobs'],
      [/kiyim|telefon|texnika|do['‘’`]?kon|market/, 'retail'],
      [/restoran|kafe|food|ovqat|taom|lavash|pizza|pitsa/, 'food']
    ];
    return rules.find(([pattern]) => pattern.test(intent))?.[1] || 'other';
  }

  private canonicalIntentKey(
    intent: string | undefined,
    category: string | undefined,
    capability: string | undefined,
    reasonCode: string
  ) {
    const core = String(intent || capability || category || reasonCode)
      .replace(/\b(menga|bizga|iltimos|hozircha|qani|yana|ham)\b/gi, ' ')
      .replace(/\b(ko['‘’`]?rsat(?:ing|chi)?|top(?:ib)?|ber(?:ing|chi)?|kerak|xohlayman|istayman|bormi)\b/gi, ' ')
      .replace(/(lar)?(ni|ga|da|dan)$/gi, '')
      .replace(/[^a-z0-9а-яёғқҳў]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
    return `${category || 'other'}:${core || 'unknown'}`;
  }
}
