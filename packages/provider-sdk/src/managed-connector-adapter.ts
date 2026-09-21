import {
  Catalog,
  GetCatalogInput,
  Offering,
  GetOfferingInput,
  SearchCatalogInput,
  ProviderCapability,
  ProviderInfo,
  ProviderStatus,
  ProviderType,
  ProviderEnvironment,
  ProviderCategory,
  ProviderComplianceStatus,
  ProviderOperatingProfile,
  ProviderDiscoveryVisibility,
  AuthMethod,
  HealthCheckResult
} from '@zayuno/contracts';
import { BaseProviderAdapter, ProviderAdapterConfig } from './base-provider';

export interface SyncedProductRecord {
  id: string;
  providerId: string;
  externalShopId: string;
  externalProductId: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  categorySlug?: string | null;
  categoryTitle?: string | null;
  imageUrl?: string | null;
  media?: any;
  basePrice: any; // Decimal or number
  currency: string;
  productUrl: string;
  variants?: any;
  attributes?: any;
  sourceStatus: string;
  isAvailable: boolean;
  isVisible: boolean;
  lastSyncedAt?: Date | string;
}

export type SyncedProductsLoader = () => Promise<SyncedProductRecord[]>;

export class ManagedConnectorAdapter extends BaseProviderAdapter {
  private readonly productsLoader: SyncedProductsLoader;

  constructor(
    config: ProviderAdapterConfig,
    productsLoader: SyncedProductsLoader
  ) {
    super(config, [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH
    ]);
    this.productsLoader = productsLoader;
  }

  override async getProviderInfo(): Promise<ProviderInfo> {
    return {
      id: this.providerSlug,
      slug: this.providerSlug,
      name: this.config.config?.name || this.providerSlug,
      status: ProviderStatus.ACTIVE,
      type: ProviderType.RETAIL,
      environment: ProviderEnvironment.LIVE,
      category: ProviderCategory.RETAIL,
      adapterType: 'managed-connector',
      authMethod: AuthMethod.API_KEY,
      capabilities: this.getCapabilities(),
      geography: ['UZ'],
      isCertified: true,
      isPublished: true,
      contractVersion: 'v1.0.0',
      complianceStatus: ProviderComplianceStatus.COMPLIANT,
      profile: ProviderOperatingProfile.READ_ONLY,
      discoveryVisibility: ProviderDiscoveryVisibility.VISIBLE,
      metadata: {}
    };
  }

  override async checkHealth(): Promise<HealthCheckResult> {
    return {
      status: 'HEALTHY',
      latencyMs: 1,
      timestamp: new Date().toISOString()
    };
  }

