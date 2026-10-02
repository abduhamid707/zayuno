import {
  ProviderCapability,
  ProviderInfo,
  ProviderFulfillmentMode,
  HealthCheckResult,
  Location,
  GetLocationsInput,
  Catalog,
  GetCatalogInput,
  Offering,
  GetOfferingInput,
  SearchCatalogInput,
  CheckAvailabilityInput,
  AvailabilityResult,
  AvailabilityStatus,
  RequestQuoteInput,
  NormalizedQuote,
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionResult,
  ActionStatus,
  PaymentStatus,
  QuoteLine,
  Currency,
  RequestQuoteInputSchema,
  CreateActionInputSchema,
  GetActionInputSchema,
  CancelActionInputSchema,
  ProviderStatus,
  ProviderType,
  ProviderEnvironment,
  ProviderCategory,
  AuthMethod,
  ProviderComplianceStatus,
  ProviderOperatingProfile,
  ProviderDiscoveryVisibility
} from '@zayuno/contracts';
import { BaseProviderAdapter, ProviderAdapterConfig } from '../../base-provider';
import { ResourceUnavailableError, QuoteExpiredError, ProviderError } from '../../errors';
import { NotFoundError } from '@zayuno/shared';
import crypto from 'node:crypto';
import { IikoClient } from './iiko-client';
import {
  IikoCredentials,
  IikoProduct,
  IikoSize,
  mapIikoDeliveryStatusToActionStatus,
  IikoCreateOrderRequest,
  IikoOrderItem,
  IikoDeliveryAddress,
  IikoOrderInfo
} from './iiko-types';

export class IikoProviderAdapter extends BaseProviderAdapter {
  private client: IikoClient;
  private defaultOrganizationId?: string;
  private defaultTerminalGroupId?: string;
  private externalMenuId?: string;

  constructor(config: ProviderAdapterConfig, clientOverride?: IikoClient) {
    const capabilities = [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL
    ];

    super(config, capabilities);

    const credentials = this.extractCredentials(config);
    this.defaultOrganizationId = config.config?.organizationId || config.metadata?.organizationId;
    this.defaultTerminalGroupId = config.config?.terminalGroupId || config.metadata?.terminalGroupId;
    this.externalMenuId = config.config?.externalMenuId || config.metadata?.externalMenuId;

    this.client =
      clientOverride ||
      new IikoClient({
        baseUrl: config.baseUrl || 'https://api-ru.iiko.services',
        providerSlug: this.providerSlug,
        credentials,
        timeoutMs: config.timeoutMs ?? 15000
      });
  }

  getClient(): IikoClient {
    return this.client;
  }

  private extractCredentials(config: ProviderAdapterConfig): IikoCredentials {
    let secret = config.secret || '';
    if (secret.startsWith('{') && secret.endsWith('}')) {
      try {
        const parsed = JSON.parse(secret);
        return {
          appId: parsed.appId,
          clientSecret: parsed.clientSecret,
          apiKey: parsed.apiKey,
          apiLogin: parsed.apiLogin
        };
      } catch {
        // Fallback to raw string
      }
    }

    return {
      appId: config.config?.appId,
      clientSecret: config.config?.clientSecret,
      apiKey: config.config?.apiKey || secret || undefined,
      apiLogin: config.config?.apiLogin || secret || undefined
    };
  }

  async getProviderInfo(): Promise<ProviderInfo> {
    this.assertCapability(ProviderCapability.METADATA);
    return {
      id: this.providerSlug,
      slug: this.providerSlug,
      name: this.config.metadata?.name || 'iikoCloud Restaurant',
      description: this.config.metadata?.description || 'iikoCloud POS & Delivery Integration',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY,
      environment: ProviderEnvironment.LIVE,
      fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
      category: ProviderCategory.FOOD_AND_DRINK,
      geography: ['UZ'],
      adapterType: 'iiko',
      authMethod: AuthMethod.API_KEY,
      capabilities: this.getCapabilities(),
      isCertified: true,
      isPublished: true,
      contractVersion: 'v1',
      complianceStatus: ProviderComplianceStatus.COMPLIANT,
      profile: ProviderOperatingProfile.TRANSACTIONAL,
      discoveryVisibility: ProviderDiscoveryVisibility.VISIBLE,
      metadata: {},
      supportContact: this.config.metadata?.supportContact || {
        phone: '+998712000000',
        telegram: '@zayunosupport'
      }
    };
  }

