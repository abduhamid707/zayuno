import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@zayuno/database';
import { scrubSensitiveString } from '@zayuno/shared';

export interface UnmetDemandEvent {
  category?: string;
  geography?: string;
  capability?: string;
  queryIntent?: string;
  reasonCode: 'NO_PROVIDER_IN_CATEGORY' | 'NO_PROVIDER_IN_GEOGRAPHY' | 'CAPABILITY_UNSUPPORTED' | 'OUT_OF_COVERAGE' | 'NO_MATCHING_PROVIDERS';
  source?: string;
  timestamp?: string;
  correlationId?: string;
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
    const cleanCategory = input.category ? input.category.trim().toLowerCase() : undefined;
    const cleanGeography = input.geography ? input.geography.trim().toUpperCase() : undefined;
    const cleanCapability = input.capability ? input.capability.trim() : undefined;
    const cleanIntent = this.sanitizeQueryIntent(input.queryIntent);
    const source = input.source || 'AI_AGENT';
    const reasonCode = input.reasonCode || 'NO_MATCHING_PROVIDERS';

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
    } catch (err: any) {
      this.logger.error(`Failed to record unmet demand: ${err.message}`);
    }
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

    return {
      totalEvents: totalUnmetCount,
      uniquePatterns: records.length,
      topMissingCategories: toSortedArray(categoryCounts, 'category'),
      topMissingGeographies: toSortedArray(geographyCounts, 'geography'),
      topMissingCapabilities: toSortedArray(capabilityCounts, 'capability'),
      reasonsBreakdown: toSortedArray(reasonCounts, 'reasonCode'),
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
}