  override async getCatalog(input?: GetCatalogInput): Promise<Catalog> {
    this.assertCapability(ProviderCapability.CATALOG);
    const rawProducts = await this.productsLoader();
    const visibleProducts = rawProducts.filter(p => p.isVisible !== false);

    const filtered = input?.categorySlug
      ? visibleProducts.filter(p => p.categorySlug === input.categorySlug)
      : visibleProducts;

    const offerings = filtered.map(p => this.toCanonicalOffering(p));

    const categoriesMap = new Map<string, { id: string; slug: string; title: string; offeringsCount: number }>();
    for (const p of visibleProducts) {
      if (p.categorySlug && p.categoryTitle) {
        const existing = categoriesMap.get(p.categorySlug);
        if (existing) {
          existing.offeringsCount++;
        } else {
          categoriesMap.set(p.categorySlug, {
            id: p.categorySlug,
            slug: p.categorySlug,
            title: p.categoryTitle,
            offeringsCount: 1
          });
        }
      }
    }

    return {
      providerSlug: this.providerSlug,
      locationId: input?.locationId || undefined,
      categories: Array.from(categoriesMap.values()).map(c => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: undefined,
        iconUrl: undefined,
        displayOrder: 0,
        parentCategorySlug: undefined,
        offeringsCount: c.offeringsCount
      })),
      offerings,
      parametersSchema: undefined,
      version: '1.0.0',
      updatedAt: new Date().toISOString()
    };
  }

  override async getOffering(input: GetOfferingInput): Promise<Offering> {
    this.assertCapability(ProviderCapability.CATALOG);
    const rawProducts = await this.productsLoader();
    const target = rawProducts.find(
      p => p.id === input.offeringId ||
           p.externalProductId === input.offeringId ||
           `offering_${p.externalProductId}` === input.offeringId
    );

    if (!target) {
      throw new Error(`Offering with id "${input.offeringId}" not found for provider "${this.providerSlug}".`);
    }

    return this.toCanonicalOffering(target);
  }

  override async searchOfferings(input: SearchCatalogInput | string): Promise<Offering[]> {
    this.assertCapability(ProviderCapability.SEARCH);
    const rawProducts = await this.productsLoader();
    const visibleProducts = rawProducts.filter(p => p.isVisible !== false);

    const queryStr = typeof input === 'string' ? input : (input?.query || '');
    const categorySlug = typeof input === 'string' ? undefined : input?.categorySlug;
    const limit = typeof input === 'string' ? 20 : (input?.limit || 20);
    const rawQuery = queryStr.trim();
    const normalizedQuery = this.normalizeSearchText(rawQuery);

    let results = visibleProducts;

    if (categorySlug) {
      results = results.filter(p => p.categorySlug === categorySlug);
    }

    if (normalizedQuery) {
      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
      results = results.filter(p => {
        const targetText = this.normalizeSearchText([
          p.title,
          p.description || '',
          p.brand || '',
          p.categoryTitle || ''
        ].join(' '));

        return queryTokens.every(token => targetText.includes(token));
      });
    }

    return results.slice(0, limit).map(p => this.toCanonicalOffering(p));
  }

  private normalizeSearchText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\u02BB\u02BC\u02BD\u02BE\u2018\u2019'`\u00B4]/g, '') // Normalize Uzbek apostrophes, turned comma, backtick
      .replace(/[\s\-_]+/g, ' ')
      .trim();
  }

  private toCanonicalOffering(p: SyncedProductRecord): Offering {
    const rawVariants = Array.isArray(p.variants) ? p.variants : [];
    const variants = rawVariants.map((v: any, idx: number) => ({
      id: String(v.id || idx),
      name: String(v.name || 'Standard'),
      sku: v.sku ? String(v.sku) : undefined,
      basePrice: Number(v.basePrice ?? p.basePrice),
      isAvailable: Boolean(v.isAvailable !== false),
      metadata: v.metadata || {}
    }));

    const rawMedia = Array.isArray(p.media) ? p.media : [];
    const media = rawMedia.map((m: any, idx: number) => ({
      url: m.url,
      altText: m.altText || undefined,
      order: m.order ?? idx,
      thumbnailUrl: m.thumbnailUrl || undefined,
      aspectRatio: m.aspectRatio || undefined
    }));

    const basePriceNum = typeof p.basePrice === 'number'
      ? p.basePrice
      : Number(p.basePrice?.toString?.() || 0);

    return {
      id: p.id || `offering_${p.externalProductId}`,
      providerId: p.providerId || this.providerSlug,
      offeringCode: p.externalProductId,
      title: p.title,
      description: p.description || undefined,
      categorySlug: p.categorySlug || undefined,
      categoryTitle: p.categoryTitle || undefined,
      imageUrl: p.imageUrl || undefined,
      media,
      basePrice: basePriceNum,
      currency: (p.currency as any) || 'UZS',
      isAvailable: Boolean(p.isAvailable),
      variants,
      optionGroups: [],
      tags: p.brand ? [p.brand] : [],
      parametersSchema: undefined,
      metadata: {
        ...(p.attributes || {}),
        externalShopId: p.externalShopId,
        externalProductId: p.externalProductId,
        productUrl: p.productUrl,
        lastSyncedAt: p.lastSyncedAt ? new Date(p.lastSyncedAt).toISOString() : undefined
      }
    };
  }
}
