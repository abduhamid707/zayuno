import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProvidersService } from '../providers/providers.service';
import { RedisService } from '../../common/services/redis.service';
import {
  Catalog,
  Offering,
  AvailabilityResult,
  CheckAvailabilityInput,
  ProviderCapability
} from '@zayuno/contracts';
import { findForbiddenParameterKey } from '../../common/sensitive-parameters';

@Injectable()
export class CatalogService {
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
    const cacheKey = `catalog:${cleanSlug}:${locationId || 'default'}:${categorySlug || 'all'}`;
    const cached = parameters ? null : await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.CATALOG);
    if (!adapter.getCatalog) {
      throw new BadRequestException(`Provider "${cleanSlug}" does not implement getCatalog.`);
    }

    const catalog = await adapter.getCatalog({ providerSlug: cleanSlug, locationId, categorySlug, parameters });

    // Cache catalog in Redis for 5 minutes (300s)
    if (!parameters) await this.redisService.set(cacheKey, JSON.stringify(catalog), 300);

    return catalog;
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
  }

  async searchOfferings(
    providerSlug: string,
    query: string,
    categorySlug?: string,
    locationId?: string,
    limit = 20,
    parameters?: Record<string, any>
  ): Promise<Offering[]> {
    if (!providerSlug) {
      throw new BadRequestException('providerSlug is required to search catalog. No default provider fallback is permitted.');
    }
    this.assertSafeParameters(parameters);

    const cleanSlug = providerSlug.toLowerCase().trim();
    await this.providersService.assertProviderPublished(cleanSlug);
    const adapter = await this.registry.assertAndGetCapability(cleanSlug, ProviderCapability.SEARCH);
    if (!adapter.searchOfferings) {
      throw new BadRequestException(`Provider "${cleanSlug}" does not implement searchOfferings.`);
    }

    return adapter.searchOfferings({
      providerSlug: cleanSlug,
      query: query || '',
      categorySlug,
      locationId,
      limit,
      parameters
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
      availableItems: input.items.map(item => ({
        offeringId: item.offeringId,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        metadata: {}
      })),
      parameters: input.parameters || {}
    };
  }

  private assertSafeParameters(parameters?: Record<string, any>): void {
    const forbiddenKey = findForbiddenParameterKey(parameters);
    if (forbiddenKey) {
      throw new BadRequestException(`Sensitive identity or payment field "${forbiddenKey}" is not allowed in dynamic parameters. Use the provider-owned secure handoff.`);
    }
  }
}
