import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProvidersService } from '../providers/providers.service';
import { RedisService } from '../../common/services/redis.service';
import { Catalog, Offering, AvailabilityResult, CheckAvailabilityInput, ProviderCapability } from '@zayuno/contracts';
import { findForbiddenParameterKey } from '../../common/sensitive-parameters';

type CacheEnvelope<T> = {
  version: 1;
  value: T;
  cachedAt: number;
  freshUntil: number;
  staleUntil: number;
};

type CachePolicy<T> = {
  freshSeconds: number;
  staleSeconds: number;
  isNegative?: (value: T) => boolean;
};

const CATALOG_CACHE_POLICY: CachePolicy<Catalog> = {
  freshSeconds: 30 * 60,
  staleSeconds: 30 * 60
};

const SEARCH_CACHE_POLICY: CachePolicy<Offering[]> = {
  freshSeconds: 30 * 60,
  staleSeconds: 30 * 60,
  isNegative: (value) => value.length === 0
};

const OFFERING_CACHE_POLICY: CachePolicy<Offering> = {
  freshSeconds: 10 * 60,
  staleSeconds: 5 * 60
};

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private registry: ProviderRegistryService,
    private providersService: ProvidersService,
    private redisService: RedisService
  ) {}

  async getCatalog(providerSlug: string, locationId?: string, categorySlug?: string, parameters?: Record<string, any>): Promise<Catalog> {
    if (!providerSlug) {
      throw new BadRequestException('providerSlug is required to fetch catalog.');
    }
    this.assertSafeParameters(parameters);

    const cleanSlug = providerSlug.toLowerCase().trim();
    await this.providersService.assertProviderPublished(cleanSlug);
    const cacheKey = this.cacheKey(cleanSlug, 'catalog', {
      locationId: locationId || null,
      categorySlug: categorySlug || null,
      parameters: parameters || null
    });

    return this.readThroughCache(cacheKey, CATALOG_CACHE_POLICY, async () => {
      const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.CATALOG);
      if (!adapter.getCatalog) {
        throw new BadRequestException(`Provider "${cleanSlug}" does not implement getCatalog.`);
      }
      return adapter.getCatalog({
        providerSlug: cleanSlug,
        locationId,
        categorySlug,
        parameters
      });
    });
  }

  async getOffering(providerSlug: string, offeringId: string, locationId?: string, parameters?: Record<string, any>): Promise<Offering> {
    if (!providerSlug) {
      throw new BadRequestException('providerSlug is required to fetch offering.');
    }
    if (!offeringId) {
      throw new BadRequestException('offeringId is required.');
    }
    this.assertSafeParameters(parameters);

    const cleanSlug = providerSlug.toLowerCase().trim();
    await this.providersService.assertProviderPublished(cleanSlug);
    const cacheKey = this.cacheKey(cleanSlug, 'offering', {
      offeringId,
      locationId: locationId || null,
      parameters: parameters || null
    });

    return this.readThroughCache(cacheKey, OFFERING_CACHE_POLICY, async () => {
      const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.CATALOG);
      if (!adapter.getOffering) {
        throw new BadRequestException(`Provider "${cleanSlug}" does not implement getOffering.`);
      }
      return adapter.getOffering({
        providerSlug: cleanSlug,
        offeringId,
        locationId,
        parameters
      });
    });
  }

  async searchOfferings(providerSlug: string, query: string, categorySlug?: string, locationId?: string, limit = 20, parameters?: Record<string, any>): Promise<Offering[]> {
    if (!providerSlug) {
      throw new BadRequestException('providerSlug is required to search catalog. No default provider fallback is permitted.');
    }
    this.assertSafeParameters(parameters);

    const cleanSlug = providerSlug.toLowerCase().trim();
    await this.providersService.assertProviderPublished(cleanSlug);
    const normalizedQuery = String(query || '')
      .trim()
      .toLowerCase();
    const cacheKey = this.cacheKey(cleanSlug, 'search', {
      query: normalizedQuery,
      categorySlug: categorySlug || null,
      locationId: locationId || null,
      limit,
      parameters: parameters || null
    });

    return this.readThroughCache(cacheKey, SEARCH_CACHE_POLICY, async () => {
      const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.SEARCH);
      if (!adapter.searchOfferings) {
        throw new BadRequestException(`Provider "${cleanSlug}" does not implement searchOfferings.`);
      }
      return adapter.searchOfferings({
        providerSlug: cleanSlug,
        query: normalizedQuery,
        categorySlug,
        locationId,
        limit,
        parameters
      });
    });
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    if (!input.providerSlug) {
      throw new BadRequestException('providerSlug is required.');
    }
    this.assertSafeParameters(input.parameters);

    const cleanSlug = input.providerSlug.toLowerCase().trim();
    await this.providersService.assertProviderPublished(cleanSlug);
    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.CATALOG);
    if (adapter.checkAvailability) {
      return adapter.checkAvailability(input);
    }
    return {
      isAvailable: true,
      unavailableItems: [],
      availableItems: input.items.map((item) => ({
        offeringId: item.offeringId,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        metadata: {}
      })),
      parameters: input.parameters || {}
    };
  }

  async invalidateProviderCache(providerSlug: string): Promise<number> {
    const cleanSlug = providerSlug.toLowerCase().trim();
    if (!cleanSlug) return 0;
    return this.redisService.delByPattern(`provider-data:v1:${cleanSlug}:*`);
  }

  private cacheKey(providerSlug: string, operation: string, input: unknown): string {
    const serialized = JSON.stringify(this.sortValue(input));
    const digest = createHash('sha256').update(serialized).digest('hex').slice(0, 24);
    return `provider-data:v1:${providerSlug}:${operation}:${digest}`;
  }

  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.sortValue(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.sortValue(item)])
      );
    }
    return value;
  }

  private async readThroughCache<T>(key: string, policy: CachePolicy<T>, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = await this.readEnvelope<T>(key);

    if (cached && cached.freshUntil > now) return cached.value;

    if (cached && cached.staleUntil > now) {
      const acquired = await this.redisService.acquireLock(key, 15);
      if (acquired) {
        void this.refreshCache(key, policy, fetcher)
          .catch(() => undefined)
          .finally(() => this.redisService.releaseLock(key));
      }
      return cached.value;
    }

    const acquired = await this.redisService.acquireLock(key, 15);
    if (!acquired) {
      const filled = await this.waitForCache<T>(key, 1_500);
      if (filled) return filled.value;
    }

    try {
      return await this.refreshCache(key, policy, fetcher);
    } finally {
      if (acquired) await this.redisService.releaseLock(key);
    }
  }

  private async refreshCache<T>(key: string, policy: CachePolicy<T>, fetcher: () => Promise<T>): Promise<T> {
    try {
      const value = await fetcher();
      const negative = policy.isNegative?.(value) === true;
      const freshSeconds = negative ? 2 * 60 : policy.freshSeconds;
      const staleSeconds = negative ? 3 * 60 : policy.staleSeconds;
      const cachedAt = Date.now();
      const envelope: CacheEnvelope<T> = {
        version: 1,
        value,
        cachedAt,
        freshUntil: cachedAt + freshSeconds * 1_000,
        staleUntil: cachedAt + (freshSeconds + staleSeconds) * 1_000
      };
      await this.redisService.set(key, JSON.stringify(envelope), freshSeconds + staleSeconds);
      return value;
    } catch (error) {
      this.logger.warn(`Provider cache refresh failed for ${key}: ${String(error)}`);
      throw error;
    }
  }

  private async readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
    const raw = await this.redisService.get(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (parsed?.version !== 1 || typeof parsed.freshUntil !== 'number' || typeof parsed.staleUntil !== 'number' || !('value' in parsed)) {
        await this.redisService.del(key);
        return null;
      }
      return parsed;
    } catch {
      await this.redisService.del(key);
      return null;
    }
  }

  private async waitForCache<T>(key: string, timeoutMs: number): Promise<CacheEnvelope<T> | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cached = await this.readEnvelope<T>(key);
      if (cached) return cached;
    }
    return null;
  }

  private assertSafeParameters(parameters?: Record<string, any>): void {
    const forbiddenKey = findForbiddenParameterKey(parameters);
    if (forbiddenKey) {
      throw new BadRequestException(`Sensitive identity or payment field "${forbiddenKey}" is not allowed in dynamic parameters. Use the provider-owned secure handoff.`);
    }
  }
}