  async checkHealth(): Promise<HealthCheckResult> {
    this.assertCapability(ProviderCapability.HEALTH);
    const start = Date.now();
    try {
      if (this.defaultTerminalGroupId) {
        const statuses = await this.client.checkTerminalGroupsAlive(
          [this.defaultTerminalGroupId],
          this.defaultOrganizationId ? [this.defaultOrganizationId] : undefined
        );
        const alive = statuses.find((s) => s.terminalGroupId === this.defaultTerminalGroupId);
        const latencyMs = Date.now() - start;
        if (alive && !alive.isAlive) {
          return {
            status: 'DEGRADED',
            latencyMs,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        await this.client.getOrganizations();
      }
      return {
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getLocations(input?: GetLocationsInput): Promise<Location[]> {
    this.assertCapability(ProviderCapability.LOCATIONS);
    const orgs = await this.client.getOrganizations();
    if (!orgs || orgs.length === 0) return [];

    const orgIds = orgs.map((o) => o.id);
    const terminalGroups = await this.client.getTerminalGroups(orgIds);

    const locations: Location[] = [];
    for (const tg of terminalGroups) {
      const org = orgs.find((o) => o.id === tg.organizationId);
      locations.push({
        id: tg.id,
        providerId: this.providerSlug,
        providerLocationId: tg.id,
        name: org ? `${org.name} (${tg.name})` : tg.name,
        address: tg.address || org?.name || 'Tashkent, Uzbekistan',
        isActive: true,
        serviceRadiusKm: 10.0,
        metadata: {
          organizationId: tg.organizationId,
          terminalGroupId: tg.id,
          timeZone: tg.timeZone
        }
      });
    }

    if (input?.activeOnly) {
      return locations.filter((l) => l.isActive);
    }
    return locations;
  }

  private async resolveOrganizationId(locationId?: string | null): Promise<string> {
    if (this.defaultOrganizationId) {
      return this.defaultOrganizationId;
    }
    if (locationId) {
      const locations = await this.getLocations();
      const loc = locations.find((l) => l.id === locationId || l.providerLocationId === locationId);
      if (loc?.metadata?.organizationId) {
        return loc.metadata.organizationId;
      }
    }
    const orgs = await this.client.getOrganizations();
    if (orgs.length > 0) {
      return orgs[0].id;
    }
    throw new ProviderError(
      'Could not resolve an active iiko organization ID.',
      404,
      'ORGANIZATION_NOT_FOUND',
      { providerSlug: this.providerSlug }
    );
  }

  private async resolveTerminalGroupId(organizationId: string, locationId?: string | null): Promise<string> {
    if (locationId) {
      return locationId;
    }
    if (this.defaultTerminalGroupId) {
      return this.defaultTerminalGroupId;
    }
    const terminalGroups = await this.client.getTerminalGroups([organizationId]);
    if (terminalGroups.length > 0) {
      return terminalGroups[0].id;
    }
    throw new ProviderError(
      `No active terminal groups found for iiko organization ${organizationId}.`,
      404,
      'TERMINAL_GROUP_NOT_FOUND',
      { providerSlug: this.providerSlug, organizationId }
    );
  }

  private async resolveCurrency(organizationId?: string): Promise<Currency> {
    const configuredCurrency = (this.config.config?.currency || this.config.metadata?.currency) as Currency | undefined;
    if (configuredCurrency) {
      const upperConfig = String(configuredCurrency).toUpperCase();
      if (['UZS', 'USD', 'EUR', 'RUB'].includes(upperConfig)) {
        return upperConfig as Currency;
      }
      throw new ProviderError(
        `Configured currency "${configuredCurrency}" is not supported. Supported: UZS, USD, EUR, RUB.`,
        400,
        'UNSUPPORTED_CURRENCY',
        { providerSlug: this.providerSlug, currency: configuredCurrency }
      );
    }

    if (organizationId) {
      const orgs = await this.client.getOrganizations();
      const org = orgs.find((o) => o.id === organizationId);
      if (org?.currencyIsoName) {
        const upper = org.currencyIsoName.toUpperCase();
        if (['UZS', 'USD', 'EUR', 'RUB'].includes(upper)) {
          return upper as Currency;
        }
        throw new ProviderError(
          `Organization ${organizationId} currency "${org.currencyIsoName}" is not supported. Supported: UZS, USD, EUR, RUB.`,
          400,
          'UNSUPPORTED_CURRENCY',
          { providerSlug: this.providerSlug, organizationId, currency: org.currencyIsoName }
        );
      }
    }

    throw new ProviderError(
      `Could not determine currency for iiko organization "${organizationId || 'unknown'}". Currency must be configured or specified by organization.`,
      400,
      'UNKNOWN_CURRENCY',
      { providerSlug: this.providerSlug, organizationId }
    );
  }

  /**
   * Fetches nomenclature and active stop lists, mapping them to Zayuno Catalog.
   */
  async getCatalog(input: GetCatalogInput): Promise<Catalog> {
    this.assertCapability(ProviderCapability.CATALOG);
    const orgId = await this.resolveOrganizationId(input.locationId);
    const currency = await this.resolveCurrency(orgId);

    const [nomenclature, stopListsData] = await Promise.all([
      this.externalMenuId
        ? this.client.getExternalMenuNomenclature(orgId, this.externalMenuId)
        : this.client.getNomenclature(orgId),
      this.client.getStopLists([orgId])
    ]);

    // Build stop list set: productId -> { isStopped: boolean, stoppedSizes: Set<string> }
    const stopMap = new Map<string, { isStopped: boolean; stoppedSizes: Set<string> }>();
    if (stopListsData?.terminalGroupStopLists) {
      for (const orgStop of stopListsData.terminalGroupStopLists) {
        for (const tgStop of orgStop.items || []) {
          for (const item of tgStop.items || []) {
            if (item.balance <= 0) {
              const existing = stopMap.get(item.productId) || { isStopped: false, stoppedSizes: new Set<string>() };
              if (!item.sizeId) {
                existing.isStopped = true;
              } else {
                existing.stoppedSizes.add(item.sizeId);
              }
              stopMap.set(item.productId, existing);
            }
          }
        }
      }
    }

    const sizeMap = new Map<string, IikoSize>();
    if (nomenclature.sizes) {
      for (const s of nomenclature.sizes) {
        sizeMap.set(s.id, s);
      }
    }

    // Map categories
    const categories = (nomenclature.groups || [])
      .filter((g) => !g.isDeleted)
      .map((g, index) => ({
        id: g.id,
        slug: (g.name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: g.name,
        description: g.description || undefined,
        iconUrl: undefined,
        displayOrder: index,
        parentCategorySlug: undefined,
        offeringsCount: 0
      }));

    // Map offerings
    const offerings: Offering[] = [];
    for (const p of nomenclature.products || []) {
      if (p.isDeleted || p.type === 'modifier') continue;

      const stopInfo = stopMap.get(p.id);
      const isProductStopped = stopInfo?.isStopped ?? false;

      // Map size variants
      const variants: any[] = [];
      let minPrice = Infinity;

      if (p.sizePrices && p.sizePrices.length > 0) {
        for (const sp of p.sizePrices) {
          const currentPrice = sp.price?.currentPrice ?? 0;
          const isPriceValid = currentPrice > 0;
          const sizeObj = sp.sizeId ? sizeMap.get(sp.sizeId) : null;
          const sizeName = sizeObj?.name || 'Standard';
          const isSizeStopped = sp.sizeId ? stopInfo?.stoppedSizes.has(sp.sizeId) : false;
          const isVariantAvailable = !isProductStopped && !isSizeStopped && (sp.price?.isIncludedInMenu ?? true) && isPriceValid;

          // Strictly select minPrice from available variants only
          if (isVariantAvailable && currentPrice < minPrice) {
            minPrice = currentPrice;
          }

          variants.push({
            id: sp.sizeId || p.id,
            name: sizeName,
            sku: p.code || undefined,
            basePrice: currentPrice,
            isAvailable: isVariantAvailable,
            metadata: { sizeId: sp.sizeId }
          });
        }
      }

      const hasValidPrice = minPrice !== Infinity && minPrice > 0;
      const effectiveBasePrice = hasValidPrice ? minPrice : 0;

      // Map group modifiers to OptionGroups
      const optionGroups: any[] = [];
      if (p.groupModifiers && p.groupModifiers.length > 0) {
        for (const gm of p.groupModifiers) {
          const options = (gm.childModifiers || []).map((cm) => {
            const childProduct = (nomenclature.products || []).find((cp) => cp.id === cm.id);
            const childPrice = childProduct?.sizePrices?.[0]?.price?.currentPrice ?? 0;
            return {
              id: cm.id,
              name: childProduct?.name || 'Option',
              description: undefined,
              priceDelta: childPrice,
              isDefault: (cm.defaultAmount ?? 0) > 0,
              isAvailable: true,
              metadata: { defaultAmount: cm.defaultAmount, freeOfChargeAmount: cm.freeOfChargeAmount }
            };
          });

          optionGroups.push({
            id: gm.id,
            name: (nomenclature.products || []).find((cp) => cp.id === gm.id)?.name || 'Modifiers',
            description: undefined,
            minSelections: gm.minAmount ?? 0,
            maxSelections: gm.maxAmount ?? 1,
            isRequired: gm.required ?? false,
            options
          });
        }
      }

      // Check image links - ensure safe HTTPS
      let safeImageUrl: string | undefined = undefined;
      if (p.imageLinks && p.imageLinks.length > 0) {
        const first = p.imageLinks[0];
        if (first && first.startsWith('https://')) {
          safeImageUrl = first;
        }
      }

      const category = categories.find((c) => c.id === p.groupId);

      offerings.push({
        id: p.id,
        providerId: this.providerSlug,
        offeringCode: p.code || p.id,
        title: p.name,
        description: p.description || undefined,
        categorySlug: category?.slug || undefined,
        categoryTitle: category?.title || undefined,
        imageUrl: safeImageUrl,
        media: safeImageUrl ? [{ url: safeImageUrl, altText: p.name, order: 0 }] : [],
        basePrice: effectiveBasePrice,
        currency,
        isAvailable: !isProductStopped && hasValidPrice && (variants.length === 0 ? false : variants.some((v) => v.isAvailable)),
        variants,
        optionGroups,
        tags: p.tags || [],
        parametersSchema: undefined,
        metadata: {
          iikoProductId: p.id,
          orderItemType: p.orderItemType,
          splittable: (p as any).splittable
        }
      });
    }

    return {
      providerSlug: this.providerSlug,
      locationId: input.locationId || undefined,
      categories,
      offerings,
      parametersSchema: undefined,
      version: nomenclature.revision ? String(nomenclature.revision) : undefined
    };
  }

  async getOffering(input: GetOfferingInput): Promise<Offering> {
    this.assertCapability(ProviderCapability.CATALOG);
    const catalog = await this.getCatalog({ providerSlug: this.providerSlug, locationId: input.locationId });
    const offering = catalog.offerings.find((o) => o.id === input.offeringId || o.offeringCode === input.offeringId);
    if (!offering) {
      throw new NotFoundError('Offering', input.offeringId);
    }
    return offering;
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    this.assertCapability(ProviderCapability.CATALOG);
    const orgId = await this.resolveOrganizationId(input.locationId);
    const [nomenclature, stopListsData] = await Promise.all([
      this.externalMenuId
        ? this.client.getExternalMenuNomenclature(orgId, this.externalMenuId)
        : this.client.getNomenclature(orgId),
      this.client.getStopLists([orgId])
    ]);

    const productsMap = new Map<string, IikoProduct>();
    for (const p of nomenclature.products || []) {
      if (!p.isDeleted && p.type !== 'modifier') {
        productsMap.set(p.id, p);
      }
    }

    const stoppedProducts = new Set<string>();
    const stoppedSizes = new Set<string>();

    if (stopListsData?.terminalGroupStopLists) {
      for (const orgStop of stopListsData.terminalGroupStopLists) {
        for (const tgStop of orgStop.items || []) {
          for (const item of tgStop.items || []) {
            if (item.balance <= 0) {
              if (!item.sizeId) {
                stoppedProducts.add(item.productId);
              } else {
                stoppedSizes.add(`${item.productId}:${item.sizeId}`);
              }
            }
          }
        }
      }
    }

    const availableItems: Array<{ offeringId: string; metadata: Record<string, any> }> = [];
    const unavailableItems: Array<{ offeringId: string; reason: string }> = [];

    for (const item of input.items || []) {
      const product = productsMap.get(item.offeringId);
      if (!product) {
        unavailableItems.push({ offeringId: item.offeringId, reason: 'Product not found in iiko menu' });
        continue;
      }

      if (stoppedProducts.has(item.offeringId)) {
        unavailableItems.push({ offeringId: item.offeringId, reason: 'Out of stock in iiko' });
        continue;
      }

      if (item.variantId) {
        if (stoppedSizes.has(`${item.offeringId}:${item.variantId}`)) {
          unavailableItems.push({ offeringId: item.offeringId, reason: `Variant "${item.variantId}" is out of stock in iiko` });
          continue;
        }

        const sp = (product.sizePrices || []).find((s: any) => (s.sizeId || product.id) === item.variantId);
        if (!sp) {
          unavailableItems.push({ offeringId: item.offeringId, reason: `Variant "${item.variantId}" not found for product in iiko` });
          continue;
        }
        if (sp.price?.isIncludedInMenu === false) {
          unavailableItems.push({ offeringId: item.offeringId, reason: `Variant "${item.variantId}" is not included in menu` });
          continue;
        }
        if ((sp.price?.currentPrice ?? 0) <= 0) {
          unavailableItems.push({ offeringId: item.offeringId, reason: `Variant "${item.variantId}" has invalid price` });
          continue;
        }
      } else {
        const hasAvailableVariant = (product.sizePrices || []).some((sp: any) => {
          const sizeStopped = sp.sizeId ? stoppedSizes.has(`${item.offeringId}:${sp.sizeId}`) : false;
          const price = sp.price?.currentPrice ?? 0;
          return !sizeStopped && (sp.price?.isIncludedInMenu ?? true) && price > 0;
        });
        if (!hasAvailableVariant) {
          unavailableItems.push({ offeringId: item.offeringId, reason: 'No available variants in iiko menu' });
          continue;
        }
      }

      availableItems.push({ offeringId: item.offeringId, metadata: {} });
    }

    const isAvailable = unavailableItems.length === 0;
    return {
      availabilityStatus: isAvailable ? AvailabilityStatus.AVAILABLE : AvailabilityStatus.UNAVAILABLE,
      isAvailable,
      availableItems,
      unavailableItems,
      checkedAt: new Date().toISOString(),
      parameters: input.parameters || {}
    };
  }

  async searchOfferings(input: SearchCatalogInput): Promise<Offering[]> {
    this.assertCapability(ProviderCapability.SEARCH);
    const catalog = await this.getCatalog({
      providerSlug: this.providerSlug,
      locationId: input.locationId,
      categorySlug: input.categorySlug
    });
    const q = (input.query || '').toLowerCase().trim();

    return catalog.offerings.filter((o) => {
      const matchTitle = o.title.toLowerCase().includes(q);
      const matchDesc = (o.description || '').toLowerCase().includes(q);
      const matchTag = (o.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchTag;
    });
  }

  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
    this.assertCapability(ProviderCapability.QUOTE);
    const canonicalInput = RequestQuoteInputSchema.parse(input);
    const orgId = await this.resolveOrganizationId(canonicalInput.locationId);
    const currency = await this.resolveCurrency(orgId);

    const catalog = await this.getCatalog({
      providerSlug: this.providerSlug,
      locationId: canonicalInput.locationId || undefined
    });

    const lines: QuoteLine[] = [];
    let subtotal = 0;

    for (const reqItem of canonicalInput.items) {
      const offering = catalog.offerings.find((o) => o.id === reqItem.offeringId);
      if (!offering) {
        throw new ResourceUnavailableError(`Offering "${reqItem.offeringId}" not found in iiko menu.`);
      }

      let unitPrice = offering.basePrice;
      let variantTitle: string | undefined = undefined;

      if (reqItem.variantId) {
        const variant = offering.variants?.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          throw new ResourceUnavailableError(`Variant "${reqItem.variantId}" not found for "${offering.title}".`);
        }
        if (!variant.isAvailable) {
          throw new ResourceUnavailableError(`Variant "${variant.name}" of "${offering.title}" is out of stock.`);
        }
        unitPrice = variant.basePrice;
        variantTitle = variant.name;
      } else if (!offering.isAvailable) {
        throw new ResourceUnavailableError(`Offering "${offering.title}" is currently out of stock.`);
      }

      // Calculate modifier options total with strict validation
      let optionsTotal = 0;
      for (const selOpt of reqItem.selectedOptions || []) {
        const group = offering.optionGroups?.find((g) => g.id === selOpt.groupId);
        if (!group) {
          throw new ResourceUnavailableError(
            `Option group "${selOpt.groupId}" not found for "${offering.title}".`
          );
        }
        const option = group.options?.find((opt) => opt.id === selOpt.optionId);
        if (!option) {
          throw new ResourceUnavailableError(
            `Option "${selOpt.optionId}" not found in group "${group.name || group.id}" for "${offering.title}".`
          );
        }
        if (!option.isAvailable) {
          throw new ResourceUnavailableError(
            `Option "${option.name}" of "${offering.title}" is currently out of stock.`
          );
        }
        const priceDelta = option.priceDelta ?? 0;
        const optQty = selOpt.quantity ?? 1;
        optionsTotal += priceDelta * optQty;
      }

      const lineTotal = (unitPrice + optionsTotal) * reqItem.quantity;
      subtotal += lineTotal;

      lines.push({
        offeringId: offering.id,
        offeringTitle: offering.title,
        variantId: reqItem.variantId || undefined,
        variantTitle,
        unitPrice,
        quantity: reqItem.quantity,
        optionsTotal,
        lineTotal,
        selectedOptions: (reqItem.selectedOptions || []).map((so) => ({
          groupId: so.groupId,
          optionId: so.optionId,
          quantity: so.quantity ?? 1
        }))
      });
    }

    // Calculate delivery fee: strictly default to 0 if not provided or configured
    const deliveryFee = Number(canonicalInput.parameters?.deliveryFee ?? this.config.config?.deliveryFee ?? 0);
    const fees = deliveryFee > 0 ? [{ name: 'Delivery Fee', amount: deliveryFee }] : [];
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const total = subtotal + totalFees;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      id: `ZY-QT-IIKO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      providerSlug: this.providerSlug,
      locationId: canonicalInput.locationId || undefined,
      lines,
      subtotal,
      fees,
      totalFees,
      discounts: [],
      totalDiscount: 0,
      total,
      currency,
      expiresAt,
      estimatedDurationMinutes: 40,
      parameters: {
        organizationId: orgId,
        fulfillmentType: canonicalInput.fulfillmentType || 'STANDARD'
      }
    };
  }

  async createAction(input: CreateActionInput): Promise<NormalizedAction> {
    this.assertCapability(ProviderCapability.ACTION_CREATE);
    const canonicalInput = CreateActionInputSchema.parse(input);

    // Enforce Approval Gate
    if (canonicalInput.userConfirmed !== true) {
      throw new ProviderError(
        'Action creation requires explicit user confirmation (userConfirmed: true).',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    const quote = canonicalInput.quote;
    if (!quote) {
      throw new ProviderError('Quote is required to create an action.', 400, 'QUOTE_REQUIRED');
    }

    const orgId = await this.resolveOrganizationId(canonicalInput.locationId);
    const tgId = await this.resolveTerminalGroupId(orgId, canonicalInput.locationId);

    // Build iiko OrderItems
    const items: IikoOrderItem[] = quote.lines.map((line) => {
      const modifiers = (line.selectedOptions || []).map((opt) => ({
        productId: opt.optionId,
        amount: opt.quantity,
        productGroupId: opt.groupId,
        positionId: crypto.randomUUID()
      }));

      return {
        type: 'Product',
        productId: line.offeringId,
        productSizeId: line.variantId || undefined,
        amount: line.quantity,
        price: line.unitPrice,
        positionId: crypto.randomUUID(),
        modifiers: modifiers.length > 0 ? modifiers : undefined
      };
    });

    const customerPhone = canonicalInput.customer?.phone?.trim();
    if (!customerPhone) {
      throw new ProviderError(
        'Customer phone number is required to create a delivery order in iiko.',
        400,
        'INVALID_CUSTOMER_PHONE',
        { providerSlug: this.providerSlug }
      );
    }

    const destination = canonicalInput.destination;
    const destAny = ((input as any).destination || destination) as any;
    const rawDestination = destination?.raw?.trim() || destAny?.street?.trim() || destination?.city?.trim();
    if (!destination || !rawDestination) {
      throw new ProviderError(
        'Delivery destination address is required to create a delivery order in iiko.',
        400,
        'INVALID_DESTINATION_ADDRESS',
        { providerSlug: this.providerSlug }
      );
    }

    let deliveryAddress: IikoDeliveryAddress;
    const houseNumber = (destAny?.house || canonicalInput.parameters?.house)
      ? String(destAny?.house || canonicalInput.parameters?.house).trim()
      : '';
    if (houseNumber) {
      deliveryAddress = {
        type: 'legacy',
        street: {
          name: (destAny?.street || destination.raw || destination.city || 'Main Street').trim(),
          city: destination.city?.trim() || undefined
        },
        house: houseNumber,
        flat: destAny?.flat || undefined,
        entrance: destAny?.entrance || undefined,
        floor: destAny?.floor || undefined,
        doorphone: destAny?.doorphone || undefined
      };
    } else {
      deliveryAddress = {
        type: 'city',
        line1: rawDestination,
        flat: destAny?.flat || undefined,
        entrance: destAny?.entrance || undefined,
        floor: destAny?.floor || undefined,
        doorphone: destAny?.doorphone || undefined
      };
    }

    const createRequest: IikoCreateOrderRequest = {
      organizationId: orgId,
      terminalGroupId: tgId,
      order: {
        id: crypto.randomUUID(),
        phone: customerPhone,
        orderServiceType: 'DeliveryByCourier',
        deliveryPoint: {
          coordinates: destination.coordinates
            ? {
                latitude: destination.coordinates.latitude,
                longitude: destination.coordinates.longitude
              }
            : undefined,
          address: deliveryAddress,
          comment: destAny?.comment || destination.raw || undefined
        },
        customer: {
          name: canonicalInput.customer?.name || 'Customer',
          comment: 'Zayuno Delivery Order'
        },
        items,
        comment: `Zayuno Order ${canonicalInput.quoteId}`
      }
    };

    const response = await this.client.createDeliveryOrder(createRequest);
    const orderInfo = response.orderInfo;

    const status = mapIikoDeliveryStatusToActionStatus(orderInfo.order?.status, orderInfo.creationStatus);
    const currency = quote.currency || (await this.resolveCurrency(orgId));
    const nowIso = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      publicId: `ZY-ACT-IIKO-${Date.now().toString().slice(-6)}`,
      providerSlug: this.providerSlug,
      providerName: this.config.metadata?.name || 'iikoCloud Restaurant',
      externalActionId: orderInfo.id,
      quoteId: canonicalInput.quoteId,
      locationId: canonicalInput.locationId || undefined,
      status,
      nextAction: undefined,
      lines: quote.lines,
      subtotal: quote.subtotal,
      fees: quote.fees ?? 0,
      discount: quote.discount ?? 0,
      total: quote.total,
      currency,
      customer: canonicalInput.customer || undefined,
      destination: canonicalInput.destination || undefined,
      fulfillmentType: 'DELIVERY_BY_COURIER',
      paymentMethod: canonicalInput.paymentMethod || 'CASH',
      paymentStatus: PaymentStatus.PENDING,
      paymentUrl: undefined,
      idempotencyKey: canonicalInput.idempotencyKey || undefined,
      supportContact: this.config.metadata?.supportContact || undefined,
      parameters: {
        organizationId: orgId,
        terminalGroupId: tgId,
        creationStatus: orderInfo.creationStatus
      },
      metadata: {},
      timeline: [
        {
          id: crypto.randomUUID(),
          status,
          description: `Delivery order created in iiko (${orderInfo.creationStatus})`,
          source: 'AI_AGENT',
          payload: { orderId: orderInfo.id, creationStatus: orderInfo.creationStatus },
          createdAt: nowIso
        }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  async getAction(input: GetActionInput): Promise<NormalizedAction> {
    this.assertCapability(ProviderCapability.ACTION_STATUS);
    const canonicalInput = GetActionInputSchema.parse(input);
    const orderId = canonicalInput.actionId;

    const inputAny = input as any;
    let orgId = (inputAny?.parameters?.organizationId || inputAny?.organizationId) as string | undefined;
    let orderInfo: IikoOrderInfo | undefined;

    // 1. Try provided orgId
    if (orgId) {
      try {
        const response = await this.client.getOrderById(orgId, [orderId]);
        orderInfo = response?.orders?.find((o) => o.id === orderId);
      } catch {
        // Fall through to search
      }
    }

    // 2. Try defaultOrganizationId
    if (!orderInfo && this.defaultOrganizationId) {
      try {
        const response = await this.client.getOrderById(this.defaultOrganizationId, [orderId]);
        const found = response?.orders?.find((o) => o.id === orderId);
        if (found) {
          orderInfo = found;
          orgId = this.defaultOrganizationId;
        }
      } catch {
        // Fall through
      }
    }

    // 3. Multi-tenant search: iterate across all active organizations
    if (!orderInfo) {
      const orgs = await this.client.getOrganizations();
      for (const org of orgs) {
        if (org.id === this.defaultOrganizationId || org.id === orgId) continue;
        try {
          const response = await this.client.getOrderById(org.id, [orderId]);
          const found = response?.orders?.find((o) => o.id === orderId);
          if (found) {
            orderInfo = found;
            orgId = org.id;
            break;
          }
        } catch {
          // Continue searching other orgs
        }
      }
    }

    if (!orderInfo) {
      throw new NotFoundError('Action', orderId);
    }

    const effectiveOrgId = orgId || orderInfo.organizationId;
    const currency = await this.resolveCurrency(effectiveOrgId);
    const status = mapIikoDeliveryStatusToActionStatus(orderInfo.order?.status, orderInfo.creationStatus);

    // Verify payment evidence strictly according to official iikoCloud OpenAPI schema
    const orderSum = orderInfo.order?.sum ?? 0;
    const processedPaymentsSum = orderInfo.order?.processedPaymentsSum;
    const paymentsList = Array.isArray(orderInfo.order?.payments) ? orderInfo.order.payments : [];

    let isPaymentConfirmed = false;
    if (orderSum > 0) {
      if (typeof processedPaymentsSum === 'number' && processedPaymentsSum >= orderSum) {
        isPaymentConfirmed = true;
      } else {
        const verifiedPaidSum = paymentsList
          .filter((p: any) => !p.isPreliminary && (p.isProcessedExternally === true || p.isPrepay === true))
          .reduce((sum: number, p: any) => sum + (Number(p.sum) || 0), 0);
        if (verifiedPaidSum >= orderSum) {
          isPaymentConfirmed = true;
        }
      }
    }

    const paymentStatus = isPaymentConfirmed ? PaymentStatus.PAID : PaymentStatus.PENDING;

    const nowIso = new Date().toISOString();

    return {
      id: orderInfo.id,
      publicId: `ZY-ACT-IIKO-${orderInfo.order?.number || orderInfo.id.slice(0, 6)}`,
      providerSlug: this.providerSlug,
      providerName: this.config.metadata?.name || 'iikoCloud Restaurant',
      externalActionId: orderInfo.id,
      quoteId: undefined,
      locationId: undefined,
      status,
      nextAction: undefined,
      lines: [],
      subtotal: orderInfo.order?.sum ?? 0,
      fees: 0,
      discount: 0,
      total: orderInfo.order?.sum ?? 0,
      currency,
      customer: orderInfo.order?.customer
        ? {
            name: orderInfo.order.customer.name || '',
            phone: orderInfo.order.phone || ''
          }
        : undefined,
      destination: undefined,
      fulfillmentType: 'DELIVERY_BY_COURIER',
      paymentMethod: 'CASH',
      paymentStatus,
      paymentUrl: undefined,
      idempotencyKey: undefined,
      supportContact: undefined,
      parameters: {
        organizationId: effectiveOrgId,
        creationStatus: orderInfo.creationStatus,
        iikoStatus: orderInfo.order?.status
      },
      metadata: {},
      timeline: [
        {
          id: crypto.randomUUID(),
          status,
          description: `Current iiko status: ${orderInfo.order?.status || orderInfo.creationStatus}`,
          source: 'PROVIDER_WEBHOOK',
          payload: { status: orderInfo.order?.status },
          createdAt: nowIso
        }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  async cancelAction(input: CancelActionInput): Promise<CancelActionResult> {
    this.assertCapability(ProviderCapability.ACTION_CANCEL);
    const canonicalInput = CancelActionInputSchema.parse(input);
    const orderId = canonicalInput.actionId;

    const inputAny = input as any;
    let orgId = (inputAny?.parameters?.organizationId || inputAny?.organizationId) as string | undefined;
    let previousStatus = ActionStatus.PROCESSING;

    if (!orgId) {
      try {
        const action = await this.getAction({ actionId: orderId, providerSlug: this.providerSlug });
        orgId = action.parameters?.organizationId;
        previousStatus = action.status;
      } catch {
        // Do NOT silently fall back to organizations[0] when resolving fails
      }
    } else {
      try {
        const action = await this.getAction({
          actionId: orderId,
          providerSlug: this.providerSlug,
          parameters: { organizationId: orgId }
        } as any);
        previousStatus = action.status;
      } catch {
        // Proceed with specified orgId
      }
    }

    if (!orgId) {
      throw new ProviderError(
        `Cannot cancel delivery order "${orderId}": organization could not be resolved across active restaurants.`,
        404,
        'ORGANIZATION_RESOLUTION_FAILED',
        { providerSlug: this.providerSlug, orderId }
      );
    }

    if (previousStatus === ActionStatus.CANCELLED) {
      return {
        success: true,
        actionId: canonicalInput.actionId,
        externalActionId: orderId,
        previousStatus: ActionStatus.CANCELLED,
        newStatus: ActionStatus.CANCELLED,
        message: 'Delivery order is already cancelled in iiko',
        refundInitiated: false
      };
    }

    const cancelRes = await this.client.cancelDeliveryOrder({
      organizationId: orgId,
      orderId,
      cancelComment: canonicalInput.reason || 'Cancelled by customer'
    });

    let commandState = 'Success';
    let commandError: string | null = null;
    let commandCheckFailed = false;
    if (cancelRes?.correlationId) {
      try {
        const cmdStatus = await this.client.getCommandStatus(orgId, cancelRes.correlationId);
        commandState = cmdStatus.state;
        if (cmdStatus.state === 'Error') {
          commandError = cmdStatus.errorReason || JSON.stringify(cmdStatus.exception) || 'Command error';
        }
      } catch {
        commandCheckFailed = true;
      }
    }

    if (commandError) {
      throw new ProviderError(
        `iiko cancellation command failed: ${commandError}`,
        400,
        'CANCELLATION_REJECTED',
        { providerSlug: this.providerSlug, orderId, correlationId: cancelRes?.correlationId }
      );
    }

    // Verify order status directly from iiko
    let updatedOrder: any = null;
    let orderFetchError: string | null = null;
    try {
      const orderResponse = await this.client.getOrderById(orgId, [orderId]);
      updatedOrder = orderResponse?.orders?.find((o) => o.id === orderId);
      if (!updatedOrder) {
        orderFetchError = `Order "${orderId}" not found in iiko after cancellation command.`;
      }
    } catch (err: any) {
      orderFetchError = err?.message || 'Failed to fetch order status from iiko';
    }

    // If order status fetching failed, we cannot confirm cancellation
    if (orderFetchError) {
      return {
        success: false,
        actionId: canonicalInput.actionId,
        externalActionId: orderId,
        previousStatus,
        newStatus: previousStatus,
        message: `Cancellation command dispatched (${commandState}), but order status could not be verified: ${orderFetchError}`,
        refundInitiated: false
      };
    }

    const currentIikoStatus = updatedOrder?.order?.status;
    const isCancelledConfirmed =
      currentIikoStatus === 'Cancelled' ||
      currentIikoStatus === 'Canceled' ||
      updatedOrder?.creationStatus === 'Canceled';

    if (commandState === 'InProgress' && !isCancelledConfirmed) {
      const currentActionStatus = currentIikoStatus
        ? mapIikoDeliveryStatusToActionStatus(currentIikoStatus, updatedOrder?.creationStatus)
        : previousStatus;
      return {
        success: false,
        actionId: canonicalInput.actionId,
        externalActionId: orderId,
        previousStatus,
        newStatus: currentActionStatus,
        message: 'iiko cancellation command is InProgress; order cancellation not yet confirmed',
        refundInitiated: false
      };
    }

    if (!isCancelledConfirmed) {
      const currentActionStatus = currentIikoStatus
        ? mapIikoDeliveryStatusToActionStatus(currentIikoStatus, updatedOrder?.creationStatus)
        : previousStatus;
      return {
        success: false,
        actionId: canonicalInput.actionId,
        externalActionId: orderId,
        previousStatus,
        newStatus: currentActionStatus,
        message: `Cancellation command accepted (${commandState}), but order status in iiko remains ${currentActionStatus} (not Cancelled)`,
        refundInitiated: false
      };
    }

    return {
      success: true,
      actionId: canonicalInput.actionId,
      externalActionId: orderId,
      previousStatus,
      newStatus: ActionStatus.CANCELLED,
      message: 'Delivery order cancelled successfully in iiko',
      refundInitiated: false
    };
  }
}
